// ChefSocial Usage Repository
// Handles all usage tracking and analytics operations
class UsageRepository {
    constructor(dbConnection) {
        this.db = dbConnection;
    }

    // Monthly Usage Tracking Operations
    async getCurrentUsage(userId) {
        const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
        const result = await this.db.get(`
            SELECT * FROM usage_tracking 
            WHERE user_id = ? AND month_year = ?
        `, [userId, currentMonth]);

        return result || {
            user_id: userId,
            month_year: currentMonth,
            voice_minutes_used: 0,
            images_generated: 0,
            videos_created: 0,
            api_calls_made: 0,
            extra_locations: 0,
            extra_users: 0
        };
    }

    async trackUsage(userId, usageType, amount = 1) {
        const currentMonth = new Date().toISOString().substring(0, 7);
        
        // Validate usage type
        const validUsageTypes = [
            'voice_minutes_used', 'images_generated', 'videos_created', 
            'api_calls_made', 'extra_locations', 'extra_users'
        ];
        
        if (!validUsageTypes.includes(usageType)) {
            throw new Error(`Invalid usage type: ${usageType}`);
        }

        const result = await this.db.run(`
            INSERT OR REPLACE INTO usage_tracking 
            (user_id, month_year, ${usageType}, updated_at)
            VALUES (
                ?,
                ?,
                COALESCE((SELECT ${usageType} FROM usage_tracking WHERE user_id = ? AND month_year = ?), 0) + ?,
                datetime('now')
            )
        `, [userId, currentMonth, userId, currentMonth, amount]);

        return { success: true, changes: result.changes };
    }

    async setUsage(userId, usageType, amount, monthYear = null) {
        const targetMonth = monthYear || new Date().toISOString().substring(0, 7);
        
        const validUsageTypes = [
            'voice_minutes_used', 'images_generated', 'videos_created', 
            'api_calls_made', 'extra_locations', 'extra_users'
        ];
        
        if (!validUsageTypes.includes(usageType)) {
            throw new Error(`Invalid usage type: ${usageType}`);
        }

        const result = await this.db.run(`
            INSERT OR REPLACE INTO usage_tracking 
            (user_id, month_year, ${usageType}, updated_at)
            VALUES (?, ?, ?, datetime('now'))
        `, [userId, targetMonth, amount]);

        return { success: true, changes: result.changes };
    }

    async resetUsage(userId, usageType = null, monthYear = null) {
        const targetMonth = monthYear || new Date().toISOString().substring(0, 7);
        
        if (usageType) {
            const validUsageTypes = [
                'voice_minutes_used', 'images_generated', 'videos_created', 
                'api_calls_made', 'extra_locations', 'extra_users'
            ];
            
            if (!validUsageTypes.includes(usageType)) {
                throw new Error(`Invalid usage type: ${usageType}`);
            }

            const result = await this.db.run(`
                UPDATE usage_tracking 
                SET ${usageType} = 0, updated_at = datetime('now')
                WHERE user_id = ? AND month_year = ?
            `, [userId, targetMonth]);

            return { success: true, changes: result.changes };
        } else {
            // Reset all usage for the month
            const result = await this.db.run(`
                INSERT OR REPLACE INTO usage_tracking 
                (user_id, month_year, voice_minutes_used, images_generated, videos_created, 
                 api_calls_made, extra_locations, extra_users, updated_at)
                VALUES (?, ?, 0, 0, 0, 0, 0, 0, datetime('now'))
            `, [userId, targetMonth]);

            return { success: true, changes: result.changes };
        }
    }

    // Usage History and Analytics
    async getUsageStats(userId, months = 12) {
        return await this.db.all(`
            SELECT * FROM usage_tracking 
            WHERE user_id = ? 
            ORDER BY month_year DESC 
            LIMIT ?
        `, [userId, months]);
    }

    async getUsageByMonth(userId, monthYear) {
        return await this.db.get(`
            SELECT * FROM usage_tracking 
            WHERE user_id = ? AND month_year = ?
        `, [userId, monthYear]);
    }

