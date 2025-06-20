import { User, RefreshToken } from '../types/auth';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Conditional import for Vercel KV (only in production)
let kv: any = null;
try {
  if (process.env.VERCEL) {
    kv = require('@vercel/kv').kv;
  }
} catch (error) {
  // Vercel KV not available, using memory store
}

// In-memory storage for development (will persist during the function execution)
let memoryStore: {
  users: Map<string, User>;
  usersByEmail: Map<string, string>; // email -> userId mapping
  refreshTokens: Map<string, RefreshToken>;
  rateLimits: Map<string, { requests: number; windowStart: number }>;
} = {
  users: new Map(),
  usersByEmail: new Map(),
  refreshTokens: new Map(),
  rateLimits: new Map()
};

// Initialize with admin user if empty
async function initializeAdminUser() {
  if (kv) {
    // For KV storage, check if admin user exists
    const adminUser = await kv.hgetall('user:4778fbcc-1b76-4ff5-adf1-124192102a88');
    if (!adminUser || Object.keys(adminUser).length === 0) {
      // Create admin user in KV storage
      const adminId = '4778fbcc-1b76-4ff5-adf1-124192102a88';
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      const now = new Date().toISOString();
      
      const adminUserData = {
        id: adminId,
        email: 'admin@chefsocial.com',
        passwordHash: hashedPassword,
        name: 'ChefSocial Admin',
        restaurantName: 'ChefSocial HQ',
        role: 'admin',
        subscriptionStatus: 'active',
        emailVerified: true,
        onboardingCompleted: true,
        marketingConsent: false,
        trialStartDate: now,
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now,
        updatedAt: now
      };
      
      await kv.hset(`user:${adminId}`, adminUserData);
      await kv.set('email:admin@chefsocial.com', adminId);
    }
  } else {
    // Memory storage initialization
    if (memoryStore.users.size === 0) {
      const adminId = '4778fbcc-1b76-4ff5-adf1-124192102a88';
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      const now = new Date().toISOString();
      
      const adminUser: User = {
        id: adminId,
        email: 'admin@chefsocial.com',
        passwordHash: hashedPassword,
        name: 'ChefSocial Admin',
        restaurantName: 'ChefSocial HQ',
        role: 'admin',
        subscriptionStatus: 'active',
        emailVerified: true,
        onboardingCompleted: true,
        marketingConsent: false,
        trialStartDate: now,
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now,
        updatedAt: now
      };
      
      memoryStore.users.set(adminId, adminUser);
      memoryStore.usersByEmail.set('admin@chefsocial.com', adminId);
    }
  }
}

