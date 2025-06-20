import { Pool, PoolClient } from 'pg';
import { User, RefreshToken } from '../types/auth';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { trackDatabaseQuery, performanceMonitor } from './performance-monitor';

// Database connection pool
let pool: Pool | null = null;

// Initialize PostgreSQL connection pool
function initializePool(): Pool {
  if (pool) return pool;

  // Use Vercel Postgres environment variables or fallback to custom
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('PostgreSQL connection string not found. Please set POSTGRES_URL or DATABASE_URL environment variable.');
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  console.log('PostgreSQL connection pool initialized');
  return pool;
}

// Create database tables if they don't exist
async function createTables(): Promise<void> {
  const client = await getClient();
  
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        restaurant_name TEXT NOT NULL,
        cuisine_type TEXT DEFAULT '',
        location TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        role TEXT DEFAULT 'user',
        subscription_status TEXT DEFAULT 'trialing',
        trial_start_date TIMESTAMP,
        trial_end_date TIMESTAMP,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        marketing_consent BOOLEAN DEFAULT false,
        email_verified BOOLEAN DEFAULT false,
        onboarding_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP
      )
    `);

    // Refresh tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        revoked BOOLEAN DEFAULT false,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // API rate limiting table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        requests INTEGER DEFAULT 0,
        window_start TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
      CREATE INDEX IF NOT EXISTS idx_users_restaurant_name ON users(restaurant_name);
      CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);
      CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked);
      CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
      CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window ON rate_limits(key, window_start);
    `);

    console.log('PostgreSQL tables and indexes created successfully');
  } finally {
    client.release();
  }
}

// Get database client from pool
async function getClient(): Promise<PoolClient> {
  const pool = initializePool();
  return await pool.connect();
}

// Initialize admin user if it doesn't exist
async function initializeAdminUser(): Promise<void> {
  const client = await getClient();
  
  try {
    const adminId = '4778fbcc-1b76-4ff5-adf1-124192102a88';
    
    // Check if admin user exists
    const result = await client.query('SELECT id FROM users WHERE id = $1', [adminId]);
    
    if (result.rows.length === 0) {
      // Create admin user
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      const now = new Date();
      const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      await client.query(`
        INSERT INTO users (
          id, email, password_hash, name, restaurant_name, role,
          subscription_status, email_verified, onboarding_completed,
          marketing_consent, trial_start_date, trial_end_date,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        adminId, 'admin@chefsocial.com', hashedPassword, 'ChefSocial Admin',
        'ChefSocial HQ', 'admin', 'active', true, true, false,
        now, trialEndDate, now, now
      ]);
      
      console.log('Admin user created successfully');
    }
  } finally {
    client.release();
  }
}

// Database operations
export const db = {
  // Initialize database
  async initialize(): Promise<void> {
    await createTables();
    await initializeAdminUser();
  },

  // User operations
  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const client = await getClient();
    
    try {
      const id = crypto.randomUUID();
      const now = new Date();
      
      const result = await client.query(`
        INSERT INTO users (
          id, email, password_hash, name, restaurant_name, cuisine_type,
          location, phone, role, subscription_status, trial_start_date,
          trial_end_date, stripe_customer_id, stripe_subscription_id,
          marketing_consent, email_verified, onboarding_completed,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `, [
        id, user.email, user.passwordHash, user.name, user.restaurantName,
        user.cuisineType || '', user.location || '', user.phone || '',
        user.role || 'user', user.subscriptionStatus || 'trialing',
        user.trialStartDate ? new Date(user.trialStartDate) : null,
        user.trialEndDate ? new Date(user.trialEndDate) : null,
        user.stripeCustomerId, user.stripeSubscriptionId,
        user.marketingConsent || false, user.emailVerified || false,
        user.onboardingCompleted || false, now, now
      ]);

      return this.mapRowToUser(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new Error('User with this email already exists');
      }
      throw error;
    } finally {
      client.release();
    }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    return trackDatabaseQuery('getUserByEmail', async () => {
      const client = await getClient();
      
      try {
        const result = await client.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
        return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
      } finally {
        client.release();
      }
    }, { email });
  },

  async getUserById(id: string): Promise<User | null> {
    // Try cache first for frequently accessed user data
    const cacheKey = `user_${id}`;
    const cached = performanceMonitor.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    return trackDatabaseQuery('getUserById', async () => {
      const client = await getClient();
      
      try {
        const result = await client.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
        const user = result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
        
        // Cache user data for 5 minutes
        if (user) {
          performanceMonitor.setCache(cacheKey, user, 5 * 60 * 1000);
        }
        
        return user;
      } finally {
        client.release();
      }
    }, { id });
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const client = await getClient();
    
    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'createdAt') {
          const dbKey = this.camelToSnake(key);
          updateFields.push(`${dbKey} = $${paramIndex}`);
          values.push(key.includes('Date') && value ? new Date(value as string) : value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        return this.getUserById(id);
      }

      updateFields.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    const client = await getClient();
    
    try {
      const result = await client.query('DELETE FROM users WHERE id = $1', [id]);
      return result.rowCount !== null && result.rowCount > 0;
    } finally {
      client.release();
    }
  },

  async getAllUsers(page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number; totalPages: number }> {
    const client = await getClient();
    
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      // Optimized count query with index hint
      const countResult = await client.query('SELECT COUNT(*) as count FROM users');
      const total = parseInt(countResult.rows[0].count);
      
      // Optimized pagination query with proper ordering
      const result = await client.query(`
        SELECT * FROM users 
        ORDER BY created_at DESC, id 
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      const queryTime = Date.now() - startTime;
      
      // Log slow queries (>100ms)
      if (queryTime > 100) {
        console.warn(`Slow query detected: getAllUsers took ${queryTime}ms for page ${page}, limit ${limit}`);
      }
      
      const users = result.rows.map(row => this.mapRowToUser(row));
      const totalPages = Math.ceil(total / limit);
      
      return { users, total, totalPages };
    } finally {
      client.release();
    }
  },

  // Refresh token operations
  async createRefreshToken(token: RefreshToken): Promise<void> {
    const client = await getClient();
    
    try {
      await client.query(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        token.id, token.userId, token.tokenHash,
        new Date(token.expiresAt), new Date(token.createdAt), token.revoked
      ]);
    } finally {
      client.release();
    }
  },

  async getRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    const client = await getClient();
    
    try {
      const result = await client.query(`
        SELECT * FROM refresh_tokens 
        WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()
        LIMIT 1
      `, [tokenHash]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        tokenHash: row.token_hash,
        expiresAt: row.expires_at.toISOString(),
        createdAt: row.created_at.toISOString(),
        revoked: row.revoked
      };
    } finally {
      client.release();
    }
  },

  async deleteRefreshToken(tokenHash: string): Promise<void> {
    const client = await getClient();
    
    try {
      await client.query('UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1', [tokenHash]);
    } finally {
      client.release();
    }
  },

  async deleteRefreshTokensByUserId(userId: string): Promise<number> {
    const client = await getClient();
    
    try {
      const result = await client.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  },

  // Rate limiting operations
  async getRateLimit(identifier: string): Promise<{ requests: number; windowStart: number } | null> {
    const client = await getClient();
    
    try {
      const result = await client.query('SELECT * FROM rate_limits WHERE key = $1', [identifier]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        requests: row.requests,
        windowStart: new Date(row.window_start).getTime()
      };
    } finally {
      client.release();
    }
  },

  async setRateLimit(identifier: string, data: { requests: number; windowStart: number }): Promise<void> {
    const client = await getClient();
    
    try {
      await client.query(`
        INSERT INTO rate_limits (key, requests, window_start, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (key) 
        DO UPDATE SET 
          requests = $2, 
          window_start = $3, 
          updated_at = NOW()
      `, [identifier, data.requests, new Date(data.windowStart)]);
    } finally {
      client.release();
    }
  },

  async checkRateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - (now % windowMs);
    
    const current = await this.getRateLimit(key);
    
    if (!current || current.windowStart < windowStart) {
      // New window or no existing record
      await this.setRateLimit(key, { requests: 1, windowStart });
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: windowStart + windowMs
      };
    }
    
    if (current.requests >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.windowStart + windowMs
      };
    }
    
    await this.setRateLimit(key, { 
      requests: current.requests + 1, 
      windowStart: current.windowStart 
    });
    
    return {
      allowed: true,
      remaining: limit - current.requests - 1,
      resetTime: current.windowStart + windowMs
    };
  },

  // Utility methods
  mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      name: row.name,
      restaurantName: row.restaurant_name,
      cuisineType: row.cuisine_type,
      location: row.location,
      phone: row.phone,
      role: row.role as 'user' | 'admin',
      subscriptionStatus: row.subscription_status as 'trialing' | 'active' | 'canceled' | 'past_due',
      trialStartDate: row.trial_start_date?.toISOString(),
      trialEndDate: row.trial_end_date?.toISOString(),
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      marketingConsent: row.marketing_consent,
      emailVerified: row.email_verified,
      onboardingCompleted: row.onboarding_completed,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      lastLoginAt: row.last_login_at?.toISOString()
    };
  },

  camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  },

  // Admin statistics
  async getAdminStats(): Promise<any> {
    const client = await getClient();
    
    try {
      // Get user statistics
      const userStatsQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN subscription_status = 'trialing' THEN 1 END) as active_trials,
          COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as paid_subscriptions,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_users_today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_users_this_week,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_this_month
        FROM users
        WHERE role != 'admin'
      `;
      
      const userStatsResult = await client.query(userStatsQuery);
      return userStatsResult.rows[0];
    } finally {
      client.release();
    }
  },

  // Health check
  async healthCheck(): Promise<boolean> {
    const client = await getClient();
    
    try {
      await client.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    } finally {
      client.release();
    }
  },

  // Close connection pool
  async close(): Promise<void> {
    if (pool) {
      await pool.end();
      pool = null;
      console.log('PostgreSQL connection pool closed');
    }
  },

  async searchUsers(
    searchTerm: string = '',
    filters: {
      subscriptionStatus?: string;
      role?: string;
      emailVerified?: boolean;
    } = {},
    page: number = 1,
    limit: number = 10
  ): Promise<{ users: User[]; total: number; totalPages: number }> {
    return trackDatabaseQuery('searchUsers', async () => {
      const client = await getClient();
      
      try {
        const offset = (page - 1) * limit;
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        // Build search conditions
        if (searchTerm) {
          conditions.push(`(
            name ILIKE $${paramIndex} OR 
            email ILIKE $${paramIndex} OR 
            restaurant_name ILIKE $${paramIndex}
          )`);
          params.push(`%${searchTerm}%`);
          paramIndex++;
        }

        if (filters.subscriptionStatus) {
          conditions.push(`subscription_status = $${paramIndex}`);
          params.push(filters.subscriptionStatus);
          paramIndex++;
        }

        if (filters.role) {
          conditions.push(`role = $${paramIndex}`);
          params.push(filters.role);
          paramIndex++;
        }

        if (filters.emailVerified !== undefined) {
          conditions.push(`email_verified = $${paramIndex}`);
          params.push(filters.emailVerified);
          paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Optimized count query
        const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`;
        const countResult = await client.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Optimized search query with proper ordering
        const searchQuery = `
          SELECT * FROM users 
          ${whereClause}
          ORDER BY 
            CASE WHEN last_login_at IS NOT NULL THEN last_login_at END DESC NULLS LAST,
            created_at DESC,
            id
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        const searchResult = await client.query(searchQuery, [...params, limit, offset]);
        
        const users = searchResult.rows.map(row => this.mapRowToUser(row));
        const totalPages = Math.ceil(total / limit);

        return { users, total, totalPages };
      } finally {
        client.release();
      }
    }, { searchTerm, filters, page, limit });
  },
};

// Initialize database on import (for serverless environments)
if (process.env.NODE_ENV !== 'test') {
  db.initialize().catch(console.error);
} 