    async getUserUsageHistory(userId, startMonth = null, endMonth = null) {
        let whereClause = 'WHERE user_id = ?';
        const params = [userId];

        if (startMonth) {
            whereClause += ' AND month_year >= ?';
            params.push(startMonth);
        }
        if (endMonth) {
            whereClause += ' AND month_year <= ?';
            params.push(endMonth);
        }

        return await this.db.all(`
            SELECT * FROM usage_tracking 
            ${whereClause}
            ORDER BY month_year DESC
        `, params);
    }

    async getTotalUserUsage(userId) {
        return await this.db.get(`
            SELECT 
                SUM(voice_minutes_used) as total_voice_minutes,
                SUM(images_generated) as total_images,
                SUM(videos_created) as total_videos,
                SUM(api_calls_made) as total_api_calls,
                SUM(extra_locations) as total_extra_locations,
                SUM(extra_users) as total_extra_users,
                COUNT(*) as months_active,
                MIN(month_year) as first_usage_month,
                MAX(month_year) as latest_usage_month
            FROM usage_tracking 
            WHERE user_id = ?
        `, [userId]);
    }

    // Feature-Specific Usage Tracking
    async trackFeatureUsage(userId, featureKey, metadata = null) {
        const result = await this.db.run(`
            INSERT INTO usage_tracking (user_id, feature_key, metadata)
            VALUES (?, ?, ?)
        `, [userId, featureKey, metadata]);

        return { id: result.lastID };
    }

    async getFeatureUsageStats(userId, featureKey, days = 30) {
        return await this.db.all(`
            SELECT 
                date(created_at) as usage_date,
                COUNT(*) as usage_count,
                feature_key
            FROM usage_tracking 
            WHERE user_id = ? AND feature_key = ?
            AND created_at >= datetime('now', '-${days} days')
            GROUP BY date(created_at)
            ORDER BY usage_date DESC
        `, [userId, featureKey]);
    }

    async getUserFeatureUsage(userId, days = 30) {
        return await this.db.all(`
            SELECT 
                feature_key,
                COUNT(*) as usage_count,
                MAX(created_at) as last_used,
                MIN(created_at) as first_used
            FROM usage_tracking 
            WHERE user_id = ?
            AND created_at >= datetime('now', '-${days} days')
            GROUP BY feature_key
            ORDER BY usage_count DESC
        `, [userId]);
    }

    // Usage Limits and Quotas
    async checkUsageLimit(userId, usageType, limit) {
        const currentUsage = await this.getCurrentUsage(userId);
        const currentAmount = currentUsage[usageType] || 0;
        
        return {
            current: currentAmount,
            limit: limit,
            remaining: Math.max(0, limit - currentAmount),
            exceeded: currentAmount >= limit,
            percentage: limit > 0 ? Math.min(100, (currentAmount / limit) * 100) : 0
        };
    }

    async getUsageOverview(userId) {
        const currentUsage = await this.getCurrentUsage(userId);
        const totalUsage = await this.getTotalUserUsage(userId);
        const featureUsage = await this.getUserFeatureUsage(userId, 30);
        
        return {
            current_month: currentUsage,
            all_time: totalUsage,
            feature_usage_30d: featureUsage
        };
    }

    // Bulk Usage Operations
    async bulkTrackUsage(usageData) {
        const results = [];
        
        for (const usage of usageData) {
            try {
                const result = await this.trackUsage(usage.userId, usage.usageType, usage.amount);
                results.push({ ...usage, success: true, result });
            } catch (error) {
                results.push({ ...usage, success: false, error: error.message });
            }
        }
        
        return results;
    }

    async bulkResetUsage(userIds, usageType = null, monthYear = null) {
        const results = [];
        
        for (const userId of userIds) {
            try {
                const result = await this.resetUsage(userId, usageType, monthYear);
                results.push({ userId, success: true, result });
            } catch (error) {
                results.push({ userId, success: false, error: error.message });
            }
        }
        
        return results;
    }

