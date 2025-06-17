// ChefSocial Feature Repository
// Handles all feature access and license management operations
class FeatureRepository {
    constructor(dbConnection) {
        this.db = dbConnection;
    }

    // License Features CRUD Operations
    async createFeature(featureData) {
        const { 
            featureKey, featureName, description, 
            planStarter, planProfessional, planEnterprise 
        } = featureData;

        const result = await this.db.run(`
            INSERT INTO license_features 
            (feature_key, feature_name, description, plan_starter, plan_professional, plan_enterprise)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [featureKey, featureName, description, planStarter, planProfessional, planEnterprise]);

        return { id: result.lastID, changes: result.changes };
    }

    async updateFeature(featureKey, featureData) {
        const fields = [];
        const values = [];

        if (featureData.featureName !== undefined) {
            fields.push('feature_name = ?');
            values.push(featureData.featureName);
        }
        if (featureData.description !== undefined) {
            fields.push('description = ?');
            values.push(featureData.description);
        }
        if (featureData.planStarter !== undefined) {
            fields.push('plan_starter = ?');
            values.push(featureData.planStarter);
        }
        if (featureData.planProfessional !== undefined) {
            fields.push('plan_professional = ?');
            values.push(featureData.planProfessional);
        }
        if (featureData.planEnterprise !== undefined) {
            fields.push('plan_enterprise = ?');
            values.push(featureData.planEnterprise);
        }

        if (fields.length === 0) {
            throw new Error('No fields provided for update');
        }

        values.push(featureKey);

        const result = await this.db.run(`
            UPDATE license_features 
            SET ${fields.join(', ')}
            WHERE feature_key = ?
        `, values);

        return { changes: result.changes };
    }

    async deleteFeature(featureKey) {
        const result = await this.db.run(`
            DELETE FROM license_features WHERE feature_key = ?
        `, [featureKey]);

        return { changes: result.changes };
    }

    // Feature Query Operations
    async getAllFeatures() {
        return await this.db.all(`
            SELECT * FROM license_features ORDER BY feature_name ASC
        `);
    }

    async getFeatureByKey(featureKey) {
        return await this.db.get(`
            SELECT * FROM license_features WHERE feature_key = ?
        `, [featureKey]);
    }

    async getFeaturesByPlan(planName) {
        const planColumn = `plan_${planName.toLowerCase()}`;
        return await this.db.all(`
            SELECT * FROM license_features 
            WHERE ${planColumn} = TRUE 
            ORDER BY feature_name ASC
        `);
    }

    async getFeaturesNotInPlan(planName) {
        const planColumn = `plan_${planName.toLowerCase()}`;
        return await this.db.all(`
            SELECT * FROM license_features 
            WHERE ${planColumn} = FALSE 
            ORDER BY feature_name ASC
        `);
    }

    // User Feature Access Operations
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
                   ufa.expires_at,
                   ufa.granted_at,
                   ufa.notes,
                   s.plan_name,
                   CASE WHEN u.trial_ends_at > datetime('now') THEN 1 ELSE 0 END as is_trial
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            CROSS JOIN license_features lf
            LEFT JOIN user_feature_access ufa ON u.id = ufa.user_id AND lf.feature_key = ufa.feature_key
            WHERE u.id = ?
            ORDER BY lf.feature_name ASC
        `, [userId]);
    }

