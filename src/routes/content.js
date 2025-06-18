// ChefSocial Voice AI - Content Management Routes
const express = require('express');
const router = express.Router();
const { asyncHandler, validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');
const { createServiceHelpers } = require('./route-helpers');

// Content management routes module - receives services from app.js
module.exports = (app) => {
    const { getServices, authMiddleware, rateLimitMiddleware, authWithRateLimit } = createServiceHelpers(app);
    
    // Validation schemas
    const contentSaveValidation = validateRequest([
        body('platform').isIn(['instagram', 'tiktok', 'facebook', 'linkedin', 'twitter']).withMessage('Invalid platform'),
        body('contentType').optional().isIn(['post', 'story', 'reel', 'video']),
        body('caption').notEmpty().withMessage('Caption is required'),
        body('hashtags').optional().isString(),
        body('imageUrl').optional().isURL(),
        body('transcript').optional().isString(),
        body('viralScore').optional().isInt({ min: 0, max: 10 })
    ]);
    
    const contentUpdateValidation = validateRequest([
        body('caption').optional().isString().isLength({ min: 1, max: 2200 }),
        body('hashtags').optional().isString(),
        body('viralScore').optional().isInt({ min: 0, max: 10 })
    ]);
    
    const contentIdValidation = validateRequest([
        param('id').isString().isLength({ min: 1 }).withMessage('Valid content ID required')
    ]);
    
    const historyValidation = validateRequest([
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 }),
        query('platform').optional().isIn(['instagram', 'tiktok', 'facebook', 'linkedin', 'twitter'])
    ]);

    // GET /api/content/history
    router.get('/history', 
        authSystem.authMiddleware(),
        historyValidation,
        asyncHandler(async (req, res) => {
            const { limit = 50, offset = 0, platform } = req.query;
            
            let query = `
                SELECT * FROM generated_content 
                WHERE user_id = ?
            `;
            let params = [req.userId];
            
            if (platform) {
                query += ` AND platform = ?`;
                params.push(platform);
            }
            
            query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
            params.push(parseInt(limit), parseInt(offset));
            
            const content = await authSystem.db.db.all(query, params);
            
            // Get total count for pagination
            let countQuery = `
                SELECT COUNT(*) as total FROM generated_content 
                WHERE user_id = ?
            `;
            let countParams = [req.userId];
            
            if (platform) {
                countQuery += ` AND platform = ?`;
                countParams.push(platform);
            }
            
            const countResult = await authSystem.db.db.get(countQuery, countParams);
            const total = countResult?.total || 0;
            
            // Audit log content history access
            await logger.auditUserAction(
                req.userId,
                'content_history_access',
                'content',
                null,
                {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    platform: platform || 'all',
                    resultCount: content.length
                },
                req
            );

            logger.info('Content history retrieved', {
                userId: req.userId,
                platform: platform || 'all',
                resultCount: content.length,
                total
            });
            
            res.json({
                success: true,
                content: content,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: total,
                    hasMore: (parseInt(offset) + content.length) < total
                }
            });
        })
    );

    // POST /api/content/save
    router.post('/save', 
        authSystem.authMiddleware(),
        contentLimiter,
        contentSaveValidation,
        asyncHandler(async (req, res) => {
            const { platform, contentType, caption, hashtags, imageUrl, transcript, viralScore } = req.body;
            
            const contentId = `content_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            
            const result = await authSystem.db.saveGeneratedContent({
                id: contentId,
                userId: req.userId,
                platform: platform,
                contentType: contentType || 'post',
                caption: caption,
                hashtags: hashtags || '',
                imageUrl: imageUrl,
                transcript: transcript,
                viralScore: viralScore || 0
            });
            
            // Audit log content save
            await logger.auditUserAction(
                req.userId,
                'content_save',
                'content',
                contentId,
                {
                    platform,
                    contentType: contentType || 'post',
                    captionLength: caption.length,
                    hasImage: !!imageUrl,
                    hasTranscript: !!transcript,
                    viralScore: viralScore || 0
                },
                req
            );

            logger.info('Content saved successfully', {
                userId: req.userId,
                contentId,
                platform,
                contentType: contentType || 'post'
            });
            
            res.json({
                success: true,
                message: 'Content saved successfully',
                contentId: contentId,
                content: {
                    id: contentId,
                    platform,
                    contentType: contentType || 'post',
                    caption,
                    hashtags: hashtags || '',
                    imageUrl,
                    viralScore: viralScore || 0
                }
            });
        })
    );

    // GET /api/content/:id
    router.get('/:id', 
        authSystem.authMiddleware(),
        contentIdValidation,
        asyncHandler(async (req, res) => {
            const contentId = req.params.id;
            
            const content = await authSystem.db.db.get(`
                SELECT * FROM generated_content 
                WHERE id = ? AND user_id = ?
            `, [contentId, req.userId]);
            
            if (!content) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Content not found' 
                });
            }

            // Audit log content access
            await logger.auditUserAction(
                req.userId,
                'content_access',
                'content',
                contentId,
                {
                    platform: content.platform,
                    contentType: content.content_type
                },
                req
            );

            logger.info('Content accessed', {
                userId: req.userId,
                contentId,
                platform: content.platform
            });
            
            res.json({
                success: true,
                content: content
            });
        })
    );

    // PUT /api/content/:id
    router.put('/:id', 
        authSystem.authMiddleware(),
        contentIdValidation,
        contentUpdateValidation,
        asyncHandler(async (req, res) => {
            const contentId = req.params.id;
            const { caption, hashtags, viralScore } = req.body;
            
            // Check if content exists and belongs to user
            const existingContent = await authSystem.db.db.get(`
                SELECT * FROM generated_content 
                WHERE id = ? AND user_id = ?
            `, [contentId, req.userId]);
            
            if (!existingContent) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Content not found' 
                });
            }
            
            // Prepare update data
            const updateData = {
                caption: caption !== undefined ? caption : existingContent.caption,
                hashtags: hashtags !== undefined ? hashtags : existingContent.hashtags,
                viral_score: viralScore !== undefined ? viralScore : existingContent.viral_score
            };
            
            // Update content
            await authSystem.db.db.run(`
                UPDATE generated_content 
                SET caption = ?, hashtags = ?, viral_score = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `, [updateData.caption, updateData.hashtags, updateData.viral_score, contentId, req.userId]);
            
            // Audit log content update
            await logger.auditUserAction(
                req.userId,
                'content_update',
                'content',
                contentId,
                {
                    platform: existingContent.platform,
                    changes: {
                        caption: caption !== undefined,
                        hashtags: hashtags !== undefined,
                        viralScore: viralScore !== undefined
                    },
                    newCaptionLength: updateData.caption.length
                },
                req
            );

            logger.info('Content updated successfully', {
                userId: req.userId,
                contentId,
                platform: existingContent.platform,
                updatedFields: Object.keys(req.body)
            });
            
            res.json({
                success: true,
                message: 'Content updated successfully',
                content: {
                    id: contentId,
                    ...updateData,
                    platform: existingContent.platform,
                    content_type: existingContent.content_type
                }
            });
        })
    );

    // DELETE /api/content/:id
    router.delete('/:id', 
        authSystem.authMiddleware(),
        contentIdValidation,
        asyncHandler(async (req, res) => {
            const contentId = req.params.id;
            
            // Check if content exists and belongs to user
            const existingContent = await authSystem.db.db.get(`
                SELECT * FROM generated_content 
                WHERE id = ? AND user_id = ?
            `, [contentId, req.userId]);
            
            if (!existingContent) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Content not found' 
                });
            }
            
            // Delete content
            await authSystem.db.db.run(`
                DELETE FROM generated_content 
                WHERE id = ? AND user_id = ?
            `, [contentId, req.userId]);
            
            // Audit log content deletion
            await logger.auditUserAction(
                req.userId,
                'content_delete',
                'content',
                contentId,
                {
                    platform: existingContent.platform,
                    contentType: existingContent.content_type,
                    captionLength: existingContent.caption?.length || 0
                },
                req
            );

            logger.info('Content deleted successfully', {
                userId: req.userId,
                contentId,
                platform: existingContent.platform
            });
            
            res.json({
                success: true,
                message: 'Content deleted successfully'
            });
        })
    );

    // GET /api/content/analytics/summary
    router.get('/analytics/summary', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const { timeframe = '30' } = req.query; // days
            const days = parseInt(timeframe);
            
            // Get content analytics for the user
            const analytics = await authSystem.db.db.all(`
                SELECT 
                    platform,
                    content_type,
                    COUNT(*) as count,
                    AVG(viral_score) as avg_viral_score,
                    MAX(viral_score) as max_viral_score,
                    date(created_at) as creation_date
                FROM generated_content 
                WHERE user_id = ? 
                AND created_at >= datetime('now', '-${days} days')
                GROUP BY platform, content_type, date(created_at)
                ORDER BY creation_date DESC
            `, [req.userId]);
            
            // Get total content count by platform
            const platformStats = await authSystem.db.db.all(`
                SELECT 
                    platform,
                    COUNT(*) as total_content,
                    AVG(viral_score) as avg_viral_score
                FROM generated_content 
                WHERE user_id = ? 
                AND created_at >= datetime('now', '-${days} days')
                GROUP BY platform
                ORDER BY total_content DESC
            `, [req.userId]);
            
            // Get recent high-performing content
            const topContent = await authSystem.db.db.all(`
                SELECT 
                    id,
                    platform,
                    content_type,
                    caption,
                    viral_score,
                    created_at
                FROM generated_content 
                WHERE user_id = ? 
                AND created_at >= datetime('now', '-${days} days')
                AND viral_score >= 7
                ORDER BY viral_score DESC, created_at DESC
                LIMIT 10
            `, [req.userId]);

            logger.info('Content analytics retrieved', {
                userId: req.userId,
                timeframe: days,
                analyticsCount: analytics.length,
                platformCount: platformStats.length
            });
            
            res.json({
                success: true,
                analytics: {
                    timeframe: days,
                    summary: analytics,
                    platformStats: platformStats,
                    topPerforming: topContent,
                    generatedAt: new Date().toISOString()
                }
            });
        })
    );

    // POST /api/content/duplicate/:id
    router.post('/duplicate/:id', 
        authSystem.authMiddleware(),
        contentIdValidation,
        asyncHandler(async (req, res) => {
            const contentId = req.params.id;
            const { newPlatform } = req.body;
            
            // Get original content
            const originalContent = await authSystem.db.db.get(`
                SELECT * FROM generated_content 
                WHERE id = ? AND user_id = ?
            `, [contentId, req.userId]);
            
            if (!originalContent) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Content not found' 
                });
            }
            
            // Create duplicate with new ID
            const newContentId = `content_${Date.now()}_dup_${Math.random().toString(36).substring(2, 11)}`;
            
            await authSystem.db.saveGeneratedContent({
                id: newContentId,
                userId: req.userId,
                platform: newPlatform || originalContent.platform,
                contentType: originalContent.content_type,
                caption: originalContent.caption,
                hashtags: originalContent.hashtags,
                imageUrl: originalContent.image_url,
                transcript: originalContent.transcript,
                viralScore: originalContent.viral_score
            });
            
            // Audit log content duplication
            await logger.auditUserAction(
                req.userId,
                'content_duplicate',
                'content',
                newContentId,
                {
                    originalId: contentId,
                    originalPlatform: originalContent.platform,
                    newPlatform: newPlatform || originalContent.platform
                },
                req
            );

            logger.info('Content duplicated successfully', {
                userId: req.userId,
                originalId: contentId,
                newId: newContentId,
                platform: newPlatform || originalContent.platform
            });
            
            res.json({
                success: true,
                message: 'Content duplicated successfully',
                originalId: contentId,
                newId: newContentId,
                newPlatform: newPlatform || originalContent.platform
            });
        })
    );

    // GET /api/content/templates
    router.get('/templates', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const { platform } = req.query;
            
            // Get user's most successful content patterns as templates
            let query = `
                SELECT 
                    platform,
                    content_type,
                    caption,
                    hashtags,
                    viral_score,
                    created_at
                FROM generated_content 
                WHERE user_id = ? 
                AND viral_score >= 7
            `;
            let params = [req.userId];
            
            if (platform) {
                query += ` AND platform = ?`;
                params.push(platform);
            }
            
            query += ` ORDER BY viral_score DESC, created_at DESC LIMIT 20`;
            
            const templates = await authSystem.db.db.all(query, params);
            
            // Create template patterns from high-performing content
            const templatePatterns = templates.map(content => ({
                id: `template_${content.platform}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                platform: content.platform,
                contentType: content.content_type,
                pattern: {
                    captionStructure: this.extractCaptionStructure(content.caption),
                    hashtagStrategy: this.extractHashtagStrategy(content.hashtags),
                    viralScore: content.viral_score
                },
                usage: {
                    basedOn: 'user_performance',
                    sampleCaption: content.caption.substring(0, 100) + '...',
                    createdAt: content.created_at
                }
            }));

            logger.info('Content templates retrieved', {
                userId: req.userId,
                platform: platform || 'all',
                templateCount: templatePatterns.length
            });
            
            res.json({
                success: true,
                templates: templatePatterns,
                platform: platform || 'all',
                count: templatePatterns.length
            });
        })
    );

