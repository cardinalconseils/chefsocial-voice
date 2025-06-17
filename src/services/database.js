// ChefSocial Database Setup and Management
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class ChefSocialDatabase {
    constructor() {
        this.dbPath = path.join(__dirname, 'chefsocial.db');
        this.db = null;
        this.init();
    }

    init() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Database connection error:', err);
            } else {
                console.log('✅ Connected to ChefSocial database');
                this.createTables();
            }
        });
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
        
        // Create SMS scheduling tables
        this.createSMSSchedulingTables();
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
    }

    createAdditionalTables() {
        // Enable foreign key constraints
        this.db.run(`PRAGMA foreign_keys = ON`);
        
        // Create essential indexes for performance
        this.createIndexes();
        
        // Create admin panel tables
        this.createAdminTables();
        
        console.log('✅ Additional tables and indexes created');
    }

    createIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id)',
            'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)'
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

    createSMSSchedulingTables() {
        // SMS briefing sessions table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS sms_briefing_sessions (
                id TEXT PRIMARY KEY,
                phone_number TEXT NOT NULL,
                user_id TEXT,
                image_url TEXT NOT NULL,
                upload_method TEXT DEFAULT 'sms',
                status TEXT DEFAULT 'pending',
                scheduled_time DATETIME,
                actual_call_time DATETIME,
                briefing_completed BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // SMS scheduling responses table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS sms_scheduling_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                response_text TEXT NOT NULL,
                parsed_schedule TEXT,
                scheduled_time DATETIME,
                response_type TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sms_briefing_sessions (id)
            )
        `);

        // Briefing context extracted from voice sessions
        this.db.run(`
            CREATE TABLE IF NOT EXISTS briefing_context (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                transcript TEXT,
                dish_story TEXT,
                target_audience TEXT,
                desired_mood TEXT,
                platform_preferences TEXT,
                posting_urgency TEXT,
                brand_personality TEXT,
                extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sms_briefing_sessions (id)
            )
        `);

        // SMS workflow tracking
        this.db.run(`
            CREATE TABLE IF NOT EXISTS sms_workflow_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                workflow_step TEXT NOT NULL,
                status TEXT NOT NULL,
                data TEXT,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                error_message TEXT,
                FOREIGN KEY (session_id) REFERENCES sms_briefing_sessions (id)
            )
        `);

        console.log('✅ SMS scheduling tables created');
    }

    // SMS Briefing Session methods
    async createBriefingSession(sessionData) {
        return new Promise((resolve, reject) => {
            const { id, phoneNumber, userId, imageUrl, uploadMethod } = sessionData;
            this.db.run(`
                INSERT INTO sms_briefing_sessions 
                (id, phone_number, user_id, image_url, upload_method, status)
                VALUES (?, ?, ?, ?, ?, 'pending')
            `, [id, phoneNumber, userId, imageUrl, uploadMethod || 'sms'], function(err) {
                if (err) reject(err);
                else resolve({ id, sessionId: id });
            });
        });
    }

    async getBriefingSession(sessionId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM sms_briefing_sessions WHERE id = ?
            `, [sessionId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getActiveBriefingSessionByPhone(phoneNumber) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM sms_briefing_sessions 
                WHERE phone_number = ? AND status IN ('pending', 'scheduled', 'in_progress')
                ORDER BY created_at DESC LIMIT 1
            `, [phoneNumber], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async updateBriefingSessionSchedule(sessionId, scheduledTime, status = 'scheduled') {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE sms_briefing_sessions 
                SET scheduled_time = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [scheduledTime, status, sessionId], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }

    async saveBriefingContext(contextData) {
        return new Promise((resolve, reject) => {
            const {
                sessionId, transcript, dishStory, targetAudience, 
                desiredMood, platformPreferences, postingUrgency, brandPersonality
            } = contextData;

            this.db.run(`
                INSERT INTO briefing_context 
                (session_id, transcript, dish_story, target_audience, desired_mood, 
                 platform_preferences, posting_urgency, brand_personality)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [sessionId, transcript, dishStory, targetAudience, desiredMood, 
                platformPreferences, postingUrgency, brandPersonality], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });
    }

    async saveSchedulingResponse(responseData) {
        return new Promise((resolve, reject) => {
            const { sessionId, phoneNumber, responseText, parsedSchedule, scheduledTime, responseType } = responseData;
            this.db.run(`
                INSERT INTO sms_scheduling_responses 
                (session_id, phone_number, response_text, parsed_schedule, scheduled_time, response_type)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [sessionId, phoneNumber, responseText, parsedSchedule, scheduledTime, responseType], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });
    }

    async trackWorkflowStep(sessionId, step, status, data = null) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO sms_workflow_status (session_id, workflow_step, status, data)
                VALUES (?, ?, ?, ?)
            `, [sessionId, step, status, JSON.stringify(data)], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });
    }

    async updateWorkflowStep(sessionId, step, status, errorMessage = null) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE sms_workflow_status 
                SET status = ?, completed_at = CURRENT_TIMESTAMP, error_message = ?
                WHERE session_id = ? AND workflow_step = ? AND completed_at IS NULL
            `, [status, errorMessage, sessionId, step], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
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
            `, [status, userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Database close error:', err);
                } else {
                    console.log('✅ Database connection closed');
                }
            });
        }
    }
}

module.exports = ChefSocialDatabase;