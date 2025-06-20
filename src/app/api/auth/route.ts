import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { database } from '../../../lib/database';
import { authService } from '../../../lib/auth';
import { validateInput, authRequestSchema, refreshTokenRequestSchema, sanitizeEmail, ERROR_MESSAGES } from '../../../lib/validation';
import { withErrorHandler, createSuccessResponse, ErrorFactory } from '../../../middleware/error-handler';
import { logger } from '../../../lib/logger';
import { ErrorCode, ChefSocialError } from '../../../lib/error-types';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-05-28.basil',
});

// POST /api/auth - Handle login, register, and token refresh
export const POST = withErrorHandler(async (request, context) => {
  const body = await request.json();
  const { action } = body;

  logger.info('Authentication request received', {
    requestId: context.requestId,
    action,
    ip: context.ip,
    userAgent: context.userAgent
  });

  // Handle token refresh
  if (action === 'refresh') {
    return handleTokenRefresh(body, context.requestId);
  }

  // Validate auth request (login or register)
  const validation = validateInput(authRequestSchema, body);
  if (!validation.success) {
    logger.warn('Authentication validation failed', {
      requestId: context.requestId,
      action,
      errors: validation.errors
    });
    
    throw ErrorFactory.validationFailed(
      { errors: validation.errors },
      context.requestId
    );
  }

  const validatedData = validation.data!;

  if (validatedData.action === 'login') {
    return handleLogin(
      { email: validatedData.email!, password: validatedData.password! }, 
      context.requestId
    );
  } else if (validatedData.action === 'register') {
    return handleRegister({
      email: validatedData.email!,
      password: validatedData.password!,
      name: validatedData.name!,
      restaurantName: validatedData.restaurantName!,
      cuisineType: validatedData.cuisineType,
      location: validatedData.location,
      phone: validatedData.phone,
      marketingConsent: validatedData.marketingConsent
    }, context.requestId);
  }

  throw ErrorFactory.validationFailed(
    { error: 'Invalid action' },
    context.requestId
  );
});

// Handle user login
async function handleLogin(data: { email: string; password: string }, requestId: string) {
  const email = sanitizeEmail(data.email);

  logger.debug('Login attempt', {
    requestId,
    email: email.replace(/(.{3}).*(@.*)/, '$1***$2') // Partially mask email
  });

  // Find user in database
  const user = database.getUserByEmail(email);
  if (!user) {
    logger.logAuthentication('login', undefined, email, false, {
      requestId,
      reason: 'user_not_found'
    });
    
    throw ErrorFactory.authInvalid(
      'Email or password is incorrect',
      requestId
    );
  }

  // Verify password
  const isValidPassword = await authService.verifyPassword(data.password, user.passwordHash);
  if (!isValidPassword) {
    logger.logAuthentication('login', user.id, email, false, {
      requestId,
      reason: 'invalid_password'
    });
    
    throw ErrorFactory.authInvalid(
      'Email or password is incorrect',
      requestId
    );
  }

  // Update last login timestamp
  database.updateLastLogin(user.id);

  // Create auth tokens
  const tokens = authService.createAuthTokens(user);

  logger.logAuthentication('login', user.id, email, true, {
    requestId,
    userId: user.id,
    role: user.role
  });

  logger.logUserAction('successful_login', user.id, {
    email,
    role: user.role,
    restaurantName: user.restaurantName
  }, { requestId });

  // Return success response with tokens
  return NextResponse.json({
    success: true,
    message: 'Login successful',
    user: authService.toPublicUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    metadata: {
      requestId,
      processingTime: Date.now() - Date.now() // Will be calculated by middleware
    }
  });
}

