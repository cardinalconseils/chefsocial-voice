// ChefSocial Voice AI - Authentication Middleware
module.exports = (authSystem) => {
    return {
        // Standard authentication middleware
        required: authSystem.authMiddleware(),
        
        // Optional authentication (sets req.user if token present)
        optional: async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return next(); // No token, continue without authentication
                }

                const token = authHeader.substring(7);
                let userId;
                
                // Try to verify as access token first, fall back to legacy JWT
                try {
                    userId = authSystem.verifyAccessToken(token);
                } catch (error) {
                    userId = authSystem.verifyJWT(token);
                }
                
                const user = await authSystem.db.getUserById(userId);
                if (user) {
                    req.user = user;
                    req.userId = userId;
                }
                
                next();
            } catch (error) {
                // Invalid token, but optional auth, so continue without user
                next();
            }
        },
        
        // Admin authentication middleware
        admin: async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return res.status(401).json({ error: 'Admin access token required' });
                }

                const token = authHeader.substring(7);
                const userId = authSystem.verifyAccessToken(token);
                
                const user = await authSystem.db.getUserById(userId);
                if (!user) {
                    return res.status(401).json({ error: 'User not found' });
                }

                // Check admin role
                if (user.role !== 'admin') {
                    return res.status(403).json({ error: 'Admin access required' });
                }

                req.user = user;
                req.userId = userId;
                req.adminId = userId;
                next();

            } catch (error) {
                return res.status(401).json({ error: 'Invalid or expired admin token' });
            }
        },
        
        // Feature access middleware factory
        featureAccess: (featureKey) => {
            return authSystem.featureAccessMiddleware(featureKey);
        }
    };
};