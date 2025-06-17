// ChefSocial Database Setup and Management
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DatabasePool = require('./database-pool');
let cacheInvalidationService; // Lazy loaded to avoid circular dependencies

class ChefSocialDatabase {
    constructor() {
        this.dbPath = path.join(__dirname, 'chefsocial.db');
        this.db = null;
        this.pool = null;
        this.usePool = process.env.DB_POOL_ENABLED !== 'false'; // Default to true
        this.init();
    }

    // Lazy load cache invalidation service to avoid circular dependencies
    getCacheInvalidationService() {
        if (!cacheInvalidationService) {
            try {
                cacheInvalidationService = require('./cache-invalidation');
            } catch (error) {
                console.warn('Cache invalidation service not available:', error.message);
                return null;
            }
        }
        return cacheInvalidationService;
    }

    async init() {
        try {
            if (this.usePool) {
                // Initialize connection pool
                this.pool = new DatabasePool({
                    dbPath: this.dbPath,
                    maxConnections: parseInt(process.env.DB_POOL_MAX) || 10,
                    minConnections: parseInt(process.env.DB_POOL_MIN) || 2,
                    acquireTimeoutMs: 30000,
                    idleTimeoutMs: 300000
                });
                
                console.log('✅ Connected to ChefSocial database with connection pooling');
            } else {
                // Use single connection (legacy mode)
                this.db = new sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        console.error('❌ Database connection error:', err);
                    } else {
                        console.log('✅ Connected to ChefSocial database (single connection)');
                    }
                });
            }
            
            this.createTables();
        } catch (error) {
            console.error('❌ Database initialization error:', error);
            throw error;
        }
    }

    // Database query methods that use either pool or single connection
    async query(sql, params = []) {
        if (this.usePool && this.pool) {
            return await this.pool.query(sql, params);
        } else if (this.db) {
            return new Promise((resolve, reject) => {
                if (sql.trim().toUpperCase().startsWith('SELECT')) {
                    this.db.all(sql, params, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                } else {
                    this.db.run(sql, params, function(err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID, changes: this.changes });
                    });
                }
            });
        } else {
            throw new Error('Database not initialized');
        }
    }

    async get(sql, params = []) {
        if (this.usePool && this.pool) {
            return await this.pool.get(sql, params);
        } else if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        } else {
            throw new Error('Database not initialized');
        }
    }

    async all(sql, params = []) {
        if (this.usePool && this.pool) {
            return await this.pool.all(sql, params);
        } else if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        } else {
            throw new Error('Database not initialized');
        }
    }

    async run(sql, params = []) {
        if (this.usePool && this.pool) {
            return await this.pool.run(sql, params);
        } else if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID, changes: this.changes });
                });
            });
        } else {
            throw new Error('Database not initialized');
        }
    }

    createTables() {
        // Users table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                restaurant_name TEXT,
                cuisine_type TEXT,
                location TEXT,
                phone TEXT,
                description TEXT,
                brand_colors TEXT,
                brand_fonts TEXT,
                specialties TEXT,
                ambiance TEXT,
                target_audience TEXT,
                unique_selling_points TEXT,
                brand_personality TEXT,
                content_tone TEXT,
                key_messages TEXT,
                preferred_language TEXT DEFAULT 'en',
                stripe_customer_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                email_verified BOOLEAN DEFAULT FALSE,
                trial_ends_at DATETIME,
                status TEXT DEFAULT 'active'
            )
        `);

        // Subscriptions table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                stripe_subscription_id TEXT UNIQUE,
                stripe_price_id TEXT,
                plan_name TEXT NOT NULL,
                status TEXT NOT NULL,
                current_period_start DATETIME,
                current_period_end DATETIME,
                cancel_at_period_end BOOLEAN DEFAULT FALSE,
                canceled_at DATETIME,
                trial_start DATETIME,
                trial_end DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // License features table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS license_features (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                feature_key TEXT UNIQUE NOT NULL,
                feature_name TEXT NOT NULL,
                description TEXT,
                plan_starter BOOLEAN DEFAULT FALSE,
                plan_professional BOOLEAN DEFAULT FALSE,
                plan_enterprise BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // User feature access table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_feature_access (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                feature_key TEXT NOT NULL,
                access_granted BOOLEAN DEFAULT TRUE,
                granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (feature_key) REFERENCES license_features (feature_key),
                UNIQUE(user_id, feature_key)
            )
        `);

        // Usage tracking table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS usage_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                feature_key TEXT NOT NULL,
                usage_count INTEGER DEFAULT 1,
                usage_date DATE DEFAULT (date('now')),
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (feature_key) REFERENCES license_features (feature_key)
            )
        `);

        // Content generated table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS generated_content (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                platform TEXT NOT NULL,
                content_type TEXT,
                caption TEXT,
                hashtags TEXT,
                image_url TEXT,
                transcript TEXT,
                viral_score INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                published_at DATETIME,
                engagement_data TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Initialize default features
        this.initializeFeatures();
        
        // Run schema migrations
        this.runMigrations();
        
        // Create additional tables
        this.createAdditionalTables();
        
        // Create security tables
        this.createSecurityTables();
    }

    initializeFeatures() {
        const features = [
            {
                key: 'voice_content_creation',
                name: 'Voice Content Creation',
                description: 'Create content using voice commands',
                starter: true,
                professional: true,
                enterprise: true
            },
            {
                key: 'natural_conversation',
                name: 'Natural AI Conversation',
                description: 'Have natural conversations with AI marketing expert',
                starter: false,
                professional: true,
                enterprise: true
            },
            {
                key: 'unlimited_content',
                name: 'Unlimited Content Generation',
                description: 'Generate unlimited social media content',
                starter: false,
                professional: true,
                enterprise: true
            },
            {
                key: 'multi_platform_optimization',
                name: 'Multi-Platform Optimization',
                description: 'Content optimized for Instagram, TikTok, Facebook, LinkedIn',
                starter: true,
                professional: true,
                enterprise: true
            },
            {
                key: 'brand_voice_learning',
                name: 'Brand Voice Learning',
                description: 'AI learns and adapts to your restaurant\'s unique voice',
                starter: false,
                professional: true,
                enterprise: true
            },
            {
                key: 'analytics_insights',
                name: 'Analytics & Insights',
                description: 'Detailed performance analytics and content insights',
                starter: false,
                professional: true,
                enterprise: true
            },
            {
                key: 'bulk_content_creation',
                name: 'Bulk Content Creation',
                description: 'Create multiple posts at once',
                starter: false,
                professional: false,
                enterprise: true
            },
            {
                key: 'priority_support',
                name: 'Priority Support',
                description: '24/7 priority customer support',
                starter: false,
                professional: false,
                enterprise: true
            },
            {
                key: 'custom_integrations',
                name: 'Custom Integrations',
                description: 'Custom API integrations and workflows',
                starter: false,
                professional: false,
                enterprise: true
            }
        ];

        features.forEach(feature => {
            this.db.run(`
                INSERT OR IGNORE INTO license_features 
                (feature_key, feature_name, description, plan_starter, plan_professional, plan_enterprise)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                feature.key,
                feature.name,
                feature.description,
                feature.starter,
                feature.professional,
                feature.enterprise
            ]);
        });
    }

    runMigrations() {
        // Add preferred_language column if it doesn't exist
        this.db.run(`
            ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'en'
        `, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('❌ Migration error:', err);
            } else if (!err) {
                console.log('✅ Added preferred_language column to users table');
            }
        });

        // Add role column if it doesn't exist
        this.db.run(`
            ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'
        `, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('❌ Migration error:', err);
            } else if (!err) {
                console.log('✅ Added role column to users table');
            }
        });

        // Add subscription_status column if it doesn't exist
        this.db.run(`
            ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'inactive'
        `, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('❌ Migration error:', err);
            } else if (!err) {
                console.log('✅ Added subscription_status column to users table');
            }
        });

        // Add last_login_at column if it doesn't exist
        this.db.run(`
            ALTER TABLE users ADD COLUMN last_login_at DATETIME
        `, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('❌ Migration error:', err);
            } else if (!err) {
                console.log('✅ Added last_login_at column to users table');
            }
        });
    }

    createAdditionalTables() {
        // Enable foreign key constraints
        this.db.run(`PRAGMA foreign_keys = ON`);
        
        // Create monthly usage tracking table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS usage_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                month_year TEXT NOT NULL,
                voice_minutes_used INTEGER DEFAULT 0,
                images_generated INTEGER DEFAULT 0,
                videos_created INTEGER DEFAULT 0,
                api_calls_made INTEGER DEFAULT 0,
                extra_locations INTEGER DEFAULT 0,
                extra_users INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id, month_year)
            )
        `);
        
        // Create essential indexes for performance
        this.createIndexes();
        
        // Create admin panel tables
        this.createAdminTables();
        
        console.log('✅ Additional tables and indexes created');
    }

    createSecurityTables() {
        // Token blacklist table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS token_blacklist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_id TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL,
                token_type TEXT NOT NULL,
                blacklisted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                reason TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // User sessions table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                refresh_token_id TEXT UNIQUE NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                location TEXT,
                device_info TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Failed login attempts table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS failed_login_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                failure_reason TEXT,
                blocked_until DATETIME
            )
        `);

        // Security restrictions table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS security_restrictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                restriction_type TEXT NOT NULL,
                restriction_value TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Voice sessions table for LiveKit integration
        this.db.run(`
            CREATE TABLE IF NOT EXISTS voice_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL,
                room_name TEXT NOT NULL,
                session_type TEXT DEFAULT 'voice_chat',
                status TEXT DEFAULT 'created',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                ended_at DATETIME,
                duration INTEGER,
                metadata TEXT,
                recording_urls TEXT,
                performance_data TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        console.log('✅ Security tables created');
    }

    createIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id)',
            'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
            'CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_content_user_platform ON content(user_id, platform)',
            'CREATE INDEX IF NOT EXISTS idx_usage_user_month ON usage_tracking(user_id, month_year)',
            'CREATE INDEX IF NOT EXISTS idx_user_features_lookup ON user_features(user_id, feature_key)'
        ];

        indexes.forEach(indexSql => {
            this.db.run(indexSql, (err) => {
                if (err && !err.message.includes('already exists')) {
                    console.error('❌ Index creation error:', err);
                }
            });
        });
        
        console.log('✅ Database indexes created');
    }

    createAdminTables() {
        // Admin users table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'admin',
                permissions TEXT,
                last_login DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Audit logs table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                admin_id TEXT,
                action TEXT NOT NULL,
                entity_type TEXT,
                entity_id TEXT,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // User sessions table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                jwt_token TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        console.log('✅ Admin tables created');
    }

    // User methods
    async createUser(userData) {
        return new Promise((resolve, reject) => {
            const { id, email, passwordHash, name, restaurantName } = userData;
            this.db.run(`
                INSERT INTO users (id, email, password_hash, name, restaurant_name, trial_ends_at)
                VALUES (?, ?, ?, ?, ?, datetime('now', '+14 days'))
            `, [id, email, passwordHash, name, restaurantName], function(err) {
                if (err) reject(err);
                else resolve({ id, changes: this.changes });
            });
        });
    }

    async getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT u.*, s.plan_name, s.status as subscription_status, s.current_period_end
                FROM users u
                LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
                WHERE u.email = ?
            `, [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getUserById(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT u.*, s.plan_name, s.status as subscription_status, s.current_period_end
                FROM users u
                LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
                WHERE u.id = ?
            `, [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // Subscription methods
    async createSubscription(subscriptionData) {
        return new Promise((resolve, reject) => {
            const {
                id, userId, stripeSubscriptionId, stripePriceId, planName,
                status, currentPeriodStart, currentPeriodEnd
            } = subscriptionData;

            this.db.run(`
                INSERT INTO subscriptions 
                (id, user_id, stripe_subscription_id, stripe_price_id, plan_name, status, current_period_start, current_period_end)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [id, userId, stripeSubscriptionId, stripePriceId, planName, status, currentPeriodStart, currentPeriodEnd], 
            function(err) {
                if (err) reject(err);
                else resolve({ id, changes: this.changes });
            });
        });
    }

    async updateSubscription(stripeSubscriptionId, updateData) {
        return new Promise((resolve, reject) => {
            const { status, currentPeriodEnd, cancelAtPeriodEnd } = updateData;
            this.db.run(`
                UPDATE subscriptions 
                SET status = ?, current_period_end = ?, cancel_at_period_end = ?, updated_at = CURRENT_TIMESTAMP
                WHERE stripe_subscription_id = ?
            `, [status, currentPeriodEnd, cancelAtPeriodEnd, stripeSubscriptionId], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }

    // Feature access methods
    async getUserFeatures(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT lf.feature_key, lf.feature_name, lf.description,
                       CASE 
                           WHEN ufa.access_granted IS NOT NULL THEN ufa.access_granted
                           WHEN s.plan_name = 'starter' THEN lf.plan_starter
                           WHEN s.plan_name = 'professional' THEN lf.plan_professional
                           WHEN s.plan_name = 'enterprise' THEN lf.plan_enterprise
                           WHEN u.trial_ends_at > datetime('now') THEN lf.plan_professional
                           ELSE lf.plan_starter
                       END as has_access,
                       ufa.expires_at
                FROM users u
                LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
                CROSS JOIN license_features lf
                LEFT JOIN user_feature_access ufa ON u.id = ufa.user_id AND lf.feature_key = ufa.feature_key
                WHERE u.id = ?
            `, [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async checkFeatureAccess(userId, featureKey) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    CASE 
                        WHEN ufa.access_granted IS NOT NULL AND (ufa.expires_at IS NULL OR ufa.expires_at > datetime('now')) 
                        THEN ufa.access_granted
                        WHEN s.plan_name = 'starter' THEN lf.plan_starter
                        WHEN s.plan_name = 'professional' THEN lf.plan_professional
                        WHEN s.plan_name = 'enterprise' THEN lf.plan_enterprise
                        WHEN u.trial_ends_at > datetime('now') THEN lf.plan_professional
                        ELSE lf.plan_starter
                    END as has_access
                FROM users u
                LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
                LEFT JOIN license_features lf ON lf.feature_key = ?
                LEFT JOIN user_feature_access ufa ON u.id = ufa.user_id AND lf.feature_key = ufa.feature_key
                WHERE u.id = ?
            `, [featureKey, userId], (err, row) => {
                if (err) reject(err);
                else resolve(row ? !!row.has_access : false);
            });
        });
    }

    // Usage tracking
    async trackUsage(userId, featureKey, metadata = null) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO usage_tracking (user_id, feature_key, metadata)
                VALUES (?, ?, ?)
            `, [userId, featureKey, metadata], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });
    }

    // Content storage
    async saveGeneratedContent(contentData) {
        return new Promise((resolve, reject) => {
            const {
                id, userId, platform, contentType, caption, hashtags,
                imageUrl, transcript, viralScore
            } = contentData;

            this.db.run(`
                INSERT INTO generated_content 
                (id, user_id, platform, content_type, caption, hashtags, image_url, transcript, viral_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [id, userId, platform, contentType, caption, hashtags, imageUrl, transcript, viralScore], 
            function(err) {
                if (err) reject(err);
                else resolve({ id, changes: this.changes });
            });
        });
    }

    async getUserContent(userId, limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM generated_content 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            `, [userId, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Usage tracking methods
    async getCurrentUsage(userId) {
        return new Promise((resolve, reject) => {
            const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
            this.db.get(`
                SELECT * FROM usage_tracking 
                WHERE user_id = ? AND month_year = ?
            `, [userId, currentMonth], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || {
                        voice_minutes_used: 0,
                        images_generated: 0,
                        videos_created: 0,
                        api_calls_made: 0,
                        extra_locations: 0,
                        extra_users: 0
                    });
                }
            });
        });
    }

    async trackUsage(userId, usageType, amount = 1) {
        return new Promise((resolve, reject) => {
            const currentMonth = new Date().toISOString().substring(0, 7);
            
            this.db.run(`
                INSERT OR REPLACE INTO usage_tracking 
                (user_id, month_year, ${usageType}, updated_at)
                VALUES (
                    ?,
                    ?,
                    COALESCE((SELECT ${usageType} FROM usage_tracking WHERE user_id = ? AND month_year = ?), 0) + ?,
                    datetime('now')
                )
            `, [userId, currentMonth, userId, currentMonth, amount], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    }

    async getUsageStats(userId, months = 12) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM usage_tracking 
                WHERE user_id = ? 
                ORDER BY month_year DESC 
                LIMIT ?
            `, [userId, months], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Admin methods
    async createAdminUser(adminData) {
        return new Promise((resolve, reject) => {
            const { id, email, passwordHash, name, role, permissions } = adminData;
            this.db.run(`
                INSERT INTO admin_users (id, email, password_hash, name, role, permissions)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [id, email, passwordHash, name, role, JSON.stringify(permissions || [])], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, email, name, role });
                }
            });
        });
    }

    async getAdminByEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM admin_users WHERE email = ?
            `, [email], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async updateAdminLastLogin(adminId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE admin_users SET last_login = datetime('now') WHERE id = ?
            `, [adminId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    async logAuditEvent(eventData) {
        return new Promise((resolve, reject) => {
            const { userId, adminId, action, entityType, entityId, details, ipAddress, userAgent } = eventData;
            this.db.run(`
                INSERT INTO audit_logs (user_id, admin_id, action, entity_type, entity_id, details, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [userId, adminId, action, entityType, entityId, JSON.stringify(details), ipAddress, userAgent], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    async getAllUsers(limit = 50, offset = 0) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT id, email, name, restaurant_name, status, preferred_language, 
                       created_at, last_login, trial_ends_at
                FROM users 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `, [limit, offset], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getUsersCount() {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count);
                }
            });
        });
    }

    async updateUserStatus(userId, status) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?
            `, [status, userId], async function(err) {
                if (err) {
                    reject(err);
                } else {
                    // Invalidate cache after successful update
                    const invalidationService = this.getCacheInvalidationService?.() || this.getCacheInvalidationService?.call(this);
                    if (invalidationService) {
                        await invalidationService.invalidateUserData(userId);
                    }
                    resolve({ changes: this.changes });
                }
            }.bind(this));
        });
    }

    // Security Methods

    // Token Blacklisting
    async blacklistToken(tokenId, tokenType, expiresAt, reason = null) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO token_blacklist (token_id, user_id, token_type, expires_at, reason)
                VALUES (?, (SELECT user_id FROM user_sessions WHERE refresh_token_id = ? LIMIT 1), ?, ?, ?)
            `, [tokenId, tokenId, tokenType, expiresAt, reason], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    async isTokenBlacklisted(tokenId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT id FROM token_blacklist 
                WHERE token_id = ? AND expires_at > datetime('now')
            `, [tokenId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(!!row);
                }
            });
        });
    }

    // Session Management
    async storeRefreshToken(userId, tokenId, expiresAt, ipAddress = null, userAgent = null) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO user_sessions (user_id, refresh_token_id, ip_address, user_agent, expires_at)
                VALUES (?, ?, ?, ?, ?)
            `, [userId, tokenId, ipAddress, userAgent, expiresAt], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    async getUserSessions(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM user_sessions 
                WHERE user_id = ? AND is_active = TRUE AND expires_at > datetime('now')
                ORDER BY last_used DESC
            `, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async invalidateUserSession(tokenId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE user_sessions SET is_active = FALSE WHERE refresh_token_id = ?
            `, [tokenId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    async invalidateAllUserSessions(userId, exceptTokenId = null) {
        return new Promise((resolve, reject) => {
            let sql = `UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?`;
            let params = [userId];
            
            if (exceptTokenId) {
                sql += ` AND refresh_token_id != ?`;
                params.push(exceptTokenId);
            }
            
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Failed Login Tracking
    async logFailedLogin(email, ipAddress, userAgent, reason) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO failed_login_attempts (email, ip_address, user_agent, failure_reason)
                VALUES (?, ?, ?, ?)
            `, [email, ipAddress, userAgent, reason], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    async getFailedLoginAttempts(email, timeWindowMinutes = 15) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM failed_login_attempts 
                WHERE email = ? AND attempt_time > datetime('now', '-${timeWindowMinutes} minutes')
                ORDER BY attempt_time DESC
            `, [email], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getFailedLoginAttempsByIP(ipAddress, timeWindowMinutes = 15) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM failed_login_attempts 
                WHERE ip_address = ? AND attempt_time > datetime('now', '-${timeWindowMinutes} minutes')
                ORDER BY attempt_time DESC
            `, [ipAddress], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async blockIP(ipAddress, blockDurationMinutes = 60) {
        return new Promise((resolve, reject) => {
            const blockedUntil = new Date(Date.now() + blockDurationMinutes * 60 * 1000);
            this.db.run(`
                UPDATE failed_login_attempts 
                SET blocked_until = ? 
                WHERE ip_address = ? AND blocked_until IS NULL
            `, [blockedUntil, ipAddress], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    async isIPBlocked(ipAddress) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT blocked_until FROM failed_login_attempts 
                WHERE ip_address = ? AND blocked_until > datetime('now')
                ORDER BY blocked_until DESC LIMIT 1
            `, [ipAddress], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? { blocked: true, until: row.blocked_until } : { blocked: false });
                }
            });
        });
    }

    // Security Restrictions
    async addSecurityRestriction(userId, restrictionType, restrictionValue, expiresAt = null, notes = null) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO security_restrictions (user_id, restriction_type, restriction_value, expires_at, notes)
                VALUES (?, ?, ?, ?, ?)
            `, [userId, restrictionType, restrictionValue, expiresAt, notes], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    async getUserSecurityRestrictions(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM security_restrictions 
                WHERE user_id = ? AND is_active = TRUE 
                AND (expires_at IS NULL OR expires_at > datetime('now'))
                ORDER BY created_at DESC
            `, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async checkSecurityRestriction(userId, restrictionType, restrictionValue) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM security_restrictions 
                WHERE user_id = ? AND restriction_type = ? AND restriction_value = ?
                AND is_active = TRUE 
                AND (expires_at IS NULL OR expires_at > datetime('now'))
            `, [userId, restrictionType, restrictionValue], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(!!row);
                }
            });
        });
    }

    // Database pool management methods
    async getPoolStats() {
        if (this.usePool && this.pool) {
            return this.pool.getStats();
        }
        return {
            pool: {
                total: 1,
                active: 1,
                idle: 0,
                queued: 0,
                maxConnections: 1,
                minConnections: 1
            },
            metrics: {
                totalConnections: 1,
                activeConnections: 1,
                queuedRequests: 0,
                totalQueries: 0,
                failedQueries: 0,
                averageQueryTime: 0
            },
            mode: 'single-connection'
        };
    }

    async healthCheck() {
        if (this.usePool && this.pool) {
            return await this.pool.healthCheck();
        } else if (this.db) {
            return new Promise((resolve) => {
                this.db.get('SELECT 1 as health', (err) => {
                    if (err) {
                        resolve({
                            status: 'unhealthy',
                            error: err.message,
                            mode: 'single-connection'
                        });
                    } else {
                        resolve({
                            status: 'healthy',
                            mode: 'single-connection'
                        });
                    }
                });
            });
        } else {
            return {
                status: 'unhealthy',
                error: 'Database not initialized'
            };
        }
    }

    async close() {
        if (this.usePool && this.pool) {
            await this.pool.close();
            console.log('✅ Database connection pool closed');
        } else if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('❌ Database close error:', err);
                    } else {
                        console.log('✅ Database connection closed');
                    }
                    resolve();
                });
            });
        }
    }
}

module.exports = ChefSocialDatabase;