#!/usr/bin/env node
/**
 * ChefSocial Voice - Database Initialization Script
 * Sets up the SQLite database with proper schema and indexes
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function initializeDatabase() {
  console.log('🔧 Initializing ChefSocial Voice database...');

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created data directory');
  }

  // Create database connection
  const dbPath = path.join(dataDir, 'chefsocial.db');
  const db = new Database(dbPath);
  
  try {
    // Set pragmas for better performance
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    
    console.log('📊 Creating database tables...');

    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        restaurant_name TEXT NOT NULL,
        cuisine_type TEXT,
        location TEXT,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        subscription_status TEXT NOT NULL DEFAULT 'trialing',
        trial_start_date TEXT,
        trial_end_date TEXT,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        marketing_consent BOOLEAN DEFAULT false,
        email_verified BOOLEAN DEFAULT false,
        onboarding_completed BOOLEAN DEFAULT false,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at TEXT
      )
    `);

    // Create refresh tokens table
    db.exec(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        revoked_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create rate limits table
    db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id TEXT PRIMARY KEY,
        requests INTEGER NOT NULL DEFAULT 0,
        window_start TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    console.log('🔍 Creating database indexes...');
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
      CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users (subscription_status);
      CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users (stripe_customer_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
      CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits (window_start);
    `);

    // Create triggers for updated_at timestamps
    console.log('⚡ Creating database triggers...');
    
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
      AFTER UPDATE ON users
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_rate_limits_updated_at 
      AFTER UPDATE ON rate_limits
      BEGIN
        UPDATE rate_limits SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    // Insert a test admin user if none exists
    const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');
    
    if (adminExists.count === 0) {
      console.log('👑 Creating default admin user...');
      
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');
      
      const adminId = uuidv4();
      const hashedPassword = bcrypt.hashSync('Admin123!', 12);
      
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO users (
          id, email, password_hash, name, restaurant_name, 
          role, subscription_status, email_verified, onboarding_completed,
          trial_start_date, trial_end_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        adminId,
        'admin@chefsocial.com',
        hashedPassword,
        'ChefSocial Admin',
        'ChefSocial HQ',
        'admin',
        'active',
        1, // true as integer
        1, // true as integer
        now,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        now,
        now
      );
      
      console.log('✅ Admin user created:');
      console.log('   Email: admin@chefsocial.com');
      console.log('   Password: Admin123!');
      console.log('   ⚠️  Change this password in production!');
    }

    // Cleanup old refresh tokens and rate limits
    console.log('🧹 Cleaning up expired data...');
    
    const now = new Date().toISOString();
    const deletedTokens = db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ?').run(now);
    const deletedRateLimits = db.prepare('DELETE FROM rate_limits WHERE datetime(window_start, \'+1 hour\') < ?').run(now);
    
    console.log(`   Cleaned up ${deletedTokens.changes} expired refresh tokens`);
    console.log(`   Cleaned up ${deletedRateLimits.changes} old rate limit entries`);

    // Get database statistics
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const tokenCount = db.prepare('SELECT COUNT(*) as count FROM refresh_tokens').get();
    
    console.log('📊 Database Statistics:');
    console.log(`   Users: ${userCount.count}`);
    console.log(`   Active refresh tokens: ${tokenCount.count}`);
    console.log(`   Database file: ${dbPath}`);
    console.log(`   Database size: ${(fs.statSync(dbPath).size / 1024).toFixed(2)} KB`);

    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run initialization
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase }; 