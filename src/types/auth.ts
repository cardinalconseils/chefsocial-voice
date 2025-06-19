// User roles
export type UserRole = 'user' | 'admin' | 'moderator';

// Subscription statuses
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

// User interface
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  restaurantName: string;
  cuisineType?: string;
  location?: string;
  phone?: string;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  trialStartDate?: string;
  trialEndDate?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  marketingConsent: boolean;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

// Public user data (without sensitive information)
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  restaurantName: string;
  cuisineType?: string;
  location?: string;
  phone?: string;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  trialEndDate?: string;
  stripeCustomerId?: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

// Refresh token interface
export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revoked: boolean;
}

// JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Login request interface
export interface LoginRequest {
  email: string;
  password: string;
}

// Registration request interface
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  restaurantName: string;
  cuisineType?: string;
  location?: string;
  phone?: string;
  marketingConsent?: boolean;
}

// Auth response interface
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: PublicUser;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

// Token refresh request
export interface RefreshTokenRequest {
  refreshToken: string;
}

// Rate limiting interface
export interface RateLimit {
  key: string;
  requests: number;
  windowStart: Date;
  limit: number;
  windowMs: number;
}

// API Error response
export interface APIError {
  success: false;
  error: string;
  message?: string;
  code?: string;
  statusCode: number;
}

// API Success response
export interface APISuccess<T = any> {
  success: true;
  message: string;
  data?: T;
}

export type APIResponse<T = any> = APISuccess<T> | APIError; 