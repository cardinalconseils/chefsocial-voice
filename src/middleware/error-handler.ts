// ChefSocial Voice - Centralized Error Handling Middleware
// Comprehensive error handling for Next.js API routes

import { NextRequest, NextResponse } from 'next/server';
import { logger, LogContext } from '../lib/logger';
import { ChefSocialError, ErrorCode, ErrorFactory, USER_ERROR_MESSAGES } from '../lib/error-types';

// Request context for error handling
export interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  startTime: number;
}

// Enhanced NextRequest with error context
export interface ContextualRequest extends NextRequest {
  context?: RequestContext;
}

// API Handler type with error handling
export type APIHandler = (
  request: ContextualRequest,
  context: RequestContext
) => Promise<NextResponse>;

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    requestId: string;
    timestamp: string;
  };
}

// Success response interface
interface SuccessResponse {
  success: true;
  data?: any;
  message?: string;
  metadata?: {
    requestId: string;
    processingTime?: number;
    [key: string]: any;
  };
}

export type APIResponse = ErrorResponse | SuccessResponse;

/**
 * Create request context for error handling and logging
 */
export function createRequestContext(request: NextRequest): RequestContext {
  const requestId = logger.generateRequestId();
  const url = request.nextUrl.pathname + request.nextUrl.search;
  const userAgent = request.headers.get('user-agent') || undefined;
  const ip = getClientIP(request);

  return {
    requestId,
    method: request.method,
    url,
    userAgent,
    ip,
    startTime: Date.now()
  };
}

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return 'unknown';
}

/**
 * Extract user information from request (if authenticated)
 */
export async function extractUserContext(request: NextRequest): Promise<Partial<RequestContext>> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {};
    }

    // This would typically decode the JWT token to get user info
    // For now, we'll return empty context - this should be integrated with auth service
    // TODO: Integrate with authService.getUserFromToken()
    
    return {};
  } catch (error) {
    // Don't throw here - just return empty context if auth extraction fails
    return {};
  }
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  error: ChefSocialError | Error,
  requestId: string,
  includeStack: boolean = false
): ErrorResponse {
  const isChefSocialError = error instanceof ChefSocialError;
  
  return {
    success: false,
    error: {
      code: isChefSocialError ? error.code : ErrorCode.INTERNAL_SERVER_ERROR,
      message: isChefSocialError ? 
        USER_ERROR_MESSAGES[error.code] || error.message : 
        USER_ERROR_MESSAGES[ErrorCode.INTERNAL_SERVER_ERROR],
      details: isChefSocialError ? error.details : undefined,
      requestId,
      timestamp: new Date().toISOString(),
      ...(includeStack && { stack: error.stack })
    }
  };
}

/**
 * Main error handling middleware wrapper
 */
export function withErrorHandler(handler: APIHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Create request context
    const context = createRequestContext(request);
    
    // Add user context if available
    const userContext = await extractUserContext(request);
    Object.assign(context, userContext);

    // Attach context to request
    (request as ContextualRequest).context = context;

    // Log incoming request
    const logContext: LogContext = {
      requestId: context.requestId,
      method: context.method,
      url: context.url,
      userAgent: context.userAgent,
      ip: context.ip,
      userId: context.userId,
      userEmail: context.userEmail,
      userRole: context.userRole
    };

    logger.logRequest(context.method, context.url, logContext);

    try {
      // Execute the handler
      const response = await handler(request as ContextualRequest, context);
      
      // Log successful response
      const duration = Date.now() - context.startTime;
      logger.logResponse(
        context.method,
        context.url,
        response.status,
        duration,
        { ...logContext, duration }
      );

      // Add request ID to response headers
      response.headers.set('X-Request-ID', context.requestId);
      
      return response;

    } catch (error) {
      return handleError(error, context, logContext);
    }
  };
}

/**
 * Handle and log errors
 */
