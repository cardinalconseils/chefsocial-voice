// ChefSocial User Repository
// Handles all user-related database operations
class UserRepository {
    constructor(dbConnection) {
        this.db = dbConnection;
    }

    // User CRUD Operations
    async createUser(userData) {
        const { id, email, passwordHash, name, restaurantName } = userData;
        const result = await this.db.run(`
            INSERT INTO users (id, email, password_hash, name, restaurant_name, trial_ends_at)
            VALUES (?, ?, ?, ?, ?, datetime('now', '+14 days'))
        `, [id, email, passwordHash, name, restaurantName]);
        
        return { id, changes: result.changes };
    }

    async getUserByEmail(email) {
        return await this.db.get(`
            SELECT u.*, s.plan_name, s.status as subscription_status, s.current_period_end
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE u.email = ?
        `, [email]);
    }

    async getUserById(userId) {
        return await this.db.get(`
            SELECT u.*, s.plan_name, s.status as subscription_status, s.current_period_end
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE u.id = ?
        `, [userId]);
    }

    async updateUser(userId, userData) {
        const fields = [];
        const values = [];
        
        if (userData.name !== undefined) {
            fields.push('name = ?');
            values.push(userData.name);
        }
        if (userData.restaurantName !== undefined) {
            fields.push('restaurant_name = ?');
            values.push(userData.restaurantName);
        }
        if (userData.cuisineType !== undefined) {
            fields.push('cuisine_type = ?');
            values.push(userData.cuisineType);
        }
        if (userData.location !== undefined) {
            fields.push('location = ?');
            values.push(userData.location);
        }
        if (userData.phone !== undefined) {
            fields.push('phone = ?');
            values.push(userData.phone);
        }
        if (userData.description !== undefined) {
            fields.push('description = ?');
            values.push(userData.description);
        }
        if (userData.brandColors !== undefined) {
            fields.push('brand_colors = ?');
            values.push(userData.brandColors);
        }
        if (userData.brandFonts !== undefined) {
            fields.push('brand_fonts = ?');
            values.push(userData.brandFonts);
        }
        if (userData.specialties !== undefined) {
            fields.push('specialties = ?');
            values.push(userData.specialties);
        }
        if (userData.ambiance !== undefined) {
            fields.push('ambiance = ?');
            values.push(userData.ambiance);
        }
        if (userData.targetAudience !== undefined) {
            fields.push('target_audience = ?');
            values.push(userData.targetAudience);
        }
        if (userData.uniqueSellingPoints !== undefined) {
            fields.push('unique_selling_points = ?');
            values.push(userData.uniqueSellingPoints);
        }
        if (userData.brandPersonality !== undefined) {
            fields.push('brand_personality = ?');
            values.push(userData.brandPersonality);
        }
        if (userData.contentTone !== undefined) {
            fields.push('content_tone = ?');
            values.push(userData.contentTone);
        }
        if (userData.keyMessages !== undefined) {
            fields.push('key_messages = ?');
            values.push(userData.keyMessages);
        }
        if (userData.preferredLanguage !== undefined) {
            fields.push('preferred_language = ?');
            values.push(userData.preferredLanguage);
        }
        if (userData.stripeCustomerId !== undefined) {
            fields.push('stripe_customer_id = ?');
            values.push(userData.stripeCustomerId);
        }
        if (userData.emailVerified !== undefined) {
            fields.push('email_verified = ?');
            values.push(userData.emailVerified);
        }
        if (userData.status !== undefined) {
            fields.push('status = ?');
            values.push(userData.status);
        }

        if (fields.length === 0) {
            throw new Error('No fields provided for update');
        }

        fields.push('updated_at = datetime(\'now\')');
        values.push(userId);

        const result = await this.db.run(`
            UPDATE users SET ${fields.join(', ')} WHERE id = ?
        `, values);

        return { changes: result.changes };
    }

    async updateUserStatus(userId, status) {
        const result = await this.db.run(`
            UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?
        `, [status, userId]);
        
        return { changes: result.changes };
    }

    async updateLastLogin(userId) {
        const result = await this.db.run(`
            UPDATE users SET last_login = datetime('now') WHERE id = ?
        `, [userId]);
        
        return { changes: result.changes };
    }

    async deleteUser(userId) {
        const result = await this.db.run(`
            UPDATE users SET status = 'deleted', updated_at = datetime('now') WHERE id = ?
        `, [userId]);
        
        return { changes: result.changes };
    }

