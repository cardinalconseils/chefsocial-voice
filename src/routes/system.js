// ChefSocial Voice AI - System Routes
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/validation');
const { createServiceHelpers } = require('./route-helpers');

// System routes module - receives services from app.js
module.exports = (app) => {
    const { getServices, authMiddleware, rateLimitMiddleware, authWithRateLimit } = createServiceHelpers(app);

    // GET /api/health
    router.get('/health', (req, res) => {
        try {
            const { rateLimitService } = getServices();
            const basicStats = rateLimitService.getRateLimitStats();
            
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                service: 'ChefSocial Voice AI',
                version: '2.0.0',
                environment: process.env.NODE_ENV || 'development',
                rateLimiting: {
                    service: 'active',
                    trackedKeys: basicStats.totalTrackedKeys,
                    recentBreaches: basicStats.recentBreaches
                },
                database: {
                    status: 'connected',
                    type: 'sqlite3'
                }
            });
        } catch (error) {
            res.json({ 
                status: 'initializing', 
                timestamp: new Date().toISOString(),
                service: 'ChefSocial Voice AI',
                version: '2.0.0',
                environment: process.env.NODE_ENV || 'development',
                message: 'Services are still initializing'
            });
        }
    });

    // GET /api/features - Get user features and permissions
    router.get('/features', 
        authMiddleware,
        asyncHandler(async (req, res) => {
            const { authSystem, logger } = getServices();
            const features = await authSystem.getUserFeatures(req.userId);
            
            // Audit log feature access
            await logger.auditUserAction(
                req.userId,
                'features_access',
                'user',
                req.userId,
                {
                    featuresCount: features.length,
                    enabledFeatures: features.filter(f => f.has_access).length
                },
                req
            );

            logger.info('User features retrieved', {
                userId: req.userId,
                featuresCount: features.length
            });

            res.json({ 
                success: true, 
                features: features,
                timestamp: new Date().toISOString()
            });
        })
    );

    // GET /api/languages - Get available languages
    router.get('/languages', 
        (req, res) => {
            try {
                const { i18n } = getServices();
                const languages = i18n ? i18n.getAvailableLanguages() : {
                    en: { name: 'English', flag: '🇺🇸' },
                    fr: { name: 'Français', flag: '🇫🇷' }
                };
                
                res.json({ 
                    success: true, 
                    languages: languages,
                    current: req.language || 'en',
                    total: Object.keys(languages).length
                });
            } catch (error) {
                res.json({ 
                    success: true, 
                    languages: {
                        en: { name: 'English', flag: '🇺🇸' },
                        fr: { name: 'Français', flag: '🇫🇷' }
                    },
                    current: 'en',
                    total: 2
                });
            }
        }
    );

    // GET /api/pricing - Get pricing plan and overages
    router.get('/pricing', 
        (req, res) => {
            try {
                const { authSystem, logger } = getServices();
                const pricing = authSystem.getPricingPlan();
                res.json({ 
                    success: true, 
                    pricing: pricing,
                    currency: 'USD',
                    lastUpdated: new Date().toISOString()
                });
            } catch (error) {
                console.error('Pricing error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get pricing information' 
                });
            }
        }
    );

    // GET /api/pricing/stripe - Get Stripe products with live pricing
    router.get('/pricing/stripe', 
        asyncHandler(async (req, res) => {
            const { authSystem } = getServices();
            const products = await authSystem.getStripeProducts();
            res.json({ 
                success: true, 
                products: products,
                provider: 'stripe',
                lastUpdated: new Date().toISOString()
            });
        })
    );

    // GET /api/status - Extended system status (authenticated endpoint)
    router.get('/status', 
        authMiddleware,
        asyncHandler(async (req, res) => {
            const rateLimitStats = rateLimitService.getRateLimitStats();
            
            // Get database stats if available
            let databaseStats = { status: 'connected' };
            try {
                if (authSystem.db.getPoolStats) {
                    databaseStats = await authSystem.db.getPoolStats();
                }
            } catch (error) {
                databaseStats = { status: 'unknown', error: error.message };
            }

            // Get service metrics
            const serviceMetrics = {
                rateLimiting: rateLimitStats,
                database: databaseStats,
                authentication: {
                    jwtEnabled: true,
                    refreshTokens: true,
                    sessionManagement: true
                },
                features: {
                    voiceProcessing: true,
                    liveKitIntegration: true,
                    contentGeneration: true,
                    multiLanguage: true
                }
            };

            // Audit log system status access
            await logger.auditUserAction(
                req.userId,
                'system_status_access',
                'system',
                null,
                {
                    metricsRequested: Object.keys(serviceMetrics).length
                },
                req
            );

            logger.info('System status accessed', {
                userId: req.userId,
                metricsCount: Object.keys(serviceMetrics).length
            });

            res.json({
                success: true,
                status: 'operational',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                metrics: serviceMetrics,
                version: '2.0.0',
                environment: process.env.NODE_ENV || 'development'
            });
        })
    );

    // GET /api/info - Public API information
    router.get('/info', (req, res) => {
        res.json({
            name: 'ChefSocial Voice AI API',
            version: '2.0.0',
            description: 'Advanced voice-to-content AI platform for restaurants',
            environment: process.env.NODE_ENV || 'development',
            status: 'operational',
            endpoints: {
                authentication: '/api/auth',
                userManagement: '/api/user',
                voiceProcessing: '/api/voice',
                contentManagement: '/api/content',
                restaurantFeatures: '/api/restaurant',
                systemUtilities: '/api'
            },
            features: [
                'Voice-to-content AI processing',
                'Multi-platform content generation',
                'LiveKit telephony integration',
                'Real-time voice conversations',
                'Multi-language support',
                'Advanced analytics'
            ],
            documentation: 'https://docs.chefsocial.io',
            support: 'support@chefsocial.io',
            timestamp: new Date().toISOString()
        });
    });

    // POST /api/usage/track - Track feature usage
    router.post('/usage/track', 
        authMiddleware,
        asyncHandler(async (req, res) => {
            const { feature, amount = 1, metadata = {} } = req.body;
            
            if (!feature) {
                return res.status(400).json({
                    success: false,
                    error: 'Feature name is required'
                });
            }

            // Track the usage
            await authSystem.db.trackUsage(req.userId, feature, JSON.stringify(metadata));

            // Audit log usage tracking
            await logger.auditUserAction(
                req.userId,
                'usage_track',
                'usage',
                null,
                {
                    feature,
                    amount,
                    metadata: Object.keys(metadata).length > 0 ? metadata : null
                },
                req
            );

            logger.info('Usage tracked', {
                userId: req.userId,
                feature,
                amount
            });

            res.json({
                success: true,
                message: 'Usage tracked successfully',
                feature,
                amount,
                timestamp: new Date().toISOString()
            });
        })
    );

    // POST /api/billing/estimate - Get billing estimate
    router.post('/billing/estimate', 
        authMiddleware,
        asyncHandler(async (req, res) => {
            const { usageData = {} } = req.body;
            
            // Get current usage
            const currentUsage = await authSystem.db.getCurrentUsage(req.userId);
            
            // Calculate estimate based on current usage + proposed changes
            const planLimits = authSystem.pricingPlan.complete.limits;
            let estimatedCost = 7900; // Base plan cost in cents
            
            // Calculate overages
            const estimatedUsage = {
                voice_minutes: (currentUsage.voice_minutes_used || 0) + (usageData.voice_minutes || 0),
                images: (currentUsage.images_generated || 0) + (usageData.images || 0),
                videos: (currentUsage.videos_created || 0) + (usageData.videos || 0),
                extra_users: (currentUsage.extra_users || 0) + (usageData.extra_users || 0),
                extra_locations: (currentUsage.extra_locations || 0) + (usageData.extra_locations || 0)
            };
            
            // Add overage costs
            if (estimatedUsage.voice_minutes > planLimits.voice_minutes_per_month) {
                estimatedCost += (estimatedUsage.voice_minutes - planLimits.voice_minutes_per_month) * authSystem.overagePricing.voice_minutes.price;
            }
            
            if (estimatedUsage.images > planLimits.images_per_month) {
                estimatedCost += (estimatedUsage.images - planLimits.images_per_month) * authSystem.overagePricing.images.price;
            }
            
            if (estimatedUsage.videos > planLimits.videos_per_month) {
                estimatedCost += (estimatedUsage.videos - planLimits.videos_per_month) * authSystem.overagePricing.videos.price;
            }
            
            estimatedCost += estimatedUsage.extra_users * authSystem.overagePricing.extra_users.price;
            estimatedCost += estimatedUsage.extra_locations * authSystem.overagePricing.extra_locations.price;

            // Audit log billing estimate
            await logger.auditUserAction(
                req.userId,
                'billing_estimate',
                'billing',
                null,
                {
                    currentUsage,
                    proposedChanges: usageData,
                    estimatedCost
                },
                req
            );

            logger.info('Billing estimate calculated', {
                userId: req.userId,
                estimatedCost,
                hasOverages: estimatedCost > 7900
            });

            res.json({
                success: true,
                estimate: {
                    baseCost: 7900,
                    overageCosts: estimatedCost - 7900,
                    totalCost: estimatedCost,
                    currency: 'usd',
                    formatted: `$${(estimatedCost / 100).toFixed(2)}`,
                    period: 'monthly'
                },
                breakdown: {
                    current: currentUsage,
                    estimated: estimatedUsage,
                    limits: planLimits
                },
                timestamp: new Date().toISOString()
            });
        })
    );

    // Error handling middleware for system routes
    router.use((error, req, res, next) => {
        // Log system errors
        logger.error('System route error', error, {
            userId: req.userId,
            path: req.path,
            method: req.method
        });

        // Handle system-specific errors
        if (error.message && error.message.includes('pricing')) {
            return res.status(500).json({
                success: false,
                error: 'Pricing service error',
                message: 'Unable to retrieve pricing information'
            });
        }

        if (error.message && error.message.includes('features')) {
            return res.status(500).json({
                success: false,
                error: 'Features service error',
                message: 'Unable to retrieve user features'
            });
        }

        // Default error response
        res.status(500).json({
            success: false,
            error: 'System error',
            message: error.message || 'An internal system error occurred'
        });
    });

    return router;
};