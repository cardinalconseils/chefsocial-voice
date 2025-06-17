// ChefSocial Voice AI - Rate Limiting Middleware
module.exports = (rateLimitService) => {
    // Create limiters
    const userLimiter = rateLimitService.createUserLimiter();
    const adminLimiter = rateLimitService.createAdminLimiter();
    const authLimiter = rateLimitService.createEndpointLimiter('auth');
    const voiceLimiter = rateLimitService.createEndpointLimiter('voice');
    const apiLimiter = rateLimitService.createEndpointLimiter('api');
    
    return (req, res, next) => {
        // Add rate limit headers to all responses
        res.set({
            'X-RateLimit-Service': 'ChefSocial-API',
            'X-RateLimit-Version': '2.0'
        });
        
        // Apply appropriate rate limiter based on route and user type
        if (req.path.startsWith('/api/auth/')) {
            return authLimiter(req, res, next);
        } else if (req.path.startsWith('/api/voice/') || req.path.startsWith('/api/process-voice')) {
            return voiceLimiter(req, res, next);
        } else if (req.user && rateLimitService.isAdminUser(req)) {
            return adminLimiter(req, res, next);
        } else {
            return userLimiter(req, res, next);
        }
    };
};