// ChefSocial Route Helpers - Shared service management utilities
// This file provides common utilities for handling async service initialization across all route modules

/**
 * Creates service getter helpers for route modules
 * @param {Object} app - Express app instance containing services in app.locals.services
 * @returns {Object} Helper functions for service access
 */
function createServiceHelpers(app) {
    // Helper function to get services (handles async initialization)
    const getServices = () => {
        const services = app.locals.services;
        if (!services.rateLimitService || !services.logger || !services.authSystem) {
            throw new Error('Services not yet initialized');
        }
        return services;
    };

    // Helper function to get rate limiter (created on demand)
    const getRateLimiter = (limiterType) => {
        const { rateLimitService } = getServices();
        return rateLimitService.createEndpointLimiter(limiterType);
    };

    // Middleware wrapper for auth system
    const authMiddleware = () => {
        return (req, res, next) => {
            try {
                const { authSystem } = getServices();
                authSystem.authMiddleware()(req, res, next);
            } catch (error) {
                res.status(503).json({ 
                    success: false, 
                    error: 'Service initializing', 
                    message: error.message 
                });
            }
        };
    };

    // Middleware wrapper for rate limiting
    const rateLimitMiddleware = (limiterType) => {
        return (req, res, next) => {
            try {
                const limiter = getRateLimiter(limiterType);
                limiter(req, res, next);
            } catch (error) {
                res.status(503).json({ 
                    success: false, 
                    error: 'Service initializing', 
                    message: error.message 
                });
            }
        };
    };

    // Combined auth + rate limit middleware
    const authWithRateLimit = (limiterType) => {
        return [
            rateLimitMiddleware(limiterType),
            authMiddleware()
        ];
    };

    return {
        getServices,
        getRateLimiter,
        authMiddleware,
        rateLimitMiddleware,
        authWithRateLimit
    };
}

module.exports = {
    createServiceHelpers
}; 