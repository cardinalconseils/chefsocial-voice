// ChefSocial Enhanced Rate Limiting Service
const rateLimit = require('express-rate-limit');

class ChefSocialRateLimitService {
    constructor(database) {
        this.db = database;
        this.rateLimitStore = new Map();
        this.breachNotifications = new Map();
        this.usagePatterns = new Map();
        
        // Rate limit configurations
        this.limits = {
            user: {
                requests: 100,
                window: 60 * 1000, // 1 minute
                tier: 'user'
            },
            admin: {
                requests: 1000,
                window: 60 * 1000, // 1 minute
                tier: 'admin'
            },
            auth: {
                requests: 5,
                window: 15 * 60 * 1000, // 15 minutes
                endpoint: 'auth'
            },
            voice: {
                requests: 10,
                window: 60 * 1000, // 1 minute
                endpoint: 'voice'
            },
            api: {
                requests: 50,
                window: 60 * 1000, // 1 minute
                endpoint: 'api'
            }
        };

        // Initialize cleanup intervals
        this.startCleanupTasks();
    }

    // Create user-tier rate limiter (100 requests/minute)
    createUserLimiter() {
        return rateLimit({
            windowMs: this.limits.user.window,
            max: this.limits.user.requests,
            keyGenerator: (req) => this.getKeyForUser(req),
            skip: (req) => this.isAdminUser(req),
            message: {
                success: false,
                error: 'Rate limit exceeded',
                message: `Too many requests. Limit: ${this.limits.user.requests} requests per minute for user tier.`,
                retryAfter: Math.ceil(this.limits.user.window / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => this.handleRateLimitBreach(req, res, 'user')
        });
    }

    // Create admin-tier rate limiter (1000 requests/minute)
    createAdminLimiter() {
        return rateLimit({
            windowMs: this.limits.admin.window,
            max: this.limits.admin.requests,
            keyGenerator: (req) => this.getKeyForAdmin(req),
            skip: (req) => !this.isAdminUser(req),
            message: {
                success: false,
                error: 'Admin rate limit exceeded',
                message: `Too many requests. Limit: ${this.limits.admin.requests} requests per minute for admin tier.`,
                retryAfter: Math.ceil(this.limits.admin.window / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => this.handleRateLimitBreach(req, res, 'admin')
        });
    }

    // Create endpoint-specific limiters
    createEndpointLimiter(endpointType) {
        const config = this.limits[endpointType];
        if (!config) {
            throw new Error(`Unknown endpoint type: ${endpointType}`);
        }

        return rateLimit({
            windowMs: config.window,
            max: config.requests,
            keyGenerator: (req) => this.getKeyForEndpoint(req, endpointType),
            message: {
                success: false,
                error: `${endpointType} rate limit exceeded`,
                message: `Too many ${endpointType} requests. Limit: ${config.requests} requests per ${config.window / 1000} seconds.`,
                retryAfter: Math.ceil(config.window / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => this.handleRateLimitBreach(req, res, endpointType)
        });
    }

    // Enhanced middleware with custom headers and monitoring
    createEnhancedLimiter(options = {}) {
        const config = {
            windowMs: options.window || this.limits.user.window,
            max: options.max || this.limits.user.requests,
            keyGenerator: (req) => options.keyGenerator ? options.keyGenerator(req) : this.getKeyForUser(req),
            ...options
        };

        return rateLimit({
            ...config,
            handler: (req, res) => {
                const key = config.keyGenerator(req);
                const limit = config.max;
                const windowMs = config.windowMs;
                const resetTime = new Date(Date.now() + windowMs);

                // Add custom headers
                res.set({
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': Math.ceil(resetTime.getTime() / 1000).toString(),
                    'X-RateLimit-RetryAfter': Math.ceil(windowMs / 1000).toString()
                });

                // Log breach and send notification
                this.handleRateLimitBreach(req, res, options.type || 'custom');
            }
        });
    }

    // Key generation methods
    getKeyForUser(req) {
        if (req.userId) {
            return `user:${req.userId}`;
        }
        return `ip:${req.ip}`;
    }

    getKeyForAdmin(req) {
        if (req.adminId) {
            return `admin:${req.adminId}`;
        }
        if (req.userId && this.isAdminUser(req)) {
            return `admin:${req.userId}`;
        }
        return `admin_ip:${req.ip}`;
    }

    getKeyForEndpoint(req, endpointType) {
        const userKey = this.getKeyForUser(req);
        return `${endpointType}:${userKey}`;
    }

    // Check if user is admin
    isAdminUser(req) {
        return req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');
    }

    // Handle rate limit breaches
    async handleRateLimitBreach(req, res, limitType) {
        const key = this.getKeyForUser(req);
        const timestamp = new Date().toISOString();
        
        // Log the breach
        console.warn(`🚨 Rate limit breach: ${limitType} - Key: ${key} - IP: ${req.ip} - Time: ${timestamp}`);
        
        // Store breach information
        const breachInfo = {
            type: limitType,
            key: key,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: timestamp,
            endpoint: req.originalUrl,
            method: req.method
        };

        // Track usage patterns
        this.trackUsagePattern(key, breachInfo);

        // Send breach notification if threshold reached
        await this.sendBreachNotification(breachInfo);

        // Log to database for audit
        if (this.db) {
            try {
                await this.db.logAuditEvent({
                    userId: req.userId || null,
                    adminId: null,
                    action: 'rate_limit_breach',
                    entityType: 'rate_limit',
                    entityId: key,
                    details: breachInfo,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });
            } catch (error) {
                console.error('❌ Failed to log rate limit breach:', error);
            }
        }

        // Return rate limit response
        res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            message: `Too many requests for ${limitType} tier`,
            retryAfter: Math.ceil(this.limits[limitType]?.window / 1000) || 60,
            limitType: limitType,
            timestamp: timestamp
        });
    }

    // Track when limits are reached
    async onLimitReached(req, res, options, limitType) {
        const key = this.getKeyForUser(req);
        
        console.log(`⚠️ Rate limit reached: ${limitType} - Key: ${key} - IP: ${req.ip}`);
        
        // Add proper headers
        const limit = options.max || this.limits[limitType]?.requests || 100;
        const windowMs = options.windowMs || this.limits[limitType]?.window || 60000;
        const resetTime = new Date(Date.now() + windowMs);

        res.set({
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(resetTime.getTime() / 1000).toString()
        });
    }

    // Track usage patterns for analysis
    trackUsagePattern(key, breachInfo) {
        if (!this.usagePatterns.has(key)) {
            this.usagePatterns.set(key, {
                breaches: [],
                firstBreach: breachInfo.timestamp,
                totalBreaches: 0
            });
        }

        const pattern = this.usagePatterns.get(key);
        pattern.breaches.push(breachInfo);
        pattern.totalBreaches++;
        pattern.lastBreach = breachInfo.timestamp;

        // Keep only last 10 breaches for analysis
        if (pattern.breaches.length > 10) {
            pattern.breaches = pattern.breaches.slice(-10);
        }

        // Analyze patterns
        this.analyzeUsagePattern(key, pattern);
    }

    // Analyze usage patterns for suspicious activity
    analyzeUsagePattern(key, pattern) {
        const now = new Date();
        const recentBreaches = pattern.breaches.filter(breach => {
            const breachTime = new Date(breach.timestamp);
            return (now - breachTime) < (5 * 60 * 1000); // Last 5 minutes
        });

        // Check for suspicious patterns
        if (recentBreaches.length >= 5) {
            console.warn(`🔍 Suspicious activity detected for key: ${key} - ${recentBreaches.length} breaches in 5 minutes`);
            
            // Could implement additional security measures here:
            // - Temporary IP blocking
            // - Account flagging
            // - Enhanced logging
        }

        // Check for distributed attacks (multiple IPs, same pattern)
        const ipAddresses = new Set(recentBreaches.map(breach => breach.ip));
        if (ipAddresses.size > 3 && recentBreaches.length > 8) {
            console.warn(`🚨 Potential distributed attack detected - Multiple IPs targeting key: ${key}`);
        }
    }

    // Send breach notifications
    async sendBreachNotification(breachInfo) {
        const key = breachInfo.key;
        const now = Date.now();
        
        // Check if we've already sent a notification recently
        if (this.breachNotifications.has(key)) {
            const lastNotification = this.breachNotifications.get(key);
            if (now - lastNotification < (10 * 60 * 1000)) { // 10 minutes
                return; // Don't spam notifications
            }
        }

        // Update notification timestamp
        this.breachNotifications.set(key, now);

        // In a production environment, you would send:
        // - Email notifications to admins
        // - Slack/Discord webhooks
        // - SMS alerts for critical breaches
        // - Push notifications to admin dashboard

        console.log(`📧 Breach notification would be sent for: ${JSON.stringify(breachInfo)}`);
    }

    // Get real-time rate limit stats
    getRateLimitStats(key = null) {
        if (key) {
            return {
                usagePattern: this.usagePatterns.get(key) || null,
                lastNotification: this.breachNotifications.get(key) || null
            };
        }

        // Return aggregated stats
        const totalPatterns = this.usagePatterns.size;
        const totalBreaches = Array.from(this.usagePatterns.values())
            .reduce((sum, pattern) => sum + pattern.totalBreaches, 0);
        
        const recentBreaches = Array.from(this.usagePatterns.values())
            .flatMap(pattern => pattern.breaches)
            .filter(breach => {
                const breachTime = new Date(breach.timestamp);
                return (new Date() - breachTime) < (60 * 60 * 1000); // Last hour
            });

        return {
            totalTrackedKeys: totalPatterns,
            totalBreaches: totalBreaches,
            recentBreaches: recentBreaches.length,
            topBreachedKeys: this.getTopBreachedKeys(5)
        };
    }

    // Get top breached keys for monitoring
    getTopBreachedKeys(limit = 10) {
        return Array.from(this.usagePatterns.entries())
            .sort(([,a], [,b]) => b.totalBreaches - a.totalBreaches)
            .slice(0, limit)
            .map(([key, pattern]) => ({
                key,
                totalBreaches: pattern.totalBreaches,
                lastBreach: pattern.lastBreach,
                firstBreach: pattern.firstBreach
            }));
    }

    // Create monitoring dashboard endpoint data
    getMonitoringDashboard() {
        const stats = this.getRateLimitStats();
        const recentPatterns = Array.from(this.usagePatterns.entries())
            .filter(([, pattern]) => {
                const lastBreach = new Date(pattern.lastBreach || pattern.firstBreach);
                return (new Date() - lastBreach) < (24 * 60 * 60 * 1000); // Last 24 hours
            })
            .map(([key, pattern]) => ({
                key,
                ...pattern,
                isActive: (new Date() - new Date(pattern.lastBreach || pattern.firstBreach)) < (60 * 60 * 1000) // Last hour
            }));

        return {
            overview: stats,
            recentActivity: recentPatterns,
            limitsConfig: this.limits,
            alertsConfig: {
                breachThreshold: 5,
                notificationCooldown: 10 * 60 * 1000, // 10 minutes
                suspiciousActivityThreshold: 5
            }
        };
    }

    // Cleanup expired data
    startCleanupTasks() {
        // Clean up old usage patterns every hour
        setInterval(() => {
            this.cleanupOldPatterns();
        }, 60 * 60 * 1000); // 1 hour

        // Clean up old breach notifications every 30 minutes
        setInterval(() => {
            this.cleanupOldNotifications();
        }, 30 * 60 * 1000); // 30 minutes
    }

    cleanupOldPatterns() {
        const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours ago
        
        for (const [key, pattern] of this.usagePatterns.entries()) {
            const lastActivity = new Date(pattern.lastBreach || pattern.firstBreach);
            if (lastActivity < cutoffTime) {
                this.usagePatterns.delete(key);
            }
        }
        
        console.log(`🧹 Cleaned up old usage patterns. Active patterns: ${this.usagePatterns.size}`);
    }

    cleanupOldNotifications() {
        const cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
        
        for (const [key, timestamp] of this.breachNotifications.entries()) {
            if (timestamp < cutoffTime) {
                this.breachNotifications.delete(key);
            }
        }
        
        console.log(`🧹 Cleaned up old breach notifications. Active notifications: ${this.breachNotifications.size}`);
    }

    // Update rate limits dynamically
    updateLimits(limitType, newConfig) {
        if (this.limits[limitType]) {
            this.limits[limitType] = { ...this.limits[limitType], ...newConfig };
            console.log(`✅ Updated rate limits for ${limitType}:`, this.limits[limitType]);
            return true;
        }
        return false;
    }

    // Get current limits configuration
    getCurrentLimits() {
        return { ...this.limits };
    }
}

module.exports = ChefSocialRateLimitService;