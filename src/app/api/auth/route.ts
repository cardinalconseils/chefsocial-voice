import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { database } from '../../../lib/database';
import { authService } from '../../../lib/auth';
import { validateInput, authRequestSchema, refreshTokenRequestSchema, sanitizeEmail, ERROR_MESSAGES } from '../../../lib/validation';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-05-28.basil',
});

// POST /api/auth - Handle login, register, and token refresh
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Handle token refresh
    if (action === 'refresh') {
      return handleTokenRefresh(body);
    }

    // Validate auth request (login or register)
    const validation = validateInput(authRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 });
    }

    const validatedData = validation.data!;

    if (validatedData.action === 'login') {
      return handleLogin(validatedData);
    } else if (validatedData.action === 'register') {
      return handleRegister(validatedData);
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
}

// Handle user login
async function handleLogin(data: { email: string; password: string }) {
  try {
    const email = sanitizeEmail(data.email);

    // Find user in database
    const user = database.getUserByEmail(email);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: ERROR_MESSAGES.INVALID_CREDENTIALS,
        message: 'Email or password is incorrect'
      }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await authService.verifyPassword(data.password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        error: ERROR_MESSAGES.INVALID_CREDENTIALS,
        message: 'Email or password is incorrect'
      }, { status: 401 });
    }

    // Update last login timestamp
    database.updateLastLogin(user.id);

    // Create auth tokens
    const tokens = authService.createAuthTokens(user);

    // Return success response with tokens
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: authService.toPublicUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
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
}) {
  try {
    const email = sanitizeEmail(data.email);

    // Check if user already exists
    const existingUser = database.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: ERROR_MESSAGES.USER_EXISTS,
        message: 'An account with this email already exists'
      }, { status: 409 });
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
    } catch (stripeError) {
      console.error('Stripe customer creation failed:', stripeError);
      // Continue with registration even if Stripe fails
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
    const newUser = await database.createUser(userData);

    // Create auth tokens
    const tokens = authService.createAuthTokens(newUser);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: authService.toPublicUser(newUser),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({
        success: false,
        error: ERROR_MESSAGES.USER_EXISTS,
        message: 'An account with this email already exists'
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
}

// Handle token refresh
async function handleTokenRefresh(body: any) {
  try {
    // Validate refresh token request
    const validation = validateInput(refreshTokenRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid refresh token format',
        details: validation.errors
      }, { status: 400 });
    }

    const { refreshToken } = validation.data!;

    // Refresh the access token
    const result = await authService.refreshAccessToken(refreshToken);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Token refresh failed'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({
      success: false,
      error: 'Token refresh failed'
    }, { status: 500 });
  }
}

// POST /api/auth/logout - Handle logout (revoke refresh token)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken, logoutAll = false } = body;

    if (logoutAll) {
      // Logout from all devices - need user ID
      const user = await authService.getUserFromRequest(request);
      if (user) {
        authService.revokeAllUserTokens(user.id);
        return NextResponse.json({
          success: true,
          message: 'Logged out from all devices'
        });
      }
    } else if (refreshToken) {
      // Logout from current device
      const success = authService.revokeRefreshToken(refreshToken);
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Logout successful'
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Logout failed'
    }, { status: 400 });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      error: 'Logout failed'
    }, { status: 500 });
  }
}

// GET /api/auth/me - Get current user info
export async function GET(request: NextRequest) {
  try {
    const user = await authService.getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: authService.toPublicUser(user)
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    }, { status: 500 });
  }
} 