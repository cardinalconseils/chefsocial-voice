// ChefSocial Content Repository
// Handles all generated content operations
class ContentRepository {
    constructor(dbConnection) {
        this.db = dbConnection;
    }

    // Content CRUD Operations
    async saveGeneratedContent(contentData) {
        const {
            id, userId, platform, contentType, caption, hashtags,
            imageUrl, transcript, viralScore, publishedAt
        } = contentData;

        const result = await this.db.run(`
            INSERT INTO generated_content 
            (id, user_id, platform, content_type, caption, hashtags, image_url, transcript, viral_score, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, userId, platform, contentType, caption, hashtags, imageUrl, transcript, viralScore, publishedAt]);

        return { id, changes: result.changes };
    }

    async updateGeneratedContent(contentId, updateData) {
        const fields = [];
        const values = [];

        if (updateData.caption !== undefined) {
            fields.push('caption = ?');
            values.push(updateData.caption);
        }
        if (updateData.hashtags !== undefined) {
            fields.push('hashtags = ?');
            values.push(updateData.hashtags);
        }
        if (updateData.imageUrl !== undefined) {
            fields.push('image_url = ?');
            values.push(updateData.imageUrl);
        }
        if (updateData.transcript !== undefined) {
            fields.push('transcript = ?');
            values.push(updateData.transcript);
        }
        if (updateData.viralScore !== undefined) {
            fields.push('viral_score = ?');
            values.push(updateData.viralScore);
        }
        if (updateData.publishedAt !== undefined) {
            fields.push('published_at = ?');
            values.push(updateData.publishedAt);
        }
        if (updateData.engagementData !== undefined) {
            fields.push('engagement_data = ?');
            values.push(updateData.engagementData);
        }

        if (fields.length === 0) {
            throw new Error('No fields provided for update');
        }

        values.push(contentId);

        const result = await this.db.run(`
            UPDATE generated_content 
            SET ${fields.join(', ')}
            WHERE id = ?
        `, values);

        return { changes: result.changes };
    }

    async deleteGeneratedContent(contentId) {
        const result = await this.db.run(`
            DELETE FROM generated_content WHERE id = ?
        `, [contentId]);

        return { changes: result.changes };
    }

    async getContentById(contentId) {
        return await this.db.get(`
            SELECT gc.*, u.name as user_name, u.restaurant_name
            FROM generated_content gc
            JOIN users u ON gc.user_id = u.id
            WHERE gc.id = ?
        `, [contentId]);
    }

    // User Content Operations
    async getUserContent(userId, limit = 50, offset = 0, filters = {}) {
        let whereClause = 'WHERE gc.user_id = ?';
        const params = [userId];

        if (filters.platform) {
            whereClause += ' AND gc.platform = ?';
            params.push(filters.platform);
        }
        if (filters.contentType) {
            whereClause += ' AND gc.content_type = ?';
            params.push(filters.contentType);
        }
        if (filters.dateFrom) {
            whereClause += ' AND gc.created_at >= ?';
            params.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            whereClause += ' AND gc.created_at <= ?';
            params.push(filters.dateTo);
        }
        if (filters.published !== undefined) {
            if (filters.published) {
                whereClause += ' AND gc.published_at IS NOT NULL';
            } else {
                whereClause += ' AND gc.published_at IS NULL';
            }
        }
        if (filters.minViralScore !== undefined) {
            whereClause += ' AND gc.viral_score >= ?';
            params.push(filters.minViralScore);
        }

        params.push(limit, offset);

        return await this.db.all(`
            SELECT gc.*, u.name as user_name, u.restaurant_name
            FROM generated_content gc
            JOIN users u ON gc.user_id = u.id
            ${whereClause}
            ORDER BY gc.created_at DESC 
            LIMIT ? OFFSET ?
        `, params);
    }

    async getUserContentCount(userId, filters = {}) {
        let whereClause = 'WHERE gc.user_id = ?';
        const params = [userId];

        if (filters.platform) {
            whereClause += ' AND gc.platform = ?';
            params.push(filters.platform);
        }
        if (filters.contentType) {
            whereClause += ' AND gc.content_type = ?';
            params.push(filters.contentType);
        }
        if (filters.dateFrom) {
            whereClause += ' AND gc.created_at >= ?';
            params.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            whereClause += ' AND gc.created_at <= ?';
            params.push(filters.dateTo);
        }
        if (filters.published !== undefined) {
            if (filters.published) {
                whereClause += ' AND gc.published_at IS NOT NULL';
            } else {
                whereClause += ' AND gc.published_at IS NULL';
            }
        }

        const result = await this.db.get(`
            SELECT COUNT(*) as count 
            FROM generated_content gc
            ${whereClause}
        `, params);

        return result.count;
    }

    async getUserRecentContent(userId, limit = 10) {
        return await this.db.all(`
            SELECT * FROM generated_content 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `, [userId, limit]);
    }

    async getUserContentByPlatform(userId, platform, limit = 20) {
        return await this.db.all(`
            SELECT * FROM generated_content 
            WHERE user_id = ? AND platform = ?
            ORDER BY created_at DESC 
            LIMIT ?
        `, [userId, platform, limit]);
    }

    async getUserPublishedContent(userId, limit = 50, offset = 0) {
        return await this.db.all(`
            SELECT * FROM generated_content 
            WHERE user_id = ? AND published_at IS NOT NULL
            ORDER BY published_at DESC 
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);
    }

