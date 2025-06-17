// ChefSocial Cache Invalidation Strategy
const cacheService = require('./cache-service');

class CacheInvalidationService {
    constructor() {
        this.invalidationMap = new Map();
        this.setupInvalidationStrategies();
    }

    setupInvalidationStrategies() {
        // Define what to invalidate when certain events occur
        this.invalidationMap.set('user_updated', [
            'user:*',
            'features:*',
            'usage:*'
        ]);

        this.invalidationMap.set('user_subscription_changed', [
            'user:*',
            'features:*',
            'api:features:*'
        ]);

        this.invalidationMap.set('feature_access_changed', [
            'features:*',
            'api:features:*'
        ]);

        this.invalidationMap.set('usage_updated', [
            'usage:*',
            'api:usage:*'
        ]);

        this.invalidationMap.set('pricing_updated', [
            'api:pricing:*',
            'api:pricing/*'
        ]);

        this.invalidationMap.set('user_logout', [
            'session:*',
            'user:*',
            'features:*'
        ]);

        this.invalidationMap.set('admin_data_changed', [
            'api:admin:*',
            'analytics:*'
        ]);

        this.invalidationMap.set('language_updated', [
            'api:languages:*'
        ]);
    }

    // Main invalidation method
    async invalidateCache(eventType, userId = null, additionalKeys = []) {
        try {
            const patterns = this.invalidationMap.get(eventType) || [];
            
            for (const pattern of patterns) {
                let finalPattern = pattern;
                
                // Replace * with user ID where appropriate
                if (userId && pattern.includes('*')) {
                    if (pattern.startsWith('user:') || 
                        pattern.startsWith('session:') || 
                        pattern.startsWith('features:') || 
                        pattern.startsWith('usage:')) {
                        finalPattern = pattern.replace('*', userId);
                    }
                }
                
                const invalidatedCount = await cacheService.invalidate(finalPattern);
                console.log(`🗑️ Cache invalidated: ${finalPattern} (${invalidatedCount} keys)`);
            }

            // Handle additional custom keys
            for (const key of additionalKeys) {
                await cacheService.del(key);
                console.log(`🗑️ Cache key deleted: ${key}`);
            }

            return true;
        } catch (error) {
            console.error('❌ Cache invalidation error:', error);
            return false;
        }
    }

    // User-specific invalidation methods
    async invalidateUserData(userId) {
        return await this.invalidateCache('user_updated', userId);
    }

    async invalidateUserSubscription(userId) {
        return await this.invalidateCache('user_subscription_changed', userId);
    }

    async invalidateUserFeatures(userId) {
        return await this.invalidateCache('feature_access_changed', userId);
    }

    async invalidateUserUsage(userId) {
        return await this.invalidateCache('usage_updated', userId);
    }

    async invalidateUserSession(userId) {
        return await this.invalidateCache('user_logout', userId);
    }

    // Global invalidation methods
    async invalidatePricing() {
        return await this.invalidateCache('pricing_updated');
    }

    async invalidateLanguages() {
        return await this.invalidateCache('language_updated');
    }

    async invalidateAdminData() {
        return await this.invalidateCache('admin_data_changed');
    }

    // Scheduled cache cleanup
    async performScheduledCleanup() {
        try {
            console.log('🧹 Starting scheduled cache cleanup...');
            
            // Remove expired keys (Redis handles this automatically, but we can track it)
            const stats = await cacheService.getCacheStats();
            
            if (stats.available) {
                console.log(`📊 Cache status: ${JSON.stringify(stats.keyspace, null, 2)}`);
            }

            // Clean up old session data (older than 7 days)
            const oldSessionPattern = 'session:*';
            // Note: In a real implementation, you'd want to check expiration times
            
            console.log('✅ Scheduled cache cleanup completed');
            return true;
        } catch (error) {
            console.error('❌ Scheduled cache cleanup error:', error);
            return false;
        }
    }

    // Cache warming strategies
    async warmFrequentlyAccessedData() {
        try {
            console.log('🔥 Starting cache warming...');
            
            // This is a placeholder - in a real implementation, you'd warm:
            // 1. Frequently accessed user data
            // 2. Popular API responses
            // 3. Static configuration data
            
            console.log('✅ Cache warming completed');
            return true;
        } catch (error) {
            console.error('❌ Cache warming error:', error);
            return false;
        }
    }

    // Integration with database operations
    createInvalidationHook(eventType) {
        return (userId = null, additionalData = {}) => {
            // Async invalidation to not block the main operation
            setImmediate(async () => {
                await this.invalidateCache(eventType, userId, additionalData.additionalKeys || []);
            });
        };
    }

    // Cache statistics and monitoring
    async getCacheInvalidationStats() {
        try {
            const stats = await cacheService.getCacheStats();
            return {
                ...stats,
                invalidationStrategies: Array.from(this.invalidationMap.keys()),
                lastCleanup: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error getting cache invalidation stats:', error);
            return { error: error.message };
        }
    }

    // Manual cache management
    async flushUserCache(userId) {
        try {
            const patterns = [
                `user:${userId}`,
                `session:${userId}`,
                `features:${userId}`,
                `usage:${userId}`
            ];

            let totalInvalidated = 0;
            for (const pattern of patterns) {
                const count = await cacheService.invalidate(pattern);
                totalInvalidated += count;
            }

            console.log(`🗑️ Flushed all cache for user ${userId}: ${totalInvalidated} keys`);
            return { success: true, keysInvalidated: totalInvalidated };
        } catch (error) {
            console.error('❌ Error flushing user cache:', error);
            return { success: false, error: error.message };
        }
    }

    async flushAllCache() {
        try {
            // This should be used very carefully - only for maintenance
            const result = await cacheService.invalidate('*');
            console.log('🗑️ FULL CACHE FLUSH - ALL KEYS INVALIDATED');
            return { success: true, keysInvalidated: result };
        } catch (error) {
            console.error('❌ Error flushing all cache:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
const cacheInvalidationService = new CacheInvalidationService();

module.exports = cacheInvalidationService;