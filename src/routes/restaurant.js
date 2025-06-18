// ChefSocial Voice AI - Restaurant Routes
const express = require('express');
const router = express.Router();
const { asyncHandler, validateRequest } = require('../middleware/validation');
const { body } = require('express-validator');
const { createServiceHelpers } = require('./route-helpers');

// Restaurant routes module - receives services from app.js
module.exports = (app) => {
    const { getServices, authMiddleware, rateLimitMiddleware, authWithRateLimit } = createServiceHelpers(app);
    
    // Validation schemas
    const restaurantProfileValidation = validateRequest([
        body('restaurantName').optional().trim().isLength({ min: 2, max: 200 }),
        body('cuisineType').optional().trim().isLength({ max: 100 }),
        body('location').optional().trim().isLength({ max: 200 }),
        body('phone').optional().trim().isMobilePhone(),
        body('description').optional().trim().isLength({ max: 1000 }),
        body('brandColors').optional().trim().isLength({ max: 500 }),
        body('brandFonts').optional().trim().isLength({ max: 500 }),
        body('specialties').optional().trim().isLength({ max: 1000 }),
        body('ambiance').optional().trim().isLength({ max: 500 }),
        body('targetAudience').optional().trim().isLength({ max: 500 }),
        body('uniqueSellingPoints').optional().trim().isLength({ max: 1000 })
    ]);

    const brandVoiceValidation = validateRequest([
        body('contentSamples').isArray().withMessage('Content samples must be an array'),
        body('contentSamples.*').isString().isLength({ min: 10, max: 2000 }),
        body('brandPersonality').optional().isArray(),
        body('preferredTone').optional().isIn(['casual', 'professional', 'friendly', 'luxury', 'playful'])
    ]);

    // GET /api/restaurant/profile
    router.get('/profile', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const user = await authSystem.db.getUserById(req.userId);
            if (!user) {
                return res.status(404).json({ 
                    success: false,
                    error: 'User not found' 
                });
            }

            // Get restaurant-specific data
            const restaurantProfile = {
                restaurantName: user.restaurant_name,
                cuisineType: user.cuisine_type,
                location: user.location,
                phone: user.phone,
                description: user.description || '',
                brandColors: user.brand_colors || '',
                brandFonts: user.brand_fonts || '',
                specialties: user.specialties || '',
                ambiance: user.ambiance || '',
                targetAudience: user.target_audience || '',
                uniqueSellingPoints: user.unique_selling_points || '',
                brandPersonality: user.brand_personality || '',
                contentTone: user.content_tone || '',
                keyMessages: user.key_messages || ''
            };

            // Audit log restaurant profile access
            await logger.auditUserAction(
                req.userId,
                'restaurant_profile_access',
                'restaurant',
                req.userId,
                {
                    restaurantName: user.restaurant_name,
                    hasCompleteProfile: !!(user.restaurant_name && user.cuisine_type && user.location)
                },
                req
            );

            logger.info('Restaurant profile accessed', {
                userId: req.userId,
                restaurantName: user.restaurant_name
            });

            res.json({
                success: true,
                restaurant: restaurantProfile,
                completeness: this.calculateProfileCompleteness(restaurantProfile)
            });
        })
    );

    // PUT /api/restaurant/profile
    router.put('/profile', 
        authSystem.authMiddleware(),
        restaurantLimiter,
        restaurantProfileValidation,
        asyncHandler(async (req, res) => {
            const {
                restaurantName,
                cuisineType,
                location,
                phone,
                description,
                brandColors,
                brandFonts,
                specialties,
                ambiance,
                targetAudience,
                uniqueSellingPoints,
                brandPersonality,
                contentTone,
                keyMessages
            } = req.body;

            // Get current profile for comparison
            const currentUser = await authSystem.db.getUserById(req.userId);

            // Update restaurant profile in user table
            await authSystem.db.db.run(`
                UPDATE users 
                SET restaurant_name = ?, cuisine_type = ?, location = ?, phone = ?, 
                    description = ?, brand_colors = ?, brand_fonts = ?, specialties = ?,
                    ambiance = ?, target_audience = ?, unique_selling_points = ?,
                    brand_personality = ?, content_tone = ?, key_messages = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                restaurantName || currentUser.restaurant_name,
                cuisineType || currentUser.cuisine_type,
                location || currentUser.location,
                phone || currentUser.phone,
                description || currentUser.description,
                brandColors || currentUser.brand_colors,
                brandFonts || currentUser.brand_fonts,
                specialties || currentUser.specialties,
                ambiance || currentUser.ambiance,
                targetAudience || currentUser.target_audience,
                uniqueSellingPoints || currentUser.unique_selling_points,
                brandPersonality || currentUser.brand_personality,
                contentTone || currentUser.content_tone,
                keyMessages || currentUser.key_messages,
                req.userId
            ]);

            // Audit log restaurant profile update
            await logger.auditUserAction(
                req.userId,
                'restaurant_profile_update',
                'restaurant',
                req.userId,
                {
                    restaurantName: restaurantName || currentUser.restaurant_name,
                    changes: Object.keys(req.body),
                    fieldsUpdated: Object.keys(req.body).length
                },
                req
            );

            logger.info('Restaurant profile updated', {
                userId: req.userId,
                restaurantName: restaurantName || currentUser.restaurant_name,
                fieldsUpdated: Object.keys(req.body).length
            });

            res.json({
                success: true,
                message: 'Restaurant profile updated successfully',
                restaurant: {
                    restaurantName: restaurantName || currentUser.restaurant_name,
                    cuisineType: cuisineType || currentUser.cuisine_type,
                    location: location || currentUser.location
                }
            });
        })
    );

    // GET /api/restaurant/brand-voice
    router.get('/brand-voice', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const user = await authSystem.db.getUserById(req.userId);
            if (!user) {
                return res.status(404).json({ 
                    success: false,
                    error: 'User not found' 
                });
            }

            // Get recent content to analyze brand voice
            const recentContent = await authSystem.db.db.all(`
                SELECT caption, platform, viral_score, created_at 
                FROM generated_content 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 20
            `, [req.userId]);

            // Analyze brand voice patterns from content
            const brandVoiceAnalysis = this.analyzeBrandVoice(recentContent, user);

            // Get stored brand voice settings
            const brandVoiceSettings = {
                brandPersonality: user.brand_personality ? JSON.parse(user.brand_personality) : [],
                contentTone: user.content_tone || '',
                keyMessages: user.key_messages ? JSON.parse(user.key_messages) : [],
                lastUpdated: user.updated_at
            };

            logger.info('Brand voice accessed', {
                userId: req.userId,
                contentSamples: recentContent.length,
                hasStoredSettings: !!(user.brand_personality || user.content_tone)
            });

            res.json({
                success: true,
                brandVoice: {
                    settings: brandVoiceSettings,
                    analysis: brandVoiceAnalysis,
                    recommendations: this.generateBrandVoiceRecommendations(brandVoiceAnalysis, user)
                },
                contentSamples: recentContent.length
            });
        })
    );

    // POST /api/restaurant/brand-voice/learn
    router.post('/brand-voice/learn', 
        authSystem.authMiddleware(),
        restaurantLimiter,
        brandVoiceValidation,
        asyncHandler(async (req, res) => {
            const { contentSamples, brandPersonality, preferredTone, keyMessages } = req.body;

            // Analyze the provided content samples to learn brand voice
            const voiceAnalysis = this.analyzeBrandVoiceFromSamples(contentSamples);

            // Combine with user preferences
            const learnedBrandVoice = {
                personality: brandPersonality || voiceAnalysis.detectedPersonality,
                tone: preferredTone || voiceAnalysis.detectedTone,
                keyPhrases: voiceAnalysis.commonPhrases,
                writingStyle: voiceAnalysis.writingStyle,
                emojiUsage: voiceAnalysis.emojiPattern,
                hashtagStrategy: voiceAnalysis.hashtagPattern
            };

            // Store the learned brand voice
            await authSystem.db.db.run(`
                UPDATE users 
                SET brand_personality = ?, content_tone = ?, key_messages = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                JSON.stringify(learnedBrandVoice.personality),
                learnedBrandVoice.tone,
                JSON.stringify(keyMessages || learnedBrandVoice.keyPhrases),
                req.userId
            ]);

            // Audit log brand voice learning
            await logger.auditUserAction(
                req.userId,
                'brand_voice_learn',
                'restaurant',
                req.userId,
                {
                    samplesAnalyzed: contentSamples.length,
                    detectedTone: learnedBrandVoice.tone,
                    personalityTraits: learnedBrandVoice.personality.length,
                    keyPhrasesFound: learnedBrandVoice.keyPhrases.length
                },
                req
            );

            logger.info('Brand voice learning completed', {
                userId: req.userId,
                samplesAnalyzed: contentSamples.length,
                detectedTone: learnedBrandVoice.tone
            });

            res.json({
                success: true,
                message: 'Brand voice learned successfully',
                brandVoice: learnedBrandVoice,
                analysis: voiceAnalysis,
                recommendations: this.generateContentRecommendations(learnedBrandVoice)
            });
        })
    );

    // GET /api/restaurant/analytics
    router.get('/analytics', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const { timeframe = '30' } = req.query;
            const days = parseInt(timeframe);

            // Get restaurant content performance
            const contentAnalytics = await authSystem.db.db.all(`
                SELECT 
                    platform,
                    content_type,
                    COUNT(*) as post_count,
                    AVG(viral_score) as avg_viral_score,
                    MAX(viral_score) as best_viral_score,
                    date(created_at) as date
                FROM generated_content 
                WHERE user_id = ? 
                AND created_at >= datetime('now', '-${days} days')
                GROUP BY platform, content_type, date(created_at)
                ORDER BY date DESC
            `, [req.userId]);

            // Get usage patterns
            const usageAnalytics = await authSystem.db.getCurrentUsage(req.userId);

            // Get user info for restaurant context
            const user = await authSystem.db.getUserById(req.userId);

            logger.info('Restaurant analytics accessed', {
                userId: req.userId,
                timeframe: days,
                contentRecords: contentAnalytics.length
            });

            res.json({
                success: true,
                analytics: {
                    restaurant: {
                        name: user.restaurant_name,
                        cuisineType: user.cuisine_type,
                        location: user.location
                    },
                    timeframe: days,
                    content: contentAnalytics,
                    usage: usageAnalytics,
                    insights: this.generateRestaurantInsights(contentAnalytics, user),
                    generatedAt: new Date().toISOString()
                }
            });
        })
    );

