// ChefSocial Voice - Error Types and Constants
// Standardized error definitions for consistent handling across the application

export enum ErrorCode {
  // Authentication & Authorization
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // Input Validation
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Database Operations
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED = 'DATABASE_QUERY_FAILED',
  DATABASE_TRANSACTION_FAILED = 'DATABASE_TRANSACTION_FAILED',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // External Services
  STRIPE_ERROR = 'STRIPE_ERROR',
  LIVEKIT_ERROR = 'LIVEKIT_ERROR',
  TWILIO_ERROR = 'TWILIO_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  
  // File Processing
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_SUPPORTED = 'FILE_TYPE_NOT_SUPPORTED',
  FILE_PROCESSING_FAILED = 'FILE_PROCESSING_FAILED',
  
  // Voice Processing
  VOICE_PROCESSING_FAILED = 'VOICE_PROCESSING_FAILED',
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  CONTENT_GENERATION_FAILED = 'CONTENT_GENERATION_FAILED',
  
  // System Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Business Logic
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  USAGE_LIMIT_EXCEEDED = 'USAGE_LIMIT_EXCEEDED',
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE'
}

export interface ApplicationError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, any>;
  cause?: Error;
  timestamp: Date;
  requestId?: string;
  userId?: string;
}

export class ChefSocialError extends Error implements ApplicationError {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly cause?: Error;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly userId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: Record<string, any>,
    cause?: Error,
    requestId?: string,
    userId?: string
  ) {
    super(message);
    this.name = 'ChefSocialError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.cause = cause;
    this.timestamp = new Date();
    this.requestId = requestId;
    this.userId = userId;

    // Maintain proper stack trace (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ChefSocialError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
      userId: this.userId,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

// Error factory functions for common error types
export const ErrorFactory = {
  // Authentication Errors
  authRequired(requestId?: string): ChefSocialError {
    return new ChefSocialError(
      ErrorCode.AUTH_REQUIRED,
      'Authentication is required to access this resource',
      401,
      undefined,
      undefined,
      requestId
    );
  },

  authInvalid(message: string = 'Invalid authentication credentials', requestId?: string): ChefSocialError {
    return new ChefSocialError(
      ErrorCode.AUTH_INVALID,
      message,
      401,
      undefined,
      undefined,
      requestId
    );
  },

  authExpired(requestId?: string): ChefSocialError {
    return new ChefSocialError(
      ErrorCode.AUTH_EXPIRED,
      'Authentication token has expired',
      401,
      undefined,
      undefined,
      requestId
    );
  },

  insufficientPermissions(requiredRole?: string, requestId?: string, userId?: string): ChefSocialError {
    return new ChefSocialError(
      ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
      'Insufficient permissions to access this resource',
      403,
      { requiredRole },
      undefined,
      requestId,
      userId
    );
  },

  // Validation Errors
  validationFailed(details: Record<string, any>, requestId?: string): ChefSocialError {
    return new ChefSocialError(
      ErrorCode.VALIDATION_FAILED,
      'Input validation failed',
      400,
      details,
      undefined,
      requestId
    );
  },

  // Database Errors
  databaseConnectionFailed(cause?: Error, requestId?: string): ChefSocialError {
    return new ChefSocialError(
      ErrorCode.DATABASE_CONNECTION_FAILED,
      'Failed to connect to database',
      503,
      undefined,
      cause,
      requestId
    );
  },

  databaseQueryFailed(query: string, cause?: Error, requestId?: string): ChefSocialError {
    return new ChefSocialError(
      ErrorCode.DATABASE_QUERY_FAILED,
      'Database query execution failed',
      500,
      { query: process.env.NODE_ENV === 'development' ? query : '[REDACTED]' },
      cause,
      requestId
    );
  },

  recordNotFound(resource: string, identifier?: string, requestId?: string): ChefSocialError {
    return new ChefSocialError(
      ErrorCode.RECORD_NOT_FOUND,
      `${resource} not found`,
      404,
      { resource, identifier },
      undefined,
      requestId
    );
  },

  // Rate Limiting Errors
  rateLimitExceeded(limit: number, windowMs: number, retryAfter: number, requestId?: string): ChefSocialError {
    return new ChefSocialError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Too many requests.`,
      429,
      { limit, windowMs, retryAfter },
      undefined,
      requestId
    );
  },

  // System Errors
  internalServerError(message: string = 'Internal server error', cause?: Error, requestId?: string): ChefSocialError {
    return new ChefSocialError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      message,
      500,
      undefined,
      cause,
      requestId
    );
  },

  serviceUnavailable(service: string, requestId?: string): ChefSocialError {
    return new ChefSocialError(
      ErrorCode.SERVICE_UNAVAILABLE,
      `${service} is currently unavailable`,
      503,
      { service },
      undefined,
      requestId
    );
  },

  timeout(operation: string, timeoutMs: number, requestId?: string): ChefSocialError {
    return new ChefSocialError(
      ErrorCode.TIMEOUT,
      `Operation timed out: ${operation}`,
      408,
      { operation, timeoutMs },
      undefined,
      requestId
    );
  }
};

// HTTP Status Code mapping for ErrorCode
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.AUTH_REQUIRED]: 401,
  [ErrorCode.AUTH_INVALID]: 401,
  [ErrorCode.AUTH_EXPIRED]: 401,
  [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.VALIDATION_FAILED]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.DATABASE_CONNECTION_FAILED]: 503,
  [ErrorCode.DATABASE_QUERY_FAILED]: 500,
  [ErrorCode.DATABASE_TRANSACTION_FAILED]: 500,
  [ErrorCode.RECORD_NOT_FOUND]: 404,
  [ErrorCode.DUPLICATE_RECORD]: 409,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.STRIPE_ERROR]: 502,
  [ErrorCode.LIVEKIT_ERROR]: 502,
  [ErrorCode.TWILIO_ERROR]: 502,
  [ErrorCode.AI_SERVICE_ERROR]: 502,
  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.FILE_TYPE_NOT_SUPPORTED]: 415,
  [ErrorCode.FILE_PROCESSING_FAILED]: 422,
  [ErrorCode.VOICE_PROCESSING_FAILED]: 422,
  [ErrorCode.TRANSCRIPTION_FAILED]: 422,
  [ErrorCode.CONTENT_GENERATION_FAILED]: 422,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.TIMEOUT]: 408,
  [ErrorCode.NETWORK_ERROR]: 502,
  [ErrorCode.SUBSCRIPTION_REQUIRED]: 402,
  [ErrorCode.SUBSCRIPTION_EXPIRED]: 402,
  [ErrorCode.USAGE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.FEATURE_NOT_AVAILABLE]: 501
};

// User-friendly error messages (safe to show to clients)
export const USER_ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_REQUIRED]: 'Please log in to access this feature',
  [ErrorCode.AUTH_INVALID]: 'Invalid login credentials',
  [ErrorCode.AUTH_EXPIRED]: 'Your session has expired. Please log in again',
  [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action',
  [ErrorCode.VALIDATION_FAILED]: 'Please check your input and try again',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required information is missing',
  [ErrorCode.DATABASE_CONNECTION_FAILED]: 'Service temporarily unavailable. Please try again later',
  [ErrorCode.DATABASE_QUERY_FAILED]: 'Unable to process your request. Please try again',
  [ErrorCode.DATABASE_TRANSACTION_FAILED]: 'Unable to complete the operation. Please try again',
  [ErrorCode.RECORD_NOT_FOUND]: 'The requested item was not found',
  [ErrorCode.DUPLICATE_RECORD]: 'This item already exists',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait before trying again',
  [ErrorCode.STRIPE_ERROR]: 'Payment processing error. Please try again',
  [ErrorCode.LIVEKIT_ERROR]: 'Voice service temporarily unavailable',
  [ErrorCode.TWILIO_ERROR]: 'Communication service error. Please try again',
  [ErrorCode.AI_SERVICE_ERROR]: 'AI processing temporarily unavailable',
  [ErrorCode.FILE_TOO_LARGE]: 'File is too large. Please use a smaller file',
  [ErrorCode.FILE_TYPE_NOT_SUPPORTED]: 'File type not supported',
  [ErrorCode.FILE_PROCESSING_FAILED]: 'Unable to process the uploaded file',
  [ErrorCode.VOICE_PROCESSING_FAILED]: 'Voice processing failed. Please try again',
  [ErrorCode.TRANSCRIPTION_FAILED]: 'Unable to transcribe audio. Please ensure clear audio quality',
  [ErrorCode.CONTENT_GENERATION_FAILED]: 'Content generation failed. Please try again',
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Something went wrong. Please try again later',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later',
  [ErrorCode.TIMEOUT]: 'Request timed out. Please try again',
  [ErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection',
  [ErrorCode.SUBSCRIPTION_REQUIRED]: 'This feature requires a subscription',
  [ErrorCode.SUBSCRIPTION_EXPIRED]: 'Your subscription has expired',
  [ErrorCode.USAGE_LIMIT_EXCEEDED]: 'Usage limit exceeded for your current plan',
  [ErrorCode.FEATURE_NOT_AVAILABLE]: 'This feature is not available yet'
}; 