// Helper function to extract caption structure patterns
function extractCaptionStructure(caption) {
    if (!caption) return 'standard';
    
    const lines = caption.split('\n').filter(line => line.trim());
    const hasQuestion = caption.includes('?');
    const hasEmojis = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(caption);
    const hasCallToAction = /follow|like|share|comment|tag|visit|try|check|swipe/i.test(caption);
    
    return {
        structure: lines.length > 3 ? 'multi_paragraph' : 'single_paragraph',
        engagement: {
            hasQuestion,
            hasEmojis,
            hasCallToAction
        },
        length: caption.length > 200 ? 'long' : caption.length > 100 ? 'medium' : 'short'
    };
}

// Helper function to extract hashtag strategies
function extractHashtagStrategy(hashtags) {
    if (!hashtags) return 'minimal';
    
    const tags = hashtags.split(/[#\s]+/).filter(tag => tag.trim());
    const tagCount = tags.length;
    
    return {
        count: tagCount,
        strategy: tagCount > 15 ? 'maximum' : tagCount > 10 ? 'aggressive' : tagCount > 5 ? 'moderate' : 'minimal',
        categories: categorizeHashtags(tags)
    };
}

// Helper function to categorize hashtags
function categorizeHashtags(tags) {
    const categories = {
        food: tags.filter(tag => /food|delicious|yummy|tasty|recipe|cooking|chef|cuisine/i.test(tag)).length,
        restaurant: tags.filter(tag => /restaurant|dining|foodie|eatery|bistro/i.test(tag)).length,
        trending: tags.filter(tag => /viral|trending|fyp|explore|popular/i.test(tag)).length,
        location: tags.filter(tag => /city|local|neighborhood|downtown/i.test(tag)).length,
        generic: tags.filter(tag => !/food|delicious|yummy|tasty|recipe|cooking|chef|cuisine|restaurant|dining|foodie|eatery|bistro|viral|trending|fyp|explore|popular|city|local|neighborhood|downtown/i.test(tag)).length
    };
    
    return categories;
}

// Error handling middleware for content routes
router.use((error, req, res, next) => {
    // Log content management errors
    if (error.message && error.message.includes('content')) {
        logger.logSecurityEvent(
            'content_error',
            `Content operation failed: ${error.message}`,
            'medium',
            {
                userId: req.userId,
                contentId: req.params?.id,
                operation: req.method,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                error: error.message
            }
        );
    }

    // Handle content-specific errors
    if (error.message && error.message.includes('validation')) {
        return res.status(400).json({
            success: false,
            error: 'Content validation error',
            message: error.message
        });
    }

    if (error.message && error.message.includes('not found')) {
        return res.status(404).json({
            success: false,
            error: 'Content not found',
            message: 'The requested content could not be found'
        });
    }

    if (error.message && error.message.includes('permission')) {
        return res.status(403).json({
            success: false,
            error: 'Content access denied',
            message: 'You do not have permission to access this content'
        });
    }

    // Default error response
    res.status(500).json({
        success: false,
        error: 'Content management error',
        message: error.message || 'An error occurred while managing content'
    });
});

return router;
};