// Handle user registration
async function handleRegister(data: {
  email: string;
  password: string;
  name: string;
  restaurantName: string;
  cuisineType?: string;
  location?: string;
  phone?: string;
  marketingConsent?: boolean;
}, requestId: string) {
  const email = sanitizeEmail(data.email);

  logger.debug('Registration attempt', {
    requestId,
    email: email.replace(/(.{3}).*(@.*)/, '$1***$2'),
    restaurantName: data.restaurantName
  });

  // Check if user already exists
  const existingUser = database.getUserByEmail(email);
  if (existingUser) {
    logger.warn('Registration failed - user exists', {
      requestId,
      email: email.replace(/(.{3}).*(@.*)/, '$1***$2')
    });
    
    throw new ChefSocialError(
      ErrorCode.DUPLICATE_RECORD,
      'An account with this email already exists',
      409,
      { email },
      undefined,
      requestId
    );
  }

  // Hash password
  const passwordHash = await authService.hashPassword(data.password);

  // Create Stripe customer
  let stripeCustomerId: string | undefined;
  try {
    const stripeCustomer = await stripe.customers.create({
      email,
      name: data.name,
      metadata: {
        restaurant_name: data.restaurantName,
        cuisine_type: data.cuisineType || '',
        location: data.location || '',
        phone: data.phone || '',
        source: 'chefsocial_registration',
        marketing_consent: data.marketingConsent?.toString() || 'false'
      }
    });
    stripeCustomerId = stripeCustomer.id;
    
    logger.debug('Stripe customer created', {
      requestId,
      stripeCustomerId,
      email: email.replace(/(.{3}).*(@.*)/, '$1***$2')
    });
  } catch (stripeError) {
    logger.error('Stripe customer creation failed', {
      requestId,
      email: email.replace(/(.{3}).*(@.*)/, '$1***$2'),
      error: stripeError instanceof Error ? stripeError.message : 'Unknown error'
    });
    
    // Continue with registration even if Stripe fails
    // In production, you might want to retry or use a queue
  }

  // Prepare user data
  const trialStartDate = new Date().toISOString();
  const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const userData = {
    email,
    passwordHash,
    name: data.name,
    restaurantName: data.restaurantName,
    cuisineType: data.cuisineType,
    location: data.location,
    phone: data.phone,
    role: 'user' as const,
    subscriptionStatus: 'trialing' as const,
    trialStartDate,
    trialEndDate,
    stripeCustomerId,
    stripeSubscriptionId: undefined,
    marketingConsent: data.marketingConsent || false,
    emailVerified: false,
    onboardingCompleted: false
  };

  // Create user in database
  try {
    const newUser = await database.createUser(userData);

    // Create auth tokens
    const tokens = authService.createAuthTokens(newUser);

    logger.logAuthentication('registration', newUser.id, email, true, {
      requestId,
      userId: newUser.id,
      restaurantName: data.restaurantName
    });

    logger.logUserAction('successful_registration', newUser.id, {
      email,
      restaurantName: data.restaurantName,
      cuisineType: data.cuisineType,
      location: data.location,
      hasStripeCustomer: !!stripeCustomerId
    }, { requestId });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: authService.toPublicUser(newUser),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      metadata: {
        requestId,
        processingTime: Date.now() - Date.now() // Will be calculated by middleware
      }
    }, { status: 201 });

  } catch (error) {
    logger.error('Database user creation failed', {
      requestId,
      email: email.replace(/(.{3}).*(@.*)/, '$1***$2'),
      restaurantName: data.restaurantName,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    if (error instanceof Error && error.message.includes('already exists')) {
      throw new ChefSocialError(
        ErrorCode.DUPLICATE_RECORD,
        'An account with this email already exists',
        409,
        { email },
        error,
        requestId
      );
    }

    throw ErrorFactory.databaseQueryFailed(
      'User creation failed',
      error as Error,
      requestId
    );
  }
}

// Handle token refresh
async function handleTokenRefresh(body: any, requestId: string) {
  const validation = validateInput(refreshTokenRequestSchema, body);
  if (!validation.success) {
    logger.warn('Token refresh validation failed', {
      requestId,
      errors: validation.errors
    });
    
    throw ErrorFactory.validationFailed(
      { errors: validation.errors },
      requestId
    );
  }

  const { refreshToken } = validation.data!;

  try {
    // Verify and decode refresh token
    const decoded = await authService.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw ErrorFactory.authInvalid(
        'Invalid refresh token',
        requestId
      );
    }
    const userId = decoded.userId;

    // Get user from database
    const user = database.getUserById(userId);
    if (!user) {
      logger.warn('Token refresh failed - user not found', {
        requestId,
        userId
      });
      
      throw ErrorFactory.authInvalid(
        'Invalid refresh token',
        requestId
      );
    }

    // Create new auth tokens
    const tokens = authService.createAuthTokens(user);

    logger.debug('Token refresh successful', {
      requestId,
      userId,
      email: user.email.replace(/(.{3}).*(@.*)/, '$1***$2')
    });

    return NextResponse.json({
      success: true,
      message: 'Token refresh successful',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      metadata: {
        requestId,
        processingTime: Date.now() - Date.now()
      }
    });

  } catch (error) {
    logger.warn('Token refresh failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw ErrorFactory.authInvalid(
      'Invalid or expired refresh token',
      requestId
    );
  }
}

// DELETE /api/auth - Logout endpoint
export const DELETE = withErrorHandler(async (request, context) => {
  logger.info('Logout request received', {
    requestId: context.requestId,
    userId: context.userId
  });

  // In a more sophisticated implementation, you would:
  // 1. Blacklist the refresh token
  // 2. Clear server-side session data
  // 3. Potentially notify other services

  logger.logUserAction('logout', context.userId || 'unknown', {}, {
    requestId: context.requestId
  });

  return NextResponse.json({
    success: true,
    message: 'Logout successful',
    metadata: {
      requestId: context.requestId,
      processingTime: Date.now() - Date.now()
    }
  });
});

// GET /api/auth - Get current user information
export const GET = withErrorHandler(async (request, context) => {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw ErrorFactory.authRequired(context.requestId);
  }

  const token = authHeader.substring(7);

  try {
    const decoded = authService.verifyAccessToken(token);
    if (!decoded) {
      throw ErrorFactory.authInvalid(
        'Invalid access token',
        context.requestId
      );
    }
    const userId = decoded.userId;

    const user = database.getUserById(userId);
    if (!user) {
      throw ErrorFactory.authInvalid(
        'User not found',
        context.requestId
      );
    }

    logger.debug('User info request successful', {
      requestId: context.requestId,
      userId,
      email: user.email.replace(/(.{3}).*(@.*)/, '$1***$2')
    });

    return NextResponse.json({
      success: true,
      user: authService.toPublicUser(user),
      metadata: {
        requestId: context.requestId,
        processingTime: Date.now() - Date.now()
      }
    });

  } catch (error) {
    logger.warn('User info request failed', {
      requestId: context.requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw ErrorFactory.authInvalid(
      'Invalid access token',
      context.requestId
    );
  }
}); 