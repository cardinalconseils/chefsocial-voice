// ChefSocial Redis Caching Service
const Redis = require('ioredis');
const winston = require('winston');

class CacheService {
    constructor() {
        this.redis = null;
        this.defaultTTL = 3600; // 1 hour
        this.sessionTTL = 86400; // 24 hours
        this.apiCacheTTL = 1800; // 30 minutes
        this.userCacheTTL = 900; // 15 minutes
        
        // Configure logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.simple()
                })
            ]
        });

        this.init();
    }

    async init() {
        try {
            // Redis configuration with fallback
            const redisConfig = {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                db: process.env.REDIS_DB || 0,
                retryDelayOnFailover: 100,
                enableReadyCheck: true,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                keepAlive: 30000,
                connectTimeout: 10000,
                commandTimeout: 5000,
            };

            // Create Redis connection
            this.redis = new Redis(redisConfig);

            // Event handlers
            this.redis.on('connect', () => {
                this.logger.info('✅ Redis connection established');
            });

            this.redis.on('ready', () => {
                this.logger.info('✅ Redis is ready to accept commands');
            });

            this.redis.on('error', (error) => {
                this.logger.error('❌ Redis connection error:', error);
            });

            this.redis.on('close', () => {
                this.logger.warn('⚠️ Redis connection closed');
            });

            this.redis.on('reconnecting', () => {
                this.logger.info('🔄 Redis reconnecting...');
            });

            // Connect to Redis
            await this.redis.connect();
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize Redis cache service:', error);
            // Continue without Redis (graceful degradation)
            this.redis = null;
        }
    }

    // Check if Redis is available
    isAvailable() {
        return this.redis && this.redis.status === 'ready';
    }

    // Generic cache operations
    async get(key) {
        if (!this.isAvailable()) {
            this.logger.warn('Redis not available, cache miss for key:', key);
            return null;
        }

        try {
            const data = await this.redis.get(key);
            if (data) {
                this.logger.debug('Cache hit for key:', key);
                return JSON.parse(data);
            }
            this.logger.debug('Cache miss for key:', key);
            return null;
        } catch (error) {
            this.logger.error('Cache get error for key:', key, error);
            return null;
        }
    }

    async set(key, value, ttl = this.defaultTTL) {
        if (!this.isAvailable()) {
            this.logger.warn('Redis not available, skipping cache set for key:', key);
            return false;
        }

        try {
            await this.redis.setex(key, ttl, JSON.stringify(value));
            this.logger.debug('Cache set for key:', key, 'TTL:', ttl);
            return true;
        } catch (error) {
            this.logger.error('Cache set error for key:', key, error);
            return false;
        }
    }

    async del(key) {
        if (!this.isAvailable()) {
            return false;
        }

        try {
            const result = await this.redis.del(key);
            this.logger.debug('Cache delete for key:', key, 'Result:', result);
            return result > 0;
        } catch (error) {
            this.logger.error('Cache delete error for key:', key, error);
            return false;
        }
    }

    async invalidate(pattern) {
        if (!this.isAvailable()) {
            return false;
        }

        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
                this.logger.info('Cache invalidated for pattern:', pattern, 'Keys:', keys.length);
                return keys.length;
            }
            return 0;
        } catch (error) {
            this.logger.error('Cache invalidation error for pattern:', pattern, error);
            return false;
        }
    }

    // Authentication session caching
    async storeSession(userId, sessionData, deviceInfo = null) {
        const key = `session:${userId}`;
        const enrichedSessionData = {
            ...sessionData,
            deviceInfo,
            lastAccessed: new Date().toISOString(),
            accessCount: 1
        };

        return await this.set(key, enrichedSessionData, this.sessionTTL);
    }

    async getSession(userId) {
        const key = `session:${userId}`;
        const sessionData = await this.get(key);
        
        if (sessionData) {
            // Update access tracking
            sessionData.lastAccessed = new Date().toISOString();
            sessionData.accessCount = (sessionData.accessCount || 0) + 1;
            await this.set(key, sessionData, this.sessionTTL);
        }
        
        return sessionData;
    }

    async invalidateSession(userId) {
        const key = `session:${userId}`;
        return await this.del(key);
    }

    async invalidateAllUserSessions(userId) {
        const pattern = `session:${userId}*`;
        return await this.invalidate(pattern);
    }

    // User data caching
    async cacheUser(userId, userData) {
        const key = `user:${userId}`;
        return await this.set(key, userData, this.userCacheTTL);
    }

    async getCachedUser(userId) {
        const key = `user:${userId}`;
        return await this.get(key);
    }

    async invalidateUser(userId) {
        const key = `user:${userId}`;
        return await this.del(key);
    }

    // API response caching
    async cacheAPIResponse(endpoint, params, data, customTTL = null) {
        // Create a unique key based on endpoint and parameters
        const paramHash = this.hashObject(params);
        const key = `api:${endpoint}:${paramHash}`;
        const ttl = customTTL || this.apiCacheTTL;
        
        const responseData = {
            data: data,
            cachedAt: new Date().toISOString(),
            endpoint: endpoint,
            params: params
        };

        return await this.set(key, responseData, ttl);
    }

    async getCachedAPIResponse(endpoint, params) {
        const paramHash = this.hashObject(params);
        const key = `api:${endpoint}:${paramHash}`;
        const cachedResponse = await this.get(key);
        
        if (cachedResponse) {
            this.logger.debug('API cache hit for endpoint:', endpoint);
            return cachedResponse.data;
        }
        
        this.logger.debug('API cache miss for endpoint:', endpoint);
        return null;
    }

    async invalidateAPICache(endpoint = null) {
        const pattern = endpoint ? `api:${endpoint}:*` : 'api:*';
        return await this.invalidate(pattern);
    }

    // Feature access caching
    async cacheUserFeatures(userId, features) {
        const key = `features:${userId}`;
        return await this.set(key, features, this.userCacheTTL);
    }

    async getCachedUserFeatures(userId) {
        const key = `features:${userId}`;
        return await this.get(key);
    }

    async invalidateUserFeatures(userId) {
        const key = `features:${userId}`;
        return await this.del(key);
    }

    // Usage tracking caching
    async cacheUsageData(userId, usageData) {
        const key = `usage:${userId}`;
        return await this.set(key, usageData, this.userCacheTTL);
    }

    async getCachedUsageData(userId) {
        const key = `usage:${userId}`;
        return await this.get(key);
    }

    async invalidateUsageData(userId) {
        const key = `usage:${userId}`;
        return await this.del(key);
    }

    // Analytics caching
    async cacheAnalyticsData(type, period, data) {
        const key = `analytics:${type}:${period}`;
        return await this.set(key, data, 600); // 10 minutes for analytics
    }

    async getCachedAnalyticsData(type, period) {
        const key = `analytics:${type}:${period}`;
        return await this.get(key);
    }

    // Cache statistics and monitoring
    async getCacheStats() {
        if (!this.isAvailable()) {
            return { available: false };
        }

        try {
            const info = await this.redis.info('memory');
            const keyspace = await this.redis.info('keyspace');
            
            return {
                available: true,
                memory: this.parseRedisInfo(info),
                keyspace: this.parseRedisInfo(keyspace),
                connection: {
                    status: this.redis.status,
                    host: this.redis.options.host,
                    port: this.redis.options.port,
                    db: this.redis.options.db
                }
            };
        } catch (error) {
            this.logger.error('Error getting cache stats:', error);
            return { available: false, error: error.message };
        }
    }

    // Utility methods
    hashObject(obj) {
        const crypto = require('crypto');
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        return crypto.createHash('md5').update(str).digest('hex');
    }

    parseRedisInfo(infoString) {
        const result = {};
        infoString.split('\r\n').forEach(line => {
            if (line && !line.startsWith('#')) {
                const [key, value] = line.split(':');
                if (key && value !== undefined) {
                    result[key] = value;
                }
            }
        });
        return result;
    }

    // Cache warming methods
    async warmCache() {
        this.logger.info('Starting cache warming...');
        
        try {
            // Warm up frequently accessed data
            // This can be customized based on your application's needs
            
            this.logger.info('Cache warming completed');
        } catch (error) {
            this.logger.error('Cache warming failed:', error);
        }
    }

    // Graceful shutdown
    async close() {
        if (this.redis) {
            try {
                await this.redis.disconnect();
                this.logger.info('✅ Redis cache service disconnected gracefully');
            } catch (error) {
                this.logger.error('❌ Error disconnecting Redis:', error);
            }
        }
    }
}

// Export singleton instance
const cacheService = new CacheService();

module.exports = cacheService;