function handleError(
  error: unknown,
  context: RequestContext,
  logContext: LogContext
): NextResponse {
  const duration = Date.now() - context.startTime;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Convert unknown error to ChefSocialError
  let chefSocialError: ChefSocialError;
  
  if (error instanceof ChefSocialError) {
    chefSocialError = error;
  } else if (error instanceof Error) {
    // Check for specific error types and convert
    chefSocialError = convertKnownError(error, context.requestId);
  } else {
    // Unknown error type
    chefSocialError = ErrorFactory.internalServerError(
      'An unexpected error occurred',
      error instanceof Error ? error : new Error(String(error)),
      context.requestId
    );
  }

  // Update error context if not already set
  if (!chefSocialError.requestId || !chefSocialError.userId) {
    chefSocialError = new ChefSocialError(
      chefSocialError.code,
      chefSocialError.message,
      chefSocialError.statusCode,
      chefSocialError.details,
      chefSocialError.cause,
      chefSocialError.requestId || context.requestId,
      chefSocialError.userId || context.userId
    );
  }

  // Log the error
  const errorLogContext = {
    ...logContext,
    duration,
    statusCode: chefSocialError.statusCode
  };

  logger.error(
    `API Error: ${chefSocialError.message}`,
    errorLogContext,
    chefSocialError
  );

  // Alert on critical errors
  if (chefSocialError.statusCode >= 500) {
    logger.alertCriticalError(chefSocialError, errorLogContext);
  }

  // Log response
  logger.logResponse(
    context.method,
    context.url,
    chefSocialError.statusCode,
    duration,
    errorLogContext
  );

  // Create error response
  const errorResponse = createErrorResponse(
    chefSocialError,
    context.requestId,
    isDevelopment
  );

  // Create NextResponse
  const response = NextResponse.json(errorResponse, {
    status: chefSocialError.statusCode
  });

  // Add error headers
  response.headers.set('X-Request-ID', context.requestId);
  response.headers.set('X-Error-Code', chefSocialError.code);

  return response;
}

/**
 * Convert known error types to ChefSocialError
 */
function convertKnownError(error: Error, requestId: string): ChefSocialError {
  const message = error.message.toLowerCase();

  // Database errors
  if (message.includes('database') || message.includes('sql')) {
    return ErrorFactory.databaseQueryFailed(
      'Database operation failed',
      error,
      requestId
    );
  }

  // Validation errors (Zod, etc.)
  if (message.includes('validation') || error.name === 'ZodError') {
    return ErrorFactory.validationFailed(
      { originalError: error.message },
      requestId
    );
  }

  // Network/timeout errors
  if (message.includes('timeout') || message.includes('etimedout')) {
    return ErrorFactory.timeout('Request timeout', 30000, requestId);
  }

  // Rate limiting errors
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return ErrorFactory.rateLimitExceeded(100, 60000, 60, requestId);
  }

  // External service errors
  if (message.includes('stripe')) {
    return new ChefSocialError(
      ErrorCode.STRIPE_ERROR,
      'Payment processing error',
      502,
      { originalError: error.message },
      error,
      requestId
    );
  }

  if (message.includes('livekit')) {
    return new ChefSocialError(
      ErrorCode.LIVEKIT_ERROR,
      'Voice service error',
      502,
      { originalError: error.message },
      error,
      requestId
    );
  }

  if (message.includes('twilio')) {
    return new ChefSocialError(
      ErrorCode.TWILIO_ERROR,
      'Communication service error',
      502,
      { originalError: error.message },
      error,
      requestId
    );
  }

  // Default to internal server error
  return ErrorFactory.internalServerError(
    error.message || 'Internal server error',
    error,
    requestId
  );
}

/**
 * Utility function to create success responses
 */
export function createSuccessResponse(
  data?: any,
  message?: string,
  metadata?: Omit<Record<string, any>, 'requestId' | 'processingTime'>
): SuccessResponse {
  return {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message })
  };
}

/**
 * Utility function to throw ChefSocialError
 */
export function throwError(
  code: ErrorCode,
  message: string,
  statusCode?: number,
  details?: Record<string, any>
): never {
  throw new ChefSocialError(code, message, statusCode, details);
}

/**
 * Async error handler for use in try-catch blocks
 */
export function handleAsyncError(error: unknown, requestId?: string): ChefSocialError {
  if (error instanceof ChefSocialError) {
    return error;
  }
  
  if (error instanceof Error) {
    return convertKnownError(error, requestId || 'unknown');
  }
  
  return ErrorFactory.internalServerError(
    'An unexpected error occurred',
    error instanceof Error ? error : new Error(String(error)),
    requestId
  );
}

/**
 * Middleware for validating request body
 */
export function validateRequestBody<T>(
  schema: any, // Zod schema
  handler: (request: ContextualRequest, context: RequestContext, data: T) => Promise<NextResponse>
): APIHandler {
  return async (request: ContextualRequest, context: RequestContext): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const validatedData = schema.parse(body);
      return handler(request, context, validatedData);
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) {
        // Zod validation error
        throw ErrorFactory.validationFailed(
          { issues: (error as any).issues },
          context.requestId
        );
      }
      throw error;
    }
  };
}

/**
 * Export common error factory functions for easy use in handlers
 */
export { ErrorFactory } from '../lib/error-types'; 