// ChefSocial Voice AI - User Management Routes
const express = require('express');
const router = express.Router();
const { asyncHandler, validateRequest } = require('../middleware/validation');
const { body, query } = require('express-validator');

// User management routes module - receives services from app.js
module.exports = (app) => {
    // Helper function to get services (handles async initialization)
    const getServices = () => {
        const services = app.locals.services;
        if (!services.rateLimitService || !services.logger) {
            throw new Error('Services not yet initialized');
        }
        return services;
    };
    
    // Helper function to get rate limiter (created on demand)
    const getUserLimiter = () => {
        const { rateLimitService } = getServices();
        return rateLimitService.createEndpointLimiter('user');
    };
    
    // Validation schemas
    const profileUpdateValidation = validateRequest([
        body('name').optional().trim().isLength({ min: 2, max: 100 }),
        body('restaurantName').optional().trim().isLength({ min: 2, max: 200 }),
        body('cuisineType').optional().trim().isLength({ max: 100 }),
        body('location').optional().trim().isLength({ max: 200 }),
        body('phone').optional().trim().isMobilePhone()
    ]);
    
    const languageValidation = validateRequest([
        body('language').isIn(['en', 'fr']).withMessage('Language must be en or fr')
    ]);
    
    const subscriptionValidation = validateRequest([
        body('action').isIn(['cancel', 'reactivate', 'update_payment_method']).withMessage('Invalid action'),
        body('paymentMethodId').optional().isString()
    ]);

    // GET /api/user/profile
    router.get('/profile', 
        (req, res, next) => {
            try {
                const { authSystem } = getServices();
                authSystem.authMiddleware()(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        asyncHandler(async (req, res) => {
            const { authSystem } = getServices();
            const user = await authSystem.db.getUserById(req.userId);
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }

            // Return user profile without sensitive data
            res.json({
                success: true,
                profile: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    restaurantName: user.restaurant_name,
                    cuisineType: user.cuisine_type,
                    location: user.location,
                    phone: user.phone,
                    createdAt: user.created_at,
                    lastLogin: user.last_login,
                    plan: user.plan_name || 'trial'
                }
            });
        })
    );

    // PUT /api/user/profile
    router.put('/profile', 
        (req, res, next) => {
            try {
                const { authSystem } = getServices();
                authSystem.authMiddleware()(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        }, 
        profileUpdateValidation,
        asyncHandler(async (req, res) => {
            const { authSystem, logger } = getServices();
            const { name, restaurantName, cuisineType, location, phone } = req.body;
            
            // Update user profile
            await authSystem.db.db.run(`
                UPDATE users 
                SET name = ?, restaurant_name = ?, cuisine_type = ?, location = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [name, restaurantName, cuisineType, location, phone, req.userId]);

            // Get updated user data
            const updatedUser = await authSystem.db.getUserById(req.userId);
            
            // Audit log profile update
            await logger.auditUserAction(
                req.userId,
                'profile_update',
                'user',
                req.userId,
                {
                    name,
                    restaurantName,
                    cuisineType,
                    location,
                    phone
                },
                req
            );

            logger.info('User profile updated', {
                userId: req.userId,
                changes: { name, restaurantName, cuisineType, location, phone }
            });
            
            res.json({
                success: true,
                message: 'Profile updated successfully',
                profile: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    name: updatedUser.name,
                    restaurantName: updatedUser.restaurant_name,
                    cuisineType: updatedUser.cuisine_type,
                    location: updatedUser.location,
                    phone: updatedUser.phone
                }
            });
        })
    );

    // GET /api/user/usage-dashboard
    router.get('/usage-dashboard', 
        (req, res, next) => {
            try {
                const { authSystem } = getServices();
                authSystem.authMiddleware()(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        asyncHandler(async (req, res) => {
            const { authSystem } = getServices();
            // Get current usage for the month
            const currentUsage = await authSystem.db.getCurrentUsage(req.user.id);
            
            // Get plan limits
            const planLimits = authSystem.pricingPlan.complete.limits;
            
            // Calculate usage statistics
            const usageStats = {
                voice_minutes: {
                    used: currentUsage.voice_minutes_used || 0,
                    limit: planLimits.voice_minutes_per_month,
                    percentage: Math.round(((currentUsage.voice_minutes_used || 0) / planLimits.voice_minutes_per_month) * 100),
                    overage: Math.max(0, (currentUsage.voice_minutes_used || 0) - planLimits.voice_minutes_per_month)
                },
                images: {
                    used: currentUsage.images_generated || 0,
                    limit: planLimits.images_per_month,
                    percentage: Math.round(((currentUsage.images_generated || 0) / planLimits.images_per_month) * 100),
                    overage: Math.max(0, (currentUsage.images_generated || 0) - planLimits.images_per_month)
                },
                videos: {
                    used: currentUsage.videos_created || 0,
                    limit: planLimits.videos_per_month,
                    percentage: Math.round(((currentUsage.videos_created || 0) / planLimits.videos_per_month) * 100),
                    overage: Math.max(0, (currentUsage.videos_created || 0) - planLimits.videos_per_month)
                },
                api_calls: {
                    used: currentUsage.api_calls_made || 0,
                    limit: planLimits.api_calls_per_month,
                    percentage: Math.round(((currentUsage.api_calls_made || 0) / planLimits.api_calls_per_month) * 100),
                    overage: Math.max(0, (currentUsage.api_calls_made || 0) - planLimits.api_calls_per_month)
                }
            };
            
            // Get usage history for trends (last 6 months)
            const usageHistory = await authSystem.db.getUsageStats(req.user.id, 6);
            
            // Calculate cost estimate for current month
            let estimatedCost = 7900; // Base plan cost in cents
            
            // Add overage costs
            estimatedCost += usageStats.voice_minutes.overage * authSystem.overagePricing.voice_minutes.price;
            estimatedCost += usageStats.images.overage * authSystem.overagePricing.images.price;
            estimatedCost += usageStats.videos.overage * authSystem.overagePricing.videos.price;
            
            // Add extra users and locations if any
            estimatedCost += (currentUsage.extra_users || 0) * authSystem.overagePricing.extra_users.price;
            estimatedCost += (currentUsage.extra_locations || 0) * authSystem.overagePricing.extra_locations.price;
            
            res.json({
                success: true,
                dashboard: {
                    currentPeriod: new Date().toISOString().substring(0, 7), // YYYY-MM
                    planName: 'ChefSocial Complete',
                    usageStats: usageStats,
                    estimatedCost: {
                        amount: estimatedCost,
                        currency: 'usd',
                        formatted: `$${(estimatedCost / 100).toFixed(2)}`
                    },
                    usageHistory: usageHistory,
                    lastUpdated: new Date().toISOString()
                }
            });
        })
    );

    // GET /api/user/billing-history
    router.get('/billing-history', 
        (req, res, next) => {
            try {
                const { authSystem } = getServices();
                authSystem.authMiddleware()(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        asyncHandler(async (req, res) => {
            const { authSystem } = getServices();
            const { limit = 12 } = req.query;
            const user = await authSystem.db.getUserById(req.user.id);
            
            if (!user || !user.stripe_customer_id) {
                return res.json({
                    success: true,
                    billingHistory: [],
                    message: 'No billing history available'
                });
            }
            
            // Get Stripe invoices for this customer
            const invoices = await authSystem.stripe.invoices.list({
                customer: user.stripe_customer_id,
                limit: parseInt(limit),
                expand: ['data.subscription', 'data.payment_intent']
            });
            
            // Transform Stripe invoices into billing history format
            const billingHistory = invoices.data.map(invoice => ({
                id: invoice.id,
                date: new Date(invoice.created * 1000).toISOString(),
                amount: invoice.amount_paid,
                currency: invoice.currency,
                status: invoice.status,
                description: invoice.description || 'ChefSocial Complete Plan',
                pdfUrl: invoice.invoice_pdf,
                paymentMethod: invoice.payment_intent?.payment_method_types?.[0] || 'card'
            }));
            
            res.json({
                success: true,
                billingHistory: billingHistory,
                total: billingHistory.length
            });
        })
    );

    // PUT /api/user/subscription
    router.put('/subscription', 
        (req, res, next) => {
            try {
                const { authSystem } = getServices();
                authSystem.authMiddleware()(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        subscriptionValidation,
        asyncHandler(async (req, res) => {
            const { authSystem } = getServices();
            const { action, paymentMethodId } = req.body;
            const user = await authSystem.db.getUserById(req.user.id);
            
            if (!user || !user.stripe_customer_id) {
                return res.status(400).json({
                    success: false,
                    error: 'No subscription found'
                });
            }
            
            let result = {};
            
            switch (action) {
                case 'cancel':
                    // Cancel subscription at period end
                    const subscriptions = await authSystem.stripe.subscriptions.list({
                        customer: user.stripe_customer_id,
                        status: 'active'
                    });
                    
                    if (subscriptions.data.length === 0) {
                        return res.status(400).json({
                            success: false,
                            error: 'No active subscription found'
                        });
                    }
                    
                    const canceledSub = await authSystem.stripe.subscriptions.update(
                        subscriptions.data[0].id,
                        { cancel_at_period_end: true }
                    );
                    
                    // Update in database
                    await authSystem.db.updateSubscription(canceledSub.id, {
                        cancelAtPeriodEnd: true,
                        status: canceledSub.status
                    });
                    
                    result = {
                        action: 'canceled',
                        effectiveDate: new Date(canceledSub.current_period_end * 1000).toISOString(),
                        message: 'Subscription will be canceled at the end of the current billing period'
                    };
                    break;
                    
                case 'reactivate':
                    // Reactivate a canceled subscription
                    const canceledSubs = await authSystem.stripe.subscriptions.list({
                        customer: user.stripe_customer_id,
                        status: 'active'
                    });
                    
                    if (canceledSubs.data.length === 0) {
                        return res.status(400).json({
                            success: false,
                            error: 'No subscription to reactivate'
                        });
                    }
                    
                    const reactivatedSub = await authSystem.stripe.subscriptions.update(
                        canceledSubs.data[0].id,
                        { cancel_at_period_end: false }
                    );
                    
                    // Update in database
                    await authSystem.db.updateSubscription(reactivatedSub.id, {
                        cancelAtPeriodEnd: false,
                        status: reactivatedSub.status
                    });
                    
                    result = {
                        action: 'reactivated',
                        message: 'Subscription has been reactivated'
                    };
                    break;
                    
                case 'update_payment_method':
                    if (!paymentMethodId) {
                        return res.status(400).json({
                            success: false,
                            error: 'Payment method ID required'
                        });
                    }
                    
                    // Attach new payment method
                    await authSystem.stripe.paymentMethods.attach(paymentMethodId, {
                        customer: user.stripe_customer_id
                    });
                    
                    // Set as default payment method
                    await authSystem.stripe.customers.update(user.stripe_customer_id, {
                        invoice_settings: {
                            default_payment_method: paymentMethodId
                        }
                    });
                    
                    result = {
                        action: 'payment_method_updated',
                        message: 'Payment method updated successfully'
                    };
                    break;
                    
                default:
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid action. Supported actions: cancel, reactivate, update_payment_method'
                    });
            }
            
            // Audit log subscription change
            await logger.auditUserAction(
                req.userId,
                'subscription_update',
                'subscription',
                user.stripe_customer_id,
                {
                    action,
                    paymentMethodId: paymentMethodId ? 'updated' : 'not_changed'
                },
                req
            );

            logger.info('Subscription updated', {
                userId: req.userId,
                action,
                result
            });
            
            res.json({
                success: true,
                result: result
            });
        })
    );

    // POST /api/user/billing-portal
    router.post('/billing-portal', 
        (req, res, next) => {
            try {
                const { authSystem } = getServices();
                authSystem.authMiddleware()(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        asyncHandler(async (req, res) => {
            const { authSystem, logger } = getServices();
            const user = await authSystem.db.getUserById(req.user.id);
            
            if (!user || !user.stripe_customer_id) {
                return res.status(400).json({
                    success: false,
                    error: 'No billing account found'
                });
            }
            
            const session = await authSystem.stripe.billingPortal.sessions.create({
                customer: user.stripe_customer_id,
                return_url: `${process.env.BASE_URL || 'http://localhost:3001'}/dashboard`
            });
            
            // Audit log billing portal access
            await logger.auditUserAction(
                req.userId,
                'billing_portal_access',
                'user',
                req.userId,
                {
                    sessionId: session.id,
                    returnUrl: session.return_url
                },
                req
            );

            logger.info('Billing portal accessed', {
                userId: req.userId,
                sessionId: session.id
            });
            
            res.json({
                success: true,
                portalUrl: session.url
            });
        })
    );

    // POST /api/user/logout
    router.post('/logout', 
        (req, res, next) => {
            try {
                const { authSystem } = getServices();
                authSystem.authMiddleware()(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        asyncHandler(async (req, res) => {
            // Note: This is a legacy endpoint, actual logout is handled in auth routes
            // Keeping for backward compatibility
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        })
    );

    // DELETE /api/user/account
    router.delete('/account', 
        (req, res, next) => {
            try {
                const { authSystem } = getServices();
                authSystem.authMiddleware()(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        asyncHandler(async (req, res) => {
            const { authSystem, logger } = getServices();
            // Cancel subscription if active
            const user = await authSystem.db.getUserById(req.userId);
            if (user.stripe_customer_id) {
                // Cancel Stripe subscription
                const subscriptions = await authSystem.stripe.subscriptions.list({
                    customer: user.stripe_customer_id,
                    status: 'active'
                });

                for (const subscription of subscriptions.data) {
                    await authSystem.stripe.subscriptions.cancel(subscription.id);
                }
            }

            // Soft delete user account (mark as deleted)
            await authSystem.db.db.run(`
                UPDATE users 
                SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [req.userId]);

            // Audit log account deletion
            await logger.auditUserAction(
                req.userId,
                'account_delete',
                'user',
                req.userId,
                {
                    softDelete: true,
                    subscriptionsCanceled: user.stripe_customer_id ? 'yes' : 'no'
                },
                req
            );

            logger.info('User account deleted', {
                userId: req.userId,
                email: user.email
            });

            res.json({
                success: true,
                message: 'Account deleted successfully'
            });
        })
    );

    // POST /api/user/language
    router.post('/language', 
        (req, res, next) => {
            try {
                const { authSystem } = getServices();
                authSystem.authMiddleware()(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        languageValidation,
        asyncHandler(async (req, res) => {
            const { authSystem, logger } = getServices();
            const { language } = req.body;

            // Update user's preferred language in database
            await authSystem.db.db.run(`
                UPDATE users 
                SET preferred_language = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [language, req.userId]);

            // Audit log language change
            await logger.auditUserAction(
                req.userId,
                'language_update',
                'user',
                req.userId,
                { language },
                req
            );

            logger.info('User language updated', {
                userId: req.userId,
                language
            });

            res.json({
                success: true,
                message: 'Language updated successfully',
                language: language
            });
        })
    );

    // GET /api/user/rate-limits/status
    router.get('/rate-limits/status', 
        (req, res, next) => {
            try {
                const { authSystem } = getServices();
                authSystem.authMiddleware()(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        asyncHandler(async (req, res) => {
            const { rateLimitService } = getServices();
            const limits = await rateLimitService.getUserLimits(req.userId);
            
            res.json({
                success: true,
                rateLimits: limits,
                timestamp: new Date().toISOString()
            });
        })
    );

    // Error handling middleware for user routes
    router.use((error, req, res, next) => {
        try {
            const { logger } = getServices();
            // Log user management errors
            if (error.message && error.message.includes('Stripe')) {
                logger.logSecurityEvent(
                'stripe_error',
                `Stripe operation failed: ${error.message}`,
                'medium',
                {
                    userId: req.userId,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    error: error.message
                }
            );
            }
        } catch (serviceError) {
            // If services aren't available, just log to console
            console.error('❌ User error (services unavailable):', error.message);
        }

        // Handle user-specific errors
        if (error.message && error.message.includes('subscription')) {
            return res.status(400).json({
                success: false,
                error: 'Subscription management error',
                message: error.message
            });
        }

        if (error.message && error.message.includes('billing')) {
            return res.status(400).json({
                success: false,
                error: 'Billing error',
                message: error.message
            });
        }

        if (error.message && error.message.includes('profile')) {
            return res.status(400).json({
                success: false,
                error: 'Profile update error',
                message: error.message
            });
        }

        // Default error response
        res.status(500).json({
            success: false,
            error: 'User management error',
            message: error.message || 'An error occurred while processing your request'
        });
    });

    return router;
};