    // User Query Operations
    async getAllUsers(limit = 50, offset = 0, filters = {}) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (filters.status) {
            whereClause += ' AND status = ?';
            params.push(filters.status);
        }
        if (filters.emailVerified !== undefined) {
            whereClause += ' AND email_verified = ?';
            params.push(filters.emailVerified);
        }
        if (filters.hasSubscription !== undefined) {
            if (filters.hasSubscription) {
                whereClause += ' AND EXISTS (SELECT 1 FROM subscriptions WHERE user_id = users.id AND status = "active")';
            } else {
                whereClause += ' AND NOT EXISTS (SELECT 1 FROM subscriptions WHERE user_id = users.id AND status = "active")';
            }
        }
        if (filters.trialActive !== undefined) {
            if (filters.trialActive) {
                whereClause += ' AND trial_ends_at > datetime("now")';
            } else {
                whereClause += ' AND trial_ends_at <= datetime("now")';
            }
        }

        params.push(limit, offset);

        return await this.db.all(`
            SELECT u.id, u.email, u.name, u.restaurant_name, u.status, u.preferred_language, 
                   u.created_at, u.last_login, u.trial_ends_at, u.email_verified,
                   s.plan_name, s.status as subscription_status
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            ${whereClause}
            ORDER BY u.created_at DESC 
            LIMIT ? OFFSET ?
        `, params);
    }

    async getUsersCount(filters = {}) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (filters.status) {
            whereClause += ' AND status = ?';
            params.push(filters.status);
        }
        if (filters.emailVerified !== undefined) {
            whereClause += ' AND email_verified = ?';
            params.push(filters.emailVerified);
        }
        if (filters.hasSubscription !== undefined) {
            if (filters.hasSubscription) {
                whereClause += ' AND EXISTS (SELECT 1 FROM subscriptions WHERE user_id = users.id AND status = "active")';
            } else {
                whereClause += ' AND NOT EXISTS (SELECT 1 FROM subscriptions WHERE user_id = users.id AND status = "active")';
            }
        }

        const result = await this.db.get(`
            SELECT COUNT(*) as count FROM users ${whereClause}
        `, params);
        
        return result.count;
    }

    async searchUsers(searchTerm, limit = 20) {
        return await this.db.all(`
            SELECT u.id, u.email, u.name, u.restaurant_name, u.status, u.created_at,
                   s.plan_name, s.status as subscription_status
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE u.email LIKE ? OR u.name LIKE ? OR u.restaurant_name LIKE ?
            ORDER BY u.created_at DESC
            LIMIT ?
        `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit]);
    }

    // User Statistics
    async getUserStats() {
        const stats = await this.db.get(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                COUNT(CASE WHEN email_verified = 1 THEN 1 END) as verified_users,
                COUNT(CASE WHEN trial_ends_at > datetime('now') THEN 1 END) as trial_users,
                COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as new_users_30d,
                COUNT(CASE WHEN last_login >= datetime('now', '-7 days') THEN 1 END) as active_7d,
                COUNT(CASE WHEN last_login >= datetime('now', '-30 days') THEN 1 END) as active_30d
            FROM users
        `);

        const subscriptionStats = await this.db.get(`
            SELECT 
                COUNT(*) as total_subscriptions,
                COUNT(CASE WHEN plan_name = 'starter' THEN 1 END) as starter_plans,
                COUNT(CASE WHEN plan_name = 'professional' THEN 1 END) as professional_plans,
                COUNT(CASE WHEN plan_name = 'enterprise' THEN 1 END) as enterprise_plans
            FROM subscriptions 
            WHERE status = 'active'
        `);

        return {
            ...stats,
            ...subscriptionStats
        };
    }

    // Feature Access Methods
    async getUserFeatures(userId) {
        return await this.db.all(`
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
        `, [userId]);
    }

    async checkFeatureAccess(userId, featureKey) {
        const result = await this.db.get(`
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
        `, [featureKey, userId]);
        
        return result ? !!result.has_access : false;
    }

    async grantFeatureAccess(userId, featureKey, expiresAt = null, notes = null) {
        const result = await this.db.run(`
            INSERT OR REPLACE INTO user_feature_access 
            (user_id, feature_key, access_granted, granted_at, expires_at, notes)
            VALUES (?, ?, TRUE, datetime('now'), ?, ?)
        `, [userId, featureKey, expiresAt, notes]);
        
        return { changes: result.changes };
    }

    async revokeFeatureAccess(userId, featureKey, notes = null) {
        const result = await this.db.run(`
            INSERT OR REPLACE INTO user_feature_access 
            (user_id, feature_key, access_granted, granted_at, notes)
            VALUES (?, ?, FALSE, datetime('now'), ?)
        `, [userId, featureKey, notes]);
        
        return { changes: result.changes };
    }

    // User Session Management
    async storeRefreshToken(userId, tokenId, expiresAt, ipAddress = null, userAgent = null, deviceInfo = null, location = null) {
        const result = await this.db.run(`
            INSERT INTO user_sessions (user_id, refresh_token_id, ip_address, user_agent, device_info, location, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [userId, tokenId, ipAddress, userAgent, deviceInfo, location, expiresAt]);
        
        return { id: result.lastID };
    }

    async getUserSessions(userId) {
        return await this.db.all(`
            SELECT * FROM user_sessions 
            WHERE user_id = ? AND is_active = TRUE AND expires_at > datetime('now')
            ORDER BY last_used DESC
        `, [userId]);
    }

    async updateSessionLastUsed(tokenId) {
        const result = await this.db.run(`
            UPDATE user_sessions SET last_used = datetime('now') WHERE refresh_token_id = ?
        `, [tokenId]);
        
        return { changes: result.changes };
    }

    async invalidateUserSession(tokenId) {
        const result = await this.db.run(`
            UPDATE user_sessions SET is_active = FALSE WHERE refresh_token_id = ?
        `, [tokenId]);
        
        return { changes: result.changes };
    }

    async invalidateAllUserSessions(userId) {
        const result = await this.db.run(`
            UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?
        `, [userId]);
        
        return { changes: result.changes };
    }

    async cleanupExpiredSessions() {
        const result = await this.db.run(`
            UPDATE user_sessions SET is_active = FALSE 
            WHERE expires_at <= datetime('now') AND is_active = TRUE
        `);
        
        return { changes: result.changes };
    }

    // User Content Operations
    async getUserContentCount(userId) {
        const result = await this.db.get(`
            SELECT COUNT(*) as count FROM generated_content WHERE user_id = ?
        `, [userId]);
        
        return result.count;
    }

    async getUserRecentActivity(userId, limit = 10) {
        return await this.db.all(`
            SELECT 
                'content' as activity_type,
                id,
                platform,
                content_type,
                created_at
            FROM generated_content 
            WHERE user_id = ?
            UNION ALL
            SELECT 
                'usage' as activity_type,
                feature_key as id,
                feature_key as platform,
                'usage' as content_type,
                created_at
            FROM usage_tracking 
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `, [userId, userId, limit]);
    }

    // Email and Verification
    async verifyUserEmail(userId) {
        const result = await this.db.run(`
            UPDATE users SET email_verified = TRUE, updated_at = datetime('now') WHERE id = ?
        `, [userId]);
        
        return { changes: result.changes };
    }

    async updateUserEmail(userId, newEmail) {
        const result = await this.db.run(`
            UPDATE users SET email = ?, email_verified = FALSE, updated_at = datetime('now') WHERE id = ?
        `, [newEmail, userId]);
        
        return { changes: result.changes };
    }

    // Trial Management
    async extendTrial(userId, days) {
        const result = await this.db.run(`
            UPDATE users SET 
                trial_ends_at = CASE 
                    WHEN trial_ends_at > datetime('now') THEN datetime(trial_ends_at, '+' || ? || ' days')
                    ELSE datetime('now', '+' || ? || ' days')
                END,
                updated_at = datetime('now')
            WHERE id = ?
        `, [days, days, userId]);
        
        return { changes: result.changes };
    }

    async getTrialStatus(userId) {
        const result = await this.db.get(`
            SELECT 
                trial_ends_at,
                CASE 
                    WHEN trial_ends_at > datetime('now') THEN 1 
                    ELSE 0 
                END as is_trial_active,
                CASE 
                    WHEN trial_ends_at > datetime('now') 
                    THEN CAST((julianday(trial_ends_at) - julianday('now')) AS INTEGER)
                    ELSE 0 
                END as days_remaining
            FROM users 
            WHERE id = ?
        `, [userId]);
        
        return result;
    }
}

module.exports = UserRepository;