    // System-Wide Usage Analytics
    async getSystemUsageStats(monthYear = null) {
        const targetMonth = monthYear || new Date().toISOString().substring(0, 7);
        
        return await this.db.get(`
            SELECT 
                COUNT(DISTINCT user_id) as active_users,
                SUM(voice_minutes_used) as total_voice_minutes,
                SUM(images_generated) as total_images,
                SUM(videos_created) as total_videos,
                SUM(api_calls_made) as total_api_calls,
                AVG(voice_minutes_used) as avg_voice_minutes_per_user,
                AVG(images_generated) as avg_images_per_user,
                AVG(videos_created) as avg_videos_per_user,
                AVG(api_calls_made) as avg_api_calls_per_user
            FROM usage_tracking 
            WHERE month_year = ?
        `, [targetMonth]);
    }

    async getUsageTrends(months = 12) {
        return await this.db.all(`
            SELECT 
                month_year,
                COUNT(DISTINCT user_id) as active_users,
                SUM(voice_minutes_used) as total_voice_minutes,
                SUM(images_generated) as total_images,
                SUM(videos_created) as total_videos,
                SUM(api_calls_made) as total_api_calls,
                AVG(voice_minutes_used) as avg_voice_minutes,
                AVG(images_generated) as avg_images,
                AVG(videos_created) as avg_videos
            FROM usage_tracking 
            WHERE month_year >= date('now', '-${months} months')
            GROUP BY month_year
            ORDER BY month_year DESC
        `);
    }

    async getTopUsers(usageType = 'voice_minutes_used', monthYear = null, limit = 50) {
        const targetMonth = monthYear || new Date().toISOString().substring(0, 7);
        
        const validUsageTypes = [
            'voice_minutes_used', 'images_generated', 'videos_created', 
            'api_calls_made', 'extra_locations', 'extra_users'
        ];
        
        if (!validUsageTypes.includes(usageType)) {
            throw new Error(`Invalid usage type: ${usageType}`);
        }

        return await this.db.all(`
            SELECT 
                ut.user_id,
                u.email,
                u.name,
                u.restaurant_name,
                ut.${usageType} as usage_amount,
                s.plan_name
            FROM usage_tracking ut
            JOIN users u ON ut.user_id = u.id
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE ut.month_year = ?
            ORDER BY ut.${usageType} DESC
            LIMIT ?
        `, [targetMonth, limit]);
    }

    async getUsageDistribution(usageType = 'voice_minutes_used', monthYear = null) {
        const targetMonth = monthYear || new Date().toISOString().substring(0, 7);
        
        const validUsageTypes = [
            'voice_minutes_used', 'images_generated', 'videos_created', 
            'api_calls_made', 'extra_locations', 'extra_users'
        ];
        
        if (!validUsageTypes.includes(usageType)) {
            throw new Error(`Invalid usage type: ${usageType}`);
        }

        return await this.db.all(`
            SELECT 
                CASE 
                    WHEN ${usageType} = 0 THEN '0'
                    WHEN ${usageType} BETWEEN 1 AND 10 THEN '1-10'
                    WHEN ${usageType} BETWEEN 11 AND 50 THEN '11-50'
                    WHEN ${usageType} BETWEEN 51 AND 100 THEN '51-100'
                    WHEN ${usageType} BETWEEN 101 AND 500 THEN '101-500'
                    WHEN ${usageType} > 500 THEN '500+'
                    ELSE 'unknown'
                END as usage_range,
                COUNT(*) as user_count
            FROM usage_tracking 
            WHERE month_year = ?
            GROUP BY usage_range
            ORDER BY 
                CASE usage_range
                    WHEN '0' THEN 1
                    WHEN '1-10' THEN 2
                    WHEN '11-50' THEN 3
                    WHEN '51-100' THEN 4
                    WHEN '101-500' THEN 5
                    WHEN '500+' THEN 6
                    ELSE 7
                END
        `, [targetMonth]);
    }