    async getUserDraftContent(userId, limit = 50, offset = 0) {
        return await this.db.all(`
            SELECT * FROM generated_content 
            WHERE user_id = ? AND published_at IS NULL
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);
    }

    // Content Search and Discovery
    async searchContent(searchTerm, limit = 20, filters = {}) {
        let whereClause = 'WHERE (gc.caption LIKE ? OR gc.hashtags LIKE ? OR gc.transcript LIKE ?)';
        const params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

        if (filters.userId) {
            whereClause += ' AND gc.user_id = ?';
            params.push(filters.userId);
        }
        if (filters.platform) {
            whereClause += ' AND gc.platform = ?';
            params.push(filters.platform);
        }
        if (filters.contentType) {
            whereClause += ' AND gc.content_type = ?';
            params.push(filters.contentType);
        }
        if (filters.published !== undefined) {
            if (filters.published) {
                whereClause += ' AND gc.published_at IS NOT NULL';
            } else {
                whereClause += ' AND gc.published_at IS NULL';
            }
        }

        params.push(limit);

        return await this.db.all(`
            SELECT gc.*, u.name as user_name, u.restaurant_name
            FROM generated_content gc
            JOIN users u ON gc.user_id = u.id
            ${whereClause}
            ORDER BY gc.created_at DESC 
            LIMIT ?
        `, params);
    }

    async getTopPerformingContent(limit = 20, platform = null, days = 30) {
        let whereClause = 'WHERE gc.viral_score IS NOT NULL';
        const params = [];

        if (platform) {
            whereClause += ' AND gc.platform = ?';
            params.push(platform);
        }
        if (days) {
            whereClause += ' AND gc.created_at >= datetime(\'now\', \'-\' || ? || \' days\')';
            params.push(days);
        }

        params.push(limit);

        return await this.db.all(`
            SELECT gc.*, u.name as user_name, u.restaurant_name
            FROM generated_content gc
            JOIN users u ON gc.user_id = u.id
            ${whereClause}
            ORDER BY gc.viral_score DESC, gc.created_at DESC
            LIMIT ?
        `, params);
    }

    async getRecentContent(limit = 50, platform = null) {
        let whereClause = '';
        const params = [];

        if (platform) {
            whereClause = 'WHERE gc.platform = ?';
            params.push(platform);
        }

        params.push(limit);

        return await this.db.all(`
            SELECT gc.*, u.name as user_name, u.restaurant_name
            FROM generated_content gc
            JOIN users u ON gc.user_id = u.id
            ${whereClause}
            ORDER BY gc.created_at DESC 
            LIMIT ?
        `, params);
    }

    // Content Analytics and Statistics
    async getContentStats(userId = null, days = 30) {
        let whereClause = '';
        const params = [];

        if (userId) {
            whereClause = 'WHERE gc.user_id = ?';
            params.push(userId);
        }

        if (days) {
            const andOrWhere = whereClause ? ' AND' : 'WHERE';
            whereClause += `${andOrWhere} gc.created_at >= datetime('now', '-${days} days')`;
        }

        return await this.db.get(`
            SELECT 
                COUNT(*) as total_content,
                COUNT(CASE WHEN published_at IS NOT NULL THEN 1 END) as published_content,
                COUNT(CASE WHEN published_at IS NULL THEN 1 END) as draft_content,
                COUNT(CASE WHEN platform = 'instagram' THEN 1 END) as instagram_content,
                COUNT(CASE WHEN platform = 'facebook' THEN 1 END) as facebook_content,
                COUNT(CASE WHEN platform = 'tiktok' THEN 1 END) as tiktok_content,
                COUNT(CASE WHEN platform = 'linkedin' THEN 1 END) as linkedin_content,
                COUNT(CASE WHEN content_type = 'post' THEN 1 END) as posts,
                COUNT(CASE WHEN content_type = 'story' THEN 1 END) as stories,
                COUNT(CASE WHEN content_type = 'video' THEN 1 END) as videos,
                AVG(viral_score) as avg_viral_score,
                MAX(viral_score) as max_viral_score,
                COUNT(CASE WHEN viral_score >= 80 THEN 1 END) as high_performing_content
            FROM generated_content gc
            ${whereClause}
        `, params);
    }

    async getPlatformStats(userId = null, days = 30) {
        let whereClause = '';
        const params = [];

        if (userId) {
            whereClause = 'WHERE gc.user_id = ?';
            params.push(userId);
        }

        if (days) {
            const andOrWhere = whereClause ? ' AND' : 'WHERE';
            whereClause += `${andOrWhere} gc.created_at >= datetime('now', '-${days} days')`;
        }

        return await this.db.all(`
            SELECT 
                platform,
                COUNT(*) as total_content,
                COUNT(CASE WHEN published_at IS NOT NULL THEN 1 END) as published_content,
                AVG(viral_score) as avg_viral_score,
                MAX(viral_score) as max_viral_score
            FROM generated_content gc
            ${whereClause}
            GROUP BY platform
            ORDER BY total_content DESC
        `, params);
    }

    async getContentTypeStats(userId = null, days = 30) {
        let whereClause = '';
        const params = [];

        if (userId) {
            whereClause = 'WHERE gc.user_id = ?';
            params.push(userId);
        }

        if (days) {
            const andOrWhere = whereClause ? ' AND' : 'WHERE';
            whereClause += `${andOrWhere} gc.created_at >= datetime('now', '-${days} days')`;
        }

        return await this.db.all(`
            SELECT 
                content_type,
                COUNT(*) as total_content,
                COUNT(CASE WHEN published_at IS NOT NULL THEN 1 END) as published_content,
                AVG(viral_score) as avg_viral_score
            FROM generated_content gc
            ${whereClause}
            GROUP BY content_type
            ORDER BY total_content DESC
        `, params);
    }

    async getDailyContentStats(userId = null, days = 30) {
        let whereClause = '';
        const params = [];

        if (userId) {
            whereClause = 'WHERE gc.user_id = ?';
            params.push(userId);
        }

        if (days) {
            const andOrWhere = whereClause ? ' AND' : 'WHERE';
            whereClause += `${andOrWhere} gc.created_at >= datetime('now', '-${days} days')`;
        }

        return await this.db.all(`
            SELECT 
                date(created_at) as content_date,
                COUNT(*) as total_content,
                COUNT(CASE WHEN published_at IS NOT NULL THEN 1 END) as published_content,
                AVG(viral_score) as avg_viral_score
            FROM generated_content gc
            ${whereClause}
            GROUP BY date(created_at)
            ORDER BY content_date DESC
        `, params);
    }

    // Content Publishing and Engagement
    async markContentAsPublished(contentId, publishedAt = null, engagementData = null) {
        const publishTime = publishedAt || new Date().toISOString();
        
        const result = await this.db.run(`
            UPDATE generated_content 
            SET published_at = ?, engagement_data = ?
            WHERE id = ?
        `, [publishTime, engagementData, contentId]);

        return { changes: result.changes };
    }

    async updateContentEngagement(contentId, engagementData) {
        const result = await this.db.run(`
            UPDATE generated_content 
            SET engagement_data = ?
            WHERE id = ?
        `, [JSON.stringify(engagementData), contentId]);

        return { changes: result.changes };
    }

    async updateViralScore(contentId, viralScore) {
        const result = await this.db.run(`
            UPDATE generated_content 
            SET viral_score = ?
            WHERE id = ?
        `, [viralScore, contentId]);

        return { changes: result.changes };
    }

    // Batch Operations
    async deleteUserContent(userId, contentIds = null) {
        if (contentIds && contentIds.length > 0) {
            const placeholders = contentIds.map(() => '?').join(',');
            const result = await this.db.run(`
                DELETE FROM generated_content 
                WHERE user_id = ? AND id IN (${placeholders})
            `, [userId, ...contentIds]);
            return { changes: result.changes };
        } else {
            const result = await this.db.run(`
                DELETE FROM generated_content WHERE user_id = ?
            `, [userId]);
            return { changes: result.changes };
        }
    }

    async bulkUpdateContentPlatform(contentIds, newPlatform) {
        if (!contentIds || contentIds.length === 0) {
            return { changes: 0 };
        }

        const placeholders = contentIds.map(() => '?').join(',');
        const result = await this.db.run(`
            UPDATE generated_content 
            SET platform = ?
            WHERE id IN (${placeholders})
        `, [newPlatform, ...contentIds]);

        return { changes: result.changes };
    }

    async bulkDeleteContent(contentIds) {
        if (!contentIds || contentIds.length === 0) {
            return { changes: 0 };
        }

        const placeholders = contentIds.map(() => '?').join(',');
        const result = await this.db.run(`
            DELETE FROM generated_content 
            WHERE id IN (${placeholders})
        `, contentIds);

        return { changes: result.changes };
    }

    // Content Templates and Inspiration
    async getContentTemplates(platform = null, contentType = null, limit = 20) {
        let whereClause = 'WHERE gc.viral_score >= 80'; // High performing content as templates
        const params = [];

        if (platform) {
            whereClause += ' AND gc.platform = ?';
            params.push(platform);
        }
        if (contentType) {
            whereClause += ' AND gc.content_type = ?';
            params.push(contentType);
        }

        params.push(limit);

        return await this.db.all(`
            SELECT gc.caption, gc.hashtags, gc.content_type, gc.platform, gc.viral_score
            FROM generated_content gc
            ${whereClause}
            ORDER BY gc.viral_score DESC, RANDOM()
            LIMIT ?
        `, params);
    }

    async getPopularHashtags(platform = null, days = 30, limit = 50) {
        let whereClause = 'WHERE gc.hashtags IS NOT NULL AND gc.hashtags != ""';
        const params = [];

        if (platform) {
            whereClause += ' AND gc.platform = ?';
            params.push(platform);
        }
        if (days) {
            whereClause += ' AND gc.created_at >= datetime(\'now\', \'-\' || ? || \' days\')';
            params.push(days);
        }

        params.push(limit);

        // This is a simplified version - in practice you'd parse hashtags properly
        return await this.db.all(`
            SELECT 
                gc.hashtags,
                COUNT(*) as usage_count,
                AVG(gc.viral_score) as avg_performance
            FROM generated_content gc
            ${whereClause}
            GROUP BY gc.hashtags
            HAVING usage_count > 1
            ORDER BY usage_count DESC, avg_performance DESC
            LIMIT ?
        `, params);
    }

    // Cleanup Operations
    async deleteOldContent(daysOld = 365) {
        const result = await this.db.run(`
            DELETE FROM generated_content 
            WHERE created_at <= date('now', '-${daysOld} days')
            AND published_at IS NULL
        `);

        return { changes: result.changes };
    }

    async archiveOldPublishedContent(daysOld = 730) {
        // This would typically move to an archive table
        // For now, we'll just add an archive flag if it existed
        const result = await this.db.get(`
            SELECT COUNT(*) as count FROM generated_content 
            WHERE published_at <= date('now', '-${daysOld} days')
        `);

        return { archivable_content: result.count };
    }
}

module.exports = ContentRepository;