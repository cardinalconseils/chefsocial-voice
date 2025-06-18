// ChefSocial Voice AI - Authentication Routes
const express = require('express');
const router = express.Router();
const { asyncHandler, validateRequest } = require('../middleware/validation');
const { body } = require('express-validator');

// Authentication routes module - receives services from app.js
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
    const getAuthLimiter = () => {
        const { rateLimitService } = getServices();
        return rateLimitService.createEndpointLimiter('auth');
    };
    
    // Validation schemas
    const registerValidation = validateRequest([
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }),
        body('name').trim().isLength({ min: 2, max: 100 }),
        body('restaurantName').optional().trim().isLength({ max: 200 }),
        body('planName').optional().isIn(['complete']),
        body('paymentMethodId').optional().isString()
    ]);
    
    const loginValidation = validateRequest([
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty()
    ]);
    
    const tokenValidation = validateRequest([
        body('refreshToken').notEmpty().withMessage('Refresh token is required')
    ]);

    // POST /api/auth/register
    router.post('/register', 
        (req, res, next) => {
            try {
                const authLimiter = getAuthLimiter();
                authLimiter(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        registerValidation,
        asyncHandler(async (req, res) => {
            const { authSystem, logger } = getServices();
            const { email, name, password, restaurantName, planName, paymentMethodId } = req.body;

            const result = await authSystem.registerUser({
                email,
                password,
                name,
                restaurantName,
                planName,
                paymentMethodId
            });

            // Audit log successful registration
            await logger.auditUserAction(
                result.user.id,
                'user_register',
                'user',
                result.user.id,
                {
                    email,
                    name,
                    restaurantName,
                    planName: planName || 'complete',
                    hasPaymentMethod: !!paymentMethodId
                },
                req
            );

            logger.info('User registration successful', {
                userId: result.user.id,
                email,
                restaurantName,
                planName: planName || 'complete'
            });

            res.json(result);
        })
    );

    // POST /api/auth/login
    router.post('/login', 
        (req, res, next) => {
            try {
                const authLimiter = getAuthLimiter();
                authLimiter(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        loginValidation,
        asyncHandler(async (req, res) => {
            const { authSystem, logger } = getServices();
            const { email, password } = req.body;
            const clientIP = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            
            const result = await authSystem.loginUser(email, password, clientIP, userAgent);
            
            // Audit log successful login
            await logger.auditUserAction(
                result.user.id,
                'user_login',
                'user',
                result.user.id,
                {
                    email,
                    loginMethod: 'password',
                    sessionCreated: true
                },
                req
            );

            logger.info('User login successful', {
                userId: result.user.id,
                email,
                ipAddress: clientIP,
                userAgent
            });

            res.json(result);
        })
    );

    // POST /api/auth/verify
    router.post('/verify', 
        (req, res, next) => {
            try {
                const { authSystem } = getServices();
                authSystem.authMiddleware()(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        }, 
        (req, res) => {
            res.json({
                success: true,
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    name: req.user.name,
                    restaurantName: req.user.restaurant_name,
                    plan: req.user.plan_name || 'trial'
                }
            });
        }
    );

    // POST /api/auth/refresh
    router.post('/refresh', 
        (req, res, next) => {
            try {
                const authLimiter = getAuthLimiter();
                authLimiter(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        tokenValidation,
        asyncHandler(async (req, res) => {
            const { authSystem } = getServices();
            const { refreshToken } = req.body;

            const tokens = await authSystem.refreshAccessToken(refreshToken);
            
            res.json({
                success: true,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            });
        })
    );

    // POST /api/auth/logout
    router.post('/logout', 
        (req, res, next) => {
            try {
                const authLimiter = getAuthLimiter();
                authLimiter(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        tokenValidation,
        asyncHandler(async (req, res) => {
            const { authSystem } = getServices();
            const { refreshToken } = req.body;

            await authSystem.logoutUser(refreshToken);
            
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        })
    );

    // POST /api/auth/logout-all
    router.post('/logout-all', 
        (req, res, next) => {
            try {
                const { authSystem } = getServices();
                authSystem.authMiddleware()(req, res, next);
            } catch (error) {
                res.status(503).json({ success: false, error: 'Service initializing', message: error.message });
            }
        },
        validateRequest([
            body('exceptCurrent').optional().isBoolean(),
            body('refreshToken').optional().isString()
        ]),
        asyncHandler(async (req, res) => {
            const { authSystem } = getServices();
            const { exceptCurrent } = req.body;
            const currentRefreshToken = exceptCurrent ? req.body.refreshToken : null;
            
            const result = await authSystem.logoutAllDevices(req.userId, currentRefreshToken);
            
            res.json({
                success: true,
                message: `Logged out from ${result.sessionsTerminated} devices`,
                sessionsTerminated: result.sessionsTerminated
            });
        })
    );

    // GET /api/auth/sessions
    router.get('/sessions', 
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
            const sessions = await authSystem.getUserSessions(req.userId);
            
            res.json({
                success: true,
                sessions: sessions,
                total: sessions.length
            });
        })
    );

    // GET /api/auth/security-status
    router.get('/security-status', 
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
            const securityStatus = await authSystem.getSecurityStatus(req.userId);
            
            res.json({
                success: true,
                ...securityStatus
            });
        })
    );

        // Error handling middleware for auth routes
    router.use((error, req, res, next) => {
        try {
            const { logger } = getServices();
            
            // Log authentication errors
            if (error.message && error.message.includes('registration')) {
                logger.logSecurityEvent(
                    'registration_failed',
                    `Registration attempt failed: ${error.message}`,
                    'medium',
                    {
                        email: req.body?.email,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        error: error.message
                    }
                );
            } else if (error.message && error.message.includes('login')) {
                logger.logSecurityEvent(
                    'login_failed',
                    `Login attempt failed: ${error.message}`,
                    'high',
                    {
                        email: req.body?.email,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        error: error.message
                    }
                );
            }
        } catch (serviceError) {
            // If services aren't available, just log to console
            console.error('❌ Auth error (services unavailable):', error.message);
        }

        // Handle authentication-specific errors
        if (error.message && error.message.includes('token')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication failed',
                message: error.message
            });
        }

        if (error.message && error.message.includes('User already exists')) {
            return res.status(409).json({
                success: false,
                error: 'Registration failed',
                message: 'An account with this email already exists'
            });
        }

        if (error.message && error.message.includes('Invalid credentials')) {
            return res.status(401).json({
                success: false,
                error: 'Login failed',
                message: 'Invalid email or password'
            });
        }

        // Default error response
        res.status(500).json({
            success: false,
            error: 'Authentication error',
            message: error.message || 'An authentication error occurred'
        });
    });

    return router;
};