// Database operations using KV or memory store
export const db = {
  // User operations
  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    await initializeAdminUser();
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newUser: User = {
      ...user,
      id,
      createdAt: now,
      updatedAt: now
    };

    if (kv) {
      await kv.hset(`user:${id}`, newUser);
      await kv.set(`email:${user.email}`, id);
    } else {
      memoryStore.users.set(id, newUser);
      memoryStore.usersByEmail.set(user.email, id);
    }

    return newUser;
  },

  async getUserById(id: string): Promise<User | null> {
    await initializeAdminUser();
    
    if (kv) {
      const user = await kv.hgetall(`user:${id}`);
      return user && Object.keys(user).length > 0 ? user as User : null;
    } else {
      return memoryStore.users.get(id) || null;
    }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    await initializeAdminUser();
    
    if (kv) {
      const userId = await kv.get(`email:${email}`);
      return userId ? this.getUserById(userId) : null;
    } else {
      const userId = memoryStore.usersByEmail.get(email);
      return userId ? memoryStore.users.get(userId) || null : null;
    }
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = await this.getUserById(id);
    if (!user) return null;

    const updatedUser: User = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (kv) {
      await kv.hset(`user:${id}`, updatedUser);
      // Update email mapping if email changed
      if (updates.email && updates.email !== user.email) {
        await kv.del(`email:${user.email}`);
        await kv.set(`email:${updates.email}`, id);
      }
    } else {
      memoryStore.users.set(id, updatedUser);
      // Update email mapping if email changed
      if (updates.email && updates.email !== user.email) {
        memoryStore.usersByEmail.delete(user.email);
        memoryStore.usersByEmail.set(updates.email, id);
      }
    }

    return updatedUser;
  },

  async deleteUser(id: string): Promise<boolean> {
    const user = await this.getUserById(id);
    if (!user) return false;

    if (kv) {
      await kv.del(`user:${id}`);
      await kv.del(`email:${user.email}`);
    } else {
      memoryStore.users.delete(id);
      memoryStore.usersByEmail.delete(user.email);
    }

    return true;
  },

  async getAllUsers(page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number; totalPages: number }> {
    if (kv) {
      // For KV storage, we need to implement pagination differently
      // This is a simplified version - in production, you might want to maintain user lists
      const keys = await kv.keys('user:*');
      const total = keys.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const pageKeys = keys.slice(startIndex, endIndex);
      
      const users: User[] = [];
      for (const key of pageKeys) {
        const userData = await kv.hgetall(key);
        if (userData && Object.keys(userData).length > 0) {
          users.push(userData as User);
        }
      }
      
      return {
        users,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } else {
      const allUsers = Array.from(memoryStore.users.values());
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      return {
        users: allUsers.slice(startIndex, endIndex),
        total: allUsers.length,
        totalPages: Math.ceil(allUsers.length / limit)
      };
    }
  },

  // Refresh token operations
  async createRefreshToken(token: RefreshToken): Promise<void> {
    if (kv) {
      // Convert Date objects to strings for KV storage
      const tokenForStorage = {
        ...token,
        expiresAt: token.expiresAt.toISOString(),
        createdAt: token.createdAt.toISOString()
      };
      await kv.setex(`refresh:${token.tokenHash}`, 7 * 24 * 60 * 60, JSON.stringify(tokenForStorage)); // 7 days
      // Track user tokens for cleanup
      await kv.sadd(`user_tokens:${token.userId}`, token.tokenHash);
    } else {
      memoryStore.refreshTokens.set(token.tokenHash, token);
    }
  },

  async getRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    if (kv) {
      const tokenData = await kv.get(`refresh:${tokenHash}`);
      if (!tokenData) return null;
      
      const parsed = JSON.parse(tokenData);
      // Convert strings back to Date objects
      return {
        ...parsed,
        expiresAt: new Date(parsed.expiresAt),
        createdAt: new Date(parsed.createdAt)
      };
    } else {
      return memoryStore.refreshTokens.get(tokenHash) || null;
    }
  },

  async deleteRefreshToken(tokenHash: string): Promise<void> {
    if (kv) {
      await kv.del(`refresh:${tokenHash}`);
    } else {
      memoryStore.refreshTokens.delete(tokenHash);
    }
  },

  async deleteRefreshTokensByUserId(userId: string): Promise<number> {
    if (kv) {
      // For KV storage, we need to track user tokens separately
      const userTokensKey = `user_tokens:${userId}`;
      const tokenHashes = await kv.smembers(userTokensKey);
      
      let deletedCount = 0;
      for (const tokenHash of tokenHashes) {
        await kv.del(`refresh:${tokenHash}`);
        await kv.srem(userTokensKey, tokenHash);
        deletedCount++;
      }
      
      return deletedCount;
    } else {
      let deletedCount = 0;
      for (const [tokenHash, token] of memoryStore.refreshTokens.entries()) {
        if (token.userId === userId) {
          memoryStore.refreshTokens.delete(tokenHash);
          deletedCount++;
        }
      }
      return deletedCount;
    }
  },

  // Rate limiting
  async getRateLimit(identifier: string): Promise<{ requests: number; windowStart: number } | null> {
    if (kv) {
      const data = await kv.get(`rate:${identifier}`);
      return data ? JSON.parse(data) : null;
    } else {
      return memoryStore.rateLimits.get(identifier) || null;
    }
  },

  async setRateLimit(identifier: string, data: { requests: number; windowStart: number }): Promise<void> {
    if (kv) {
      await kv.setex(`rate:${identifier}`, 3600, JSON.stringify(data)); // 1 hour
    } else {
      memoryStore.rateLimits.set(identifier, data);
    }
  },

  async checkRateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    
    const existing = await this.getRateLimit(key);
    
    if (!existing || existing.windowStart < windowStart) {
      // New window or expired
      const newData = { requests: 1, windowStart };
      await this.setRateLimit(key, newData);
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: windowStart + windowMs
      };
    }
    
    if (existing.requests >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + windowMs
      };
    }
    
    existing.requests++;
    await this.setRateLimit(key, existing);
    
    return {
      allowed: true,
      remaining: limit - existing.requests,
      resetTime: windowStart + windowMs
    };
  }
}; 