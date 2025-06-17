// ChefSocial Database Schema Management
class DatabaseSchema {
    constructor(dbConnection) {
        this.db = dbConnection;
    }

    async createAllTables() {
        await this.createCoreTables();
        await this.createSecurityTables(); 
        await this.createAdminTables();
        await this.createIndexes();
        await this.runMigrations();
        await this.initializeFeatures();
        
        console.log('✅ All database tables and schema created');
    }

    async createCoreTables() {
        // Users table
        await this.db.run(`
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
        await this.db.run(`
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
        await this.db.run(`
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
        await this.db.run(`
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
        await this.db.run(`
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

        // Monthly usage tracking table  
        await this.db.run(`
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

        // Content generated table
        await this.db.run(`
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

        // Voice sessions table for LiveKit integration
        await this.db.run(`
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

        // Enable foreign key constraints
        await this.db.run(`PRAGMA foreign_keys = ON`);
        
        console.log('✅ Core tables created');
    }

    async createSecurityTables() {
        // Token blacklist table
        await this.db.run(`
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
        await this.db.run(`
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
        await this.db.run(`
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
        await this.db.run(`
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

        console.log('✅ Security tables created');
    }

    async createAdminTables() {
        // Admin users table
        await this.db.run(`
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
        await this.db.run(`
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

        console.log('✅ Admin tables created');
    }

    async createIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id)',
            'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
            'CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id)',
            'CREATE INDEX IF NOT EXISTS idx_generated_content_user_id ON generated_content(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_generated_content_platform ON generated_content(user_id, platform)',
            'CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON usage_tracking(user_id, month_year)',
            'CREATE INDEX IF NOT EXISTS idx_user_feature_access_lookup ON user_feature_access(user_id, feature_key)',
            'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_user_sessions_token_id ON user_sessions(refresh_token_id)',
            'CREATE INDEX IF NOT EXISTS idx_token_blacklist_token_id ON token_blacklist(token_id)',
            'CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email)',
            'CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts(ip_address)',
            'CREATE INDEX IF NOT EXISTS idx_security_restrictions_user ON security_restrictions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON voice_sessions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id)'
        ];

        for (const indexSql of indexes) {
            try {
                await this.db.run(indexSql);
            } catch (error) {
                if (!error.message.includes('already exists')) {
                    console.error('❌ Index creation error:', error);
                }
            }
        }
        
        console.log('✅ Database indexes created');
    }

    async runMigrations() {
        const migrations = [
            {
                name: 'add_preferred_language',
                sql: `ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'en'`
            },
            {
                name: 'add_role_column',
                sql: `ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`
            },
            {
                name: 'add_subscription_status',
                sql: `ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'inactive'`
            },
            {
                name: 'add_last_login_at',
                sql: `ALTER TABLE users ADD COLUMN last_login_at DATETIME`
            }
        ];

        for (const migration of migrations) {
            try {
                await this.db.run(migration.sql);
                console.log(`✅ Applied migration: ${migration.name}`);
            } catch (error) {
                if (!error.message.includes('duplicate column name')) {
                    console.error(`❌ Migration error (${migration.name}):`, error);
                }
            }
        }
    }

    async initializeFeatures() {
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

        for (const feature of features) {
            try {
                await this.db.run(`
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
            } catch (error) {
                console.error('❌ Feature initialization error:', error);
            }
        }

        console.log('✅ Default features initialized');
    }
}

module.exports = DatabaseSchema;