import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { JWTPayload, User, PublicUser, RefreshToken } from '@/types/auth';
import { database } from '@/lib/database';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export class AuthService {
  // Generate JWT access token
  generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'chefsocial-api',
      audience: 'chefsocial-app'
    });
  }

  // Generate refresh token
  generateRefreshToken(userId: string): { token: string; tokenHash: string; expiresAt: Date } {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store in database
    database.createRefreshToken(userId, tokenHash, expiresAt);

    return { token, tokenHash, expiresAt };
  }

  // Verify JWT access token
  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'chefsocial-api',
        audience: 'chefsocial-app'
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  // Verify refresh token
  async verifyRefreshToken(token: string): Promise<RefreshToken | null> {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const refreshToken = database.getRefreshToken(tokenHash);
      
      if (!refreshToken) {
        return null;
      }

      // Check if token is expired
      if (refreshToken.expiresAt < new Date()) {
        database.revokeRefreshToken(tokenHash);
        return null;
      }

      return refreshToken;
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  // Hash password
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Verify password
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Extract user from request
  async getUserFromRequest(request: NextRequest): Promise<User | null> {
    const token = this.extractTokenFromRequest(request);
    if (!token) return null;

    const payload = this.verifyAccessToken(token);
    if (!payload) return null;

    return database.getUserById(payload.userId);
  }

  // Extract token from request headers
  private extractTokenFromRequest(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

    return parts[1];
  }

  // Create auth tokens for user
  createAuthTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = this.generateAccessToken(payload);
    const { token: refreshToken } = this.generateRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken: string): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }> {
    try {
      const tokenData = await this.verifyRefreshToken(refreshToken);
      if (!tokenData) {
        return { success: false, error: 'Invalid or expired refresh token' };
      }

      const user = database.getUserById(tokenData.userId);
      if (!user) {
        database.revokeRefreshToken(tokenData.tokenHash);
        return { success: false, error: 'User not found' };
      }

      // Revoke old refresh token
      database.revokeRefreshToken(tokenData.tokenHash);

      // Create new tokens
      const tokens = this.createAuthTokens(user);

      return {
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      return { success: false, error: 'Token refresh failed' };
    }
  }

  // Revoke all user tokens (logout from all devices)
  revokeAllUserTokens(userId: string): void {
    database.revokeAllUserRefreshTokens(userId);
  }

  // Revoke specific refresh token (logout from specific device)
  revokeRefreshToken(refreshToken: string): boolean {
    try {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      database.revokeRefreshToken(tokenHash);
      return true;
    } catch (error) {
      console.error('Token revocation failed:', error);
      return false;
    }
  }

  // Convert User to PublicUser (remove sensitive data)
  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      restaurantName: user.restaurantName,
      cuisineType: user.cuisineType,
      location: user.location,
      phone: user.phone,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      trialEndDate: user.trialEndDate,
      stripeCustomerId: user.stripeCustomerId,
      emailVerified: user.emailVerified,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  // Clean up expired tokens (should be run periodically)
  cleanup(): void {
    database.cleanupExpiredTokens();
  }

  // Check if user has required role
  hasRole(user: User, requiredRole: string | string[]): boolean {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(user.role);
  }

  // Check if user is admin
  isAdmin(user: User): boolean {
    return user.role === 'admin';
  }

  // Check if user can access resource
  canAccessResource(user: User, resourceUserId: string): boolean {
    // Users can access their own resources, admins can access all
    return user.id === resourceUserId || this.isAdmin(user);
  }

  // Rate limiting helper
  getRateLimitKey(identifier: string, action: string): string {
    return `ratelimit:${action}:${identifier}`;
  }

  // Generate secure random token
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Validate token format
  isValidTokenFormat(token: string): boolean {
    // Check if token looks like a JWT (has 3 parts separated by dots)
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  // Create password reset token
  createPasswordResetToken(userId: string): { token: string; expiresAt: Date } {
    const token = this.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // In a real app, you'd store this in a separate table
    // For now, we'll use a simple in-memory store or database
    
    return { token, expiresAt };
  }

  // Create email verification token
  createEmailVerificationToken(userId: string): { token: string; expiresAt: Date } {
    const token = this.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return { token, expiresAt };
  }
}

// Singleton instance
export const authService = new AuthService();

// Middleware helper functions
export function requireAuth(handler: (request: NextRequest, user: User) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const user = await authService.getUserFromRequest(request);
      
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication required' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return handler(request, user);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

export function requireRole(roles: string | string[]) {
  return function(handler: (request: NextRequest, user: User) => Promise<Response>) {
    return async (request: NextRequest): Promise<Response> => {
      try {
        const user = await authService.getUserFromRequest(request);
        
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (!authService.hasRole(user, roles)) {
          return new Response(
            JSON.stringify({ success: false, error: 'Insufficient permissions' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return handler(request, user);
      } catch (error) {
        console.error('Role middleware error:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Authorization failed' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    };
  };
} 