    async getUserAccessibleFeatures(userId) {
        const features = await this.getUserFeatures(userId);
        return features.filter(feature => feature.has_access);
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
                END as has_access,
                ufa.expires_at,
                s.plan_name,
                CASE WHEN u.trial_ends_at > datetime('now') THEN 1 ELSE 0 END as is_trial
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            LEFT JOIN license_features lf ON lf.feature_key = ?
            LEFT JOIN user_feature_access ufa ON u.id = ufa.user_id AND lf.feature_key = ufa.feature_key
            WHERE u.id = ?
        `, [featureKey, userId]);
        
        return result ? !!result.has_access : false;
    }

    async getDetailedFeatureAccess(userId, featureKey) {
        return await this.db.get(`
            SELECT 
                lf.feature_key,
                lf.feature_name,
                lf.description,
                CASE 
                    WHEN ufa.access_granted IS NOT NULL AND (ufa.expires_at IS NULL OR ufa.expires_at > datetime('now')) 
                    THEN ufa.access_granted
                    WHEN s.plan_name = 'starter' THEN lf.plan_starter
                    WHEN s.plan_name = 'professional' THEN lf.plan_professional
                    WHEN s.plan_name = 'enterprise' THEN lf.plan_enterprise
                    WHEN u.trial_ends_at > datetime('now') THEN lf.plan_professional
                    ELSE lf.plan_starter
                END as has_access,
                ufa.expires_at,
                ufa.granted_at,
                ufa.notes,
                s.plan_name,
                s.status as subscription_status,
                CASE WHEN u.trial_ends_at > datetime('now') THEN 1 ELSE 0 END as is_trial,
                u.trial_ends_at,
                CASE 
                    WHEN ufa.access_granted IS NOT NULL THEN 'custom'
                    WHEN s.plan_name IS NOT NULL THEN 'subscription'
                    WHEN u.trial_ends_at > datetime('now') THEN 'trial'
                    ELSE 'default'
                END as access_source
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            LEFT JOIN license_features lf ON lf.feature_key = ?
            LEFT JOIN user_feature_access ufa ON u.id = ufa.user_id AND lf.feature_key = ufa.feature_key
            WHERE u.id = ?
        `, [featureKey, userId]);
    }

    // User Feature Access Management
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

    async removeFeatureAccess(userId, featureKey) {
        const result = await this.db.run(`
            DELETE FROM user_feature_access 
            WHERE user_id = ? AND feature_key = ?
        `, [userId, featureKey]);

        return { changes: result.changes };
    }

    async updateFeatureAccess(userId, featureKey, accessData) {
        const fields = [];
        const values = [];

        if (accessData.accessGranted !== undefined) {
            fields.push('access_granted = ?');
            values.push(accessData.accessGranted);
        }
        if (accessData.expiresAt !== undefined) {
            fields.push('expires_at = ?');
            values.push(accessData.expiresAt);
        }
        if (accessData.notes !== undefined) {
            fields.push('notes = ?');
            values.push(accessData.notes);
        }

        if (fields.length === 0) {
            throw new Error('No fields provided for update');
        }

        values.push(userId, featureKey);

        const result = await this.db.run(`
            UPDATE user_feature_access 
            SET ${fields.join(', ')}
            WHERE user_id = ? AND feature_key = ?
        `, values);

        return { changes: result.changes };
    }

    async grantBulkFeatureAccess(userId, featureKeys, expiresAt = null, notes = null) {
        const results = [];
        
        for (const featureKey of featureKeys) {
            const result = await this.grantFeatureAccess(userId, featureKey, expiresAt, notes);
            results.push({ featureKey, ...result });
        }

        return results;
    }

    async revokeBulkFeatureAccess(userId, featureKeys, notes = null) {
        const results = [];
        
        for (const featureKey of featureKeys) {
            const result = await this.revokeFeatureAccess(userId, featureKey, notes);
            results.push({ featureKey, ...result });
        }

        return results;
    }

    // Feature Access Queries
    async getUsersWithFeatureAccess(featureKey, limit = 50, offset = 0) {
        return await this.db.all(`
            SELECT u.id, u.email, u.name, u.restaurant_name, 
                   ufa.granted_at, ufa.expires_at, ufa.notes,
                   s.plan_name, s.status as subscription_status
            FROM user_feature_access ufa
            JOIN users u ON ufa.user_id = u.id
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE ufa.feature_key = ? AND ufa.access_granted = TRUE
            AND (ufa.expires_at IS NULL OR ufa.expires_at > datetime('now'))
            ORDER BY ufa.granted_at DESC
            LIMIT ? OFFSET ?
        `, [featureKey, limit, offset]);
    }

    async getUsersWithoutFeatureAccess(featureKey, limit = 50, offset = 0) {
        return await this.db.all(`
            SELECT u.id, u.email, u.name, u.restaurant_name,
                   s.plan_name, s.status as subscription_status
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            LEFT JOIN user_feature_access ufa ON u.id = ufa.user_id AND ufa.feature_key = ?
            LEFT JOIN license_features lf ON lf.feature_key = ?
            WHERE (
                ufa.access_granted IS NULL AND (
                    (s.plan_name = 'starter' AND lf.plan_starter = FALSE) OR
                    (s.plan_name = 'professional' AND lf.plan_professional = FALSE) OR
                    (s.plan_name = 'enterprise' AND lf.plan_enterprise = FALSE) OR
                    (s.plan_name IS NULL AND u.trial_ends_at <= datetime('now') AND lf.plan_starter = FALSE)
                )
            ) OR (
                ufa.access_granted = FALSE
            )
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `, [featureKey, featureKey, limit, offset]);
    }

    async getExpiringFeatureAccess(daysFromNow = 7) {
        return await this.db.all(`
            SELECT u.id, u.email, u.name, u.restaurant_name,
                   ufa.feature_key, lf.feature_name, ufa.expires_at, ufa.notes
            FROM user_feature_access ufa
            JOIN users u ON ufa.user_id = u.id
            JOIN license_features lf ON ufa.feature_key = lf.feature_key
            WHERE ufa.access_granted = TRUE
            AND ufa.expires_at BETWEEN datetime('now') AND datetime('now', '+${daysFromNow} days')
            ORDER BY ufa.expires_at ASC
        `);
    }

    async cleanupExpiredFeatureAccess() {
        const result = await this.db.run(`
            UPDATE user_feature_access 
            SET access_granted = FALSE
            WHERE expires_at <= datetime('now') AND access_granted = TRUE
        `);

        return { changes: result.changes };
    }

    // Feature Usage Statistics
    async getFeatureUsageStats() {
        return await this.db.all(`
            SELECT 
                lf.feature_key,
                lf.feature_name,
                COUNT(CASE WHEN (
                    (ufa.access_granted IS NOT NULL AND ufa.access_granted = TRUE AND (ufa.expires_at IS NULL OR ufa.expires_at > datetime('now'))) OR
                    (s.plan_name = 'starter' AND lf.plan_starter = TRUE) OR
                    (s.plan_name = 'professional' AND lf.plan_professional = TRUE) OR
                    (s.plan_name = 'enterprise' AND lf.plan_enterprise = TRUE) OR
                    (u.trial_ends_at > datetime('now') AND lf.plan_professional = TRUE)
                ) THEN 1 END) as users_with_access,
                COUNT(u.id) as total_users_checked,
                COUNT(CASE WHEN ufa.access_granted = TRUE THEN 1 END) as custom_grants,
                COUNT(CASE WHEN s.plan_name = 'starter' AND lf.plan_starter = TRUE THEN 1 END) as starter_users,
                COUNT(CASE WHEN s.plan_name = 'professional' AND lf.plan_professional = TRUE THEN 1 END) as professional_users,
                COUNT(CASE WHEN s.plan_name = 'enterprise' AND lf.plan_enterprise = TRUE THEN 1 END) as enterprise_users,
                COUNT(CASE WHEN u.trial_ends_at > datetime('now') AND lf.plan_professional = TRUE THEN 1 END) as trial_users
            FROM license_features lf
            CROSS JOIN users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            LEFT JOIN user_feature_access ufa ON u.id = ufa.user_id AND lf.feature_key = ufa.feature_key
            GROUP BY lf.feature_key, lf.feature_name
            ORDER BY users_with_access DESC
        `);
    }

    async getPlanFeatureMatrix() {
        return await this.db.all(`
            SELECT 
                feature_key,
                feature_name,
                description,
                plan_starter,
                plan_professional,
                plan_enterprise
            FROM license_features
            ORDER BY feature_name ASC
        `);
    }

    // Feature Initialization and Management
    async initializeDefaultFeatures() {
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

        const results = [];
        for (const feature of features) {
            try {
                const result = await this.db.run(`
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
                results.push({ feature: feature.key, success: true, changes: result.changes });
            } catch (error) {
                results.push({ feature: feature.key, success: false, error: error.message });
            }
        }

        return results;
    }

    async syncPlanFeatures(planName, featureKeys) {
        const planColumn = `plan_${planName.toLowerCase()}`;
        
        // First, disable all features for this plan
        await this.db.run(`
            UPDATE license_features SET ${planColumn} = FALSE
        `);

        // Then enable only the specified features
        if (featureKeys.length > 0) {
            const placeholders = featureKeys.map(() => '?').join(',');
            await this.db.run(`
                UPDATE license_features 
                SET ${planColumn} = TRUE 
                WHERE feature_key IN (${placeholders})
            `, featureKeys);
        }

        return { success: true, plan: planName, features: featureKeys.length };
    }
}

module.exports = FeatureRepository;