    // Usage Alerts and Monitoring
    async getUsersNearingLimits(usageType, threshold = 0.9) {
        // This would require subscription limits to be defined somewhere
        // For now, we'll return users with high usage
        const currentMonth = new Date().toISOString().substring(0, 7);
        
        return await this.db.all(`
            SELECT 
                ut.user_id,
                u.email,
                u.name,
                ut.${usageType} as current_usage,
                s.plan_name
            FROM usage_tracking ut
            JOIN users u ON ut.user_id = u.id
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE ut.month_year = ?
            AND ut.${usageType} > 0
            ORDER BY ut.${usageType} DESC
            LIMIT 100
        `, [currentMonth]);
    }

    async getInactiveUsers(days = 30) {
        return await this.db.all(`
            SELECT DISTINCT
                u.id,
                u.email,
                u.name,
                u.restaurant_name,
                u.last_login,
                s.plan_name
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE u.id NOT IN (
                SELECT DISTINCT user_id 
                FROM usage_tracking 
                WHERE updated_at >= datetime('now', '-${days} days')
            )
            AND u.created_at <= datetime('now', '-${days} days')
            ORDER BY u.last_login DESC
        `);
    }

    // Data Cleanup and Maintenance
    async cleanupOldUsageData(monthsToKeep = 24) {
        const cutoffMonth = new Date();
        cutoffMonth.setMonth(cutoffMonth.getMonth() - monthsToKeep);
        const cutoffString = cutoffMonth.toISOString().substring(0, 7);

        const result = await this.db.run(`
            DELETE FROM usage_tracking 
            WHERE month_year < ?
        `, [cutoffString]);

        return { changes: result.changes, cutoff_month: cutoffString };
    }

    async archiveUsageData(monthsToKeep = 12) {
        const cutoffMonth = new Date();
        cutoffMonth.setMonth(cutoffMonth.getMonth() - monthsToKeep);
        const cutoffString = cutoffMonth.toISOString().substring(0, 7);

        // In a real implementation, you'd move data to an archive table
        const result = await this.db.get(`
            SELECT COUNT(*) as records_to_archive 
            FROM usage_tracking 
            WHERE month_year < ?
        `, [cutoffString]);

        return { 
            records_to_archive: result.records_to_archive, 
            cutoff_month: cutoffString 
        };
    }

    // Export and Reporting
    async exportUserUsage(userId, format = 'json') {
        const usage = await this.getUserUsageHistory(userId);
        const totalUsage = await this.getTotalUserUsage(userId);
        
        const exportData = {
            user_id: userId,
            export_date: new Date().toISOString(),
            total_usage: totalUsage,
            monthly_usage: usage
        };

        if (format === 'csv') {
            // Convert to CSV format (simplified)
            const csvHeaders = 'month_year,voice_minutes,images,videos,api_calls,extra_locations,extra_users';
            const csvRows = usage.map(row => 
                `${row.month_year},${row.voice_minutes_used},${row.images_generated},${row.videos_created},${row.api_calls_made},${row.extra_locations},${row.extra_users}`
            );
            return [csvHeaders, ...csvRows].join('\n');
        }

        return exportData;
    }

    async generateUsageReport(startMonth, endMonth, includeSystemStats = true) {
        const report = {
            period: { start: startMonth, end: endMonth },
            generated_at: new Date().toISOString()
        };

        if (includeSystemStats) {
            report.system_stats = await this.getUsageTrends(12);
        }

        report.top_users = {
            voice_minutes: await this.getTopUsers('voice_minutes_used', endMonth, 10),
            images: await this.getTopUsers('images_generated', endMonth, 10),
            videos: await this.getTopUsers('videos_created', endMonth, 10)
        };

        report.usage_distribution = {
            voice_minutes: await this.getUsageDistribution('voice_minutes_used', endMonth),
            images: await this.getUsageDistribution('images_generated', endMonth),
            videos: await this.getUsageDistribution('videos_created', endMonth)
        };

        return report;
    }
}

module.exports = UsageRepository;