// Helper function to calculate profile completeness
function calculateProfileCompleteness(profile) {
    const requiredFields = ['restaurantName', 'cuisineType', 'location'];
    const optionalFields = ['phone', 'description', 'specialties', 'ambiance', 'targetAudience'];
    
    const completedRequired = requiredFields.filter(field => profile[field]).length;
    const completedOptional = optionalFields.filter(field => profile[field]).length;
    
    const requiredScore = (completedRequired / requiredFields.length) * 70; // 70% weight for required
    const optionalScore = (completedOptional / optionalFields.length) * 30; // 30% weight for optional
    
    return {
        percentage: Math.round(requiredScore + optionalScore),
        required: {
            completed: completedRequired,
            total: requiredFields.length
        },
        optional: {
            completed: completedOptional,
            total: optionalFields.length
        }
    };
}

// Helper function to analyze brand voice
function analyzeBrandVoice(content, user) {
    if (!content || content.length === 0) {
        return {
            confidence: 'low',
            tone: 'neutral',
            personality: [],
            patterns: []
        };
    }

    // Simple analysis of content patterns
    const allText = content.map(c => c.caption).join(' ').toLowerCase();
    
    // Detect tone patterns
    const casualWords = ['awesome', 'amazing', 'love', 'yummy', 'delish'];
    const professionalWords = ['excellence', 'crafted', 'artisan', 'curated', 'sophisticated'];
    const friendlyWords = ['welcome', 'family', 'community', 'home', 'together'];
    
    const casualScore = casualWords.filter(word => allText.includes(word)).length;
    const professionalScore = professionalWords.filter(word => allText.includes(word)).length;
    const friendlyScore = friendlyWords.filter(word => allText.includes(word)).length;
    
    let dominantTone = 'neutral';
    if (casualScore > professionalScore && casualScore > friendlyScore) {
        dominantTone = 'casual';
    } else if (professionalScore > casualScore && professionalScore > friendlyScore) {
        dominantTone = 'professional';
    } else if (friendlyScore > casualScore && friendlyScore > professionalScore) {
        dominantTone = 'friendly';
    }

    return {
        confidence: content.length >= 10 ? 'high' : content.length >= 5 ? 'medium' : 'low',
        tone: dominantTone,
        personality: extractPersonalityTraits(allText),
        patterns: extractWritingPatterns(content),
        averageViralScore: content.reduce((sum, c) => sum + (c.viral_score || 0), 0) / content.length
    };
}

// Helper function to extract personality traits
function extractPersonalityTraits(text) {
    const traits = [];
    
    if (text.includes('passion') || text.includes('love')) traits.push('passionate');
    if (text.includes('innovation') || text.includes('creative')) traits.push('innovative');
    if (text.includes('tradition') || text.includes('authentic')) traits.push('traditional');
    if (text.includes('fun') || text.includes('exciting')) traits.push('playful');
    if (text.includes('care') || text.includes('attention')) traits.push('caring');
    
    return traits;
}

// Helper function to extract writing patterns
function extractWritingPatterns(content) {
    // Simple pattern analysis
    return ['engaging', 'descriptive'];
}

// Error handling middleware for restaurant routes
router.use((error, req, res, next) => {
    // Log restaurant management errors
    logger.error('Restaurant route error', error, {
        userId: req.userId,
        path: req.path,
        method: req.method
    });

    // Handle restaurant-specific errors
    if (error.message && error.message.includes('profile')) {
        return res.status(400).json({
            success: false,
            error: 'Restaurant profile error',
            message: error.message
        });
    }

    if (error.message && error.message.includes('brand voice')) {
        return res.status(400).json({
            success: false,
            error: 'Brand voice error',
            message: error.message
        });
    }

    // Default error response
    res.status(500).json({
        success: false,
        error: 'Restaurant management error',
        message: error.message || 'An error occurred while managing restaurant data'
    });
});

return router;
};