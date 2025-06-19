import Database from 'better-sqlite3';
import path from 'path';
import { User, RefreshToken } from '../types/auth';

// Database instance
let db: Database.Database;

// Initialize database connection
export function initDatabase() {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'data', 'chefsocial.db');
  
  try {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL'); // Better performance for concurrent reads
    db.pragma('synchronous = NORMAL'); // Balance between safety and performance
    
    // Create tables
    createTables();
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Create database tables
function createTables() {
  // Users table
  db.exec(`
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
      trial_start_date TEXT,
      trial_end_date TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      marketing_consent BOOLEAN DEFAULT false,
      email_verified BOOLEAN DEFAULT false,
      onboarding_completed BOOLEAN DEFAULT false,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    )
  `);

  // Refresh tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked BOOLEAN DEFAULT false,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // API rate limiting table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      requests INTEGER DEFAULT 0,
      window_start TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
  `);

  console.log('Database tables created successfully');
}

// Database operations
export class DatabaseOperations {
  private db: Database.Database;

  constructor() {
    this.db = initDatabase();
    createTables(); // Ensure tables are created
  }

  // User operations
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO users (
        id, email, password_hash, name, restaurant_name, cuisine_type,
        location, phone, role, subscription_status, trial_start_date,
        trial_end_date, stripe_customer_id, stripe_subscription_id,
        marketing_consent, email_verified, onboarding_completed,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        id, userData.email, userData.passwordHash, userData.name,
        userData.restaurantName, userData.cuisineType || '', userData.location || '',
        userData.phone || '', userData.role || 'user', userData.subscriptionStatus || 'trialing',
        userData.trialStartDate, userData.trialEndDate, userData.stripeCustomerId,
        userData.stripeSubscriptionId, userData.marketingConsent ? 1 : 0,
        userData.emailVerified ? 1 : 0, userData.onboardingCompleted ? 1 : 0,
        now, now
      );

      return this.getUserById(id)!;
    } catch (error) {
      if ((error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('User with this email already exists');
      }
      throw error;
    }
  }

  getUserByEmail(email: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    const row = stmt.get(email);
    return row ? this.mapRowToUser(row) : null;
  }

  getUserById(id: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    const row = stmt.get(id);
    return row ? this.mapRowToUser(row) : null;
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const updateFields = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'createdAt')
      .map(key => `${this.camelToSnake(key)} = ?`)
      .join(', ');

    if (!updateFields) return this.getUserById(id);

    const values = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'createdAt')
      .map(key => (updates as any)[key]);

    const stmt = this.db.prepare(`
      UPDATE users 
      SET ${updateFields}, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(...values, new Date().toISOString(), id);
    return this.getUserById(id);
  }

  updateLastLogin(id: string): void {
    const stmt = this.db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?');
    stmt.run(new Date().toISOString(), id);
  }

  // Refresh token operations
  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): string {
    const id = `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = this.db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, userId, tokenHash, expiresAt.toISOString(), new Date().toISOString());
    return id;
  }

  getRefreshToken(tokenHash: string): RefreshToken | null {
    const stmt = this.db.prepare(`
      SELECT * FROM refresh_tokens 
      WHERE token_hash = ? AND revoked = false AND expires_at > datetime('now')
      LIMIT 1
    `);
    const row = stmt.get(tokenHash) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
      revoked: Boolean(row.revoked)
    };
  }

  revokeRefreshToken(tokenHash: string): void {
    const stmt = this.db.prepare('UPDATE refresh_tokens SET revoked = true WHERE token_hash = ?');
    stmt.run(tokenHash);
  }

  revokeAllUserRefreshTokens(userId: string): void {
    const stmt = this.db.prepare('UPDATE refresh_tokens SET revoked = true WHERE user_id = ?');
    stmt.run(userId);
  }

  // Clean up expired tokens
  cleanupExpiredTokens(): void {
    const stmt = this.db.prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')");
    const result = stmt.run();
    if (result.changes > 0) {
      console.log(`Cleaned up ${result.changes} expired refresh tokens`);
    }
  }

  // Rate limiting operations
  getRateLimit(key: string): { requests: number; windowStart: Date } | null {
    const stmt = this.db.prepare('SELECT * FROM rate_limits WHERE key = ? LIMIT 1');
    const row = stmt.get(key) as any;
    
    if (!row) return null;

    return {
      requests: row.requests,
      windowStart: new Date(row.window_start)
    };
  }

  updateRateLimit(key: string, requests: number, windowStart: Date): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO rate_limits (key, requests, window_start, created_at, updated_at)
      VALUES (?, ?, ?, COALESCE((SELECT created_at FROM rate_limits WHERE key = ?), ?), ?)
    `);
    
    stmt.run(key, requests, windowStart.toISOString(), key, now, now);
  }

  // Utility methods
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      name: row.name,
      restaurantName: row.restaurant_name,
      cuisineType: row.cuisine_type,
      location: row.location,
      phone: row.phone,
      role: row.role,
      subscriptionStatus: row.subscription_status,
      trialStartDate: row.trial_start_date,
      trialEndDate: row.trial_end_date,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      marketingConsent: Boolean(row.marketing_consent),
      emailVerified: Boolean(row.email_verified),
      onboardingCompleted: Boolean(row.onboarding_completed),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // Health check
  healthCheck(): boolean {
    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

// Singleton instance
export const database = new DatabaseOperations(); 