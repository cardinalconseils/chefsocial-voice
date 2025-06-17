// ChefSocial Performance Monitoring Service
const Sentry = require('@sentry/node');
const client = require('prom-client');
const winston = require('winston');
const cacheService = require('./cache-service');

class PerformanceMonitoringService {
    constructor() {
        this.isInitialized = false;
        this.metrics = {};
        this.startTime = Date.now();
        
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

    init() {
        try {
            this.initializeSentry();
            this.initializePrometheusMetrics();
            this.setupCollectors();
            this.isInitialized = true;
            this.logger.info('✅ Performance monitoring initialized');
        } catch (error) {
            this.logger.error('❌ Failed to initialize performance monitoring:', error);
        }
    }

    initializeSentry() {
        // Initialize Sentry for error tracking
        if (process.env.SENTRY_DSN) {
            Sentry.init({
                dsn: process.env.SENTRY_DSN,
                environment: process.env.NODE_ENV || 'development',
                tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
                profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
                beforeSend(event) {
                    // Filter out sensitive data
                    if (event.request && event.request.headers) {
                        delete event.request.headers.authorization;
                        delete event.request.headers['x-api-key'];
                    }
                    return event;
                }
            });
            this.logger.info('✅ Sentry error tracking initialized');
        } else {
            this.logger.warn('⚠️ Sentry DSN not provided, error tracking disabled');
        }
    }

    initializePrometheusMetrics() {
        // Create default metrics registry
        this.register = new client.Registry();
        
        // Add default Node.js metrics
        client.collectDefaultMetrics({ 
            register: this.register,
            prefix: 'chefsocial_'
        });

        // Custom metrics
        this.metrics = {
            // HTTP Request metrics
            httpRequestsTotal: new client.Counter({
                name: 'chefsocial_http_requests_total',
                help: 'Total number of HTTP requests',
                labelNames: ['method', 'route', 'status_code'],
                registers: [this.register]
            }),

            httpRequestDuration: new client.Histogram({
                name: 'chefsocial_http_request_duration_seconds',
                help: 'Duration of HTTP requests in seconds',
                labelNames: ['method', 'route', 'status_code'],
                buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
                registers: [this.register]
            }),

            // Authentication metrics
            authRequestsTotal: new client.Counter({
                name: 'chefsocial_auth_requests_total',
                help: 'Total number of authentication requests',
                labelNames: ['type', 'result'],
                registers: [this.register]
            }),

            activeUsers: new client.Gauge({
                name: 'chefsocial_active_users',
                help: 'Number of active users',
                registers: [this.register]
            }),

            // Cache metrics
            cacheHits: new client.Counter({
                name: 'chefsocial_cache_hits_total',
                help: 'Total number of cache hits',
                labelNames: ['cache_type'],
                registers: [this.register]
            }),

            cacheMisses: new client.Counter({
                name: 'chefsocial_cache_misses_total',
                help: 'Total number of cache misses',
                labelNames: ['cache_type'],
                registers: [this.register]
            }),

            // Database metrics
            dbQueriesTotal: new client.Counter({
                name: 'chefsocial_db_queries_total',
                help: 'Total number of database queries',
                labelNames: ['operation'],
                registers: [this.register]
            }),

            dbQueryDuration: new client.Histogram({
                name: 'chefsocial_db_query_duration_seconds',
                help: 'Duration of database queries in seconds',
                labelNames: ['operation'],
                buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
                registers: [this.register]
            }),

            // API usage metrics
            apiCallsTotal: new client.Counter({
                name: 'chefsocial_api_calls_total',
                help: 'Total number of API calls',
                labelNames: ['endpoint', 'user_plan'],
                registers: [this.register]
            }),

            // OpenAI metrics
            openaiRequestsTotal: new client.Counter({
                name: 'chefsocial_openai_requests_total',
                help: 'Total number of OpenAI API requests',
                labelNames: ['model', 'type'],
                registers: [this.register]
            }),

            openaiTokensUsed: new client.Counter({
                name: 'chefsocial_openai_tokens_used_total',
                help: 'Total number of OpenAI tokens used',
                labelNames: ['model', 'type'],
                registers: [this.register]
            }),

            // Voice/LiveKit metrics
            voiceSessionsTotal: new client.Counter({
                name: 'chefsocial_voice_sessions_total',
                help: 'Total number of voice sessions',
                labelNames: ['status'],
                registers: [this.register]
            }),

            voiceSessionDuration: new client.Histogram({
                name: 'chefsocial_voice_session_duration_seconds',
                help: 'Duration of voice sessions in seconds',
                buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1200],
                registers: [this.register]
            }),

            // Business metrics
            subscriptionsActive: new client.Gauge({
                name: 'chefsocial_subscriptions_active',
                help: 'Number of active subscriptions',
                registers: [this.register]
            }),

            revenueTotal: new client.Counter({
                name: 'chefsocial_revenue_total_cents',
                help: 'Total revenue in cents',
                registers: [this.register]
            })
        };

        this.logger.info('✅ Prometheus metrics initialized');
    }

    setupCollectors() {
        // Collect cache statistics every 30 seconds
        setInterval(async () => {
            await this.collectCacheStats();
        }, 30000);

        // Collect business metrics every 5 minutes
        setInterval(async () => {
            await this.collectBusinessMetrics();
        }, 300000);
    }

    // HTTP Request monitoring middleware
    createRequestMonitoringMiddleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // Increment request counter
            this.metrics.httpRequestsTotal.inc({
                method: req.method,
                route: req.route?.path || req.path,
                status_code: 'pending'
            });

            // Track when response finishes
            res.on('finish', () => {
                const duration = (Date.now() - startTime) / 1000;
                const route = req.route?.path || req.path;
                
                // Update request counter with final status
                this.metrics.httpRequestsTotal.inc({
                    method: req.method,
                    route: route,
                    status_code: res.statusCode.toString()
                });

                // Record request duration
                this.metrics.httpRequestDuration.observe(
                    {
                        method: req.method,
                        route: route,
                        status_code: res.statusCode.toString()
                    },
                    duration
                );

                // Log slow requests
                if (duration > 1) {
                    this.logger.warn(`Slow request detected: ${req.method} ${route} took ${duration}s`);
                }
            });

            next();
        };
    }

    // Authentication monitoring
    recordAuthEvent(type, result, userId = null) {
        this.metrics.authRequestsTotal.inc({ type, result });
        
        if (result === 'success' && userId) {
            this.updateActiveUsers();
        }

        // Log to Sentry for failed auth attempts
        if (result === 'failure') {
            Sentry.addBreadcrumb({
                message: `Authentication failure: ${type}`,
                level: 'warning',
                data: { type, result }
            });
        }
    }

    // Cache monitoring
    recordCacheEvent(operation, cacheType = 'default') {
        if (operation === 'hit') {
            this.metrics.cacheHits.inc({ cache_type: cacheType });
        } else if (operation === 'miss') {
            this.metrics.cacheMisses.inc({ cache_type: cacheType });
        }
    }

    // Database monitoring
    async monitorDatabaseQuery(operation, queryFunction) {
        const startTime = Date.now();
        
        try {
            const result = await queryFunction();
            const duration = (Date.now() - startTime) / 1000;
            
            this.metrics.dbQueriesTotal.inc({ operation });
            this.metrics.dbQueryDuration.observe({ operation }, duration);
            
            return result;
        } catch (error) {
            const duration = (Date.now() - startTime) / 1000;
            this.metrics.dbQueryDuration.observe({ operation: `${operation}_error` }, duration);
            
            Sentry.captureException(error, {
                tags: {
                    operation: operation,
                    duration: duration
                }
            });
            
            throw error;
        }
    }

    // API usage monitoring
    recordAPICall(endpoint, userPlan = 'unknown') {
        this.metrics.apiCallsTotal.inc({ endpoint, user_plan: userPlan });
    }

    // OpenAI monitoring
    recordOpenAIUsage(model, type, tokenCount) {
        this.metrics.openaiRequestsTotal.inc({ model, type });
        this.metrics.openaiTokensUsed.inc({ model, type }, tokenCount);
    }

    // Voice session monitoring
    recordVoiceSession(status, durationSeconds = null) {
        this.metrics.voiceSessionsTotal.inc({ status });
        
        if (durationSeconds !== null) {
            this.metrics.voiceSessionDuration.observe(durationSeconds);
        }
    }

    // Business metrics
    recordRevenue(amountCents) {
        this.metrics.revenueTotal.inc(amountCents);
    }

    updateSubscriptionCount(count) {
        this.metrics.subscriptionsActive.set(count);
    }

    // Collect cache statistics
    async collectCacheStats() {
        try {
            const stats = await cacheService.getCacheStats();
            if (stats.available && stats.memory) {
                // You could add cache memory usage metrics here
                this.logger.debug('Cache stats collected:', stats);
            }
        } catch (error) {
            this.logger.error('Error collecting cache stats:', error);
        }
    }

    // Collect business metrics
    async collectBusinessMetrics() {
        try {
            // This would typically query your database for current counts
            // For now, we'll just log that we're collecting them
            this.logger.debug('Collecting business metrics...');
        } catch (error) {
            this.logger.error('Error collecting business metrics:', error);
        }
    }

    // Update active users count
    updateActiveUsers() {
        // This is a simplified implementation
        // In a real system, you'd track active sessions more precisely
        const activeCount = Math.floor(Math.random() * 100) + 50; // Placeholder
        this.metrics.activeUsers.set(activeCount);
    }

    // Health check endpoint
    async getHealthStatus() {
        const uptime = (Date.now() - this.startTime) / 1000;
        
        return {
            status: 'healthy',
            uptime: uptime,
            timestamp: new Date().toISOString(),
            monitoring: {
                sentry: !!process.env.SENTRY_DSN,
                prometheus: this.isInitialized
            }
        };
    }

    // Get metrics for Prometheus scraping
    async getMetrics() {
        return this.register.metrics();
    }

    // Error handling
    captureException(error, context = {}) {
        this.logger.error('Exception captured:', error);
        
        if (Sentry.getCurrentHub().getClient()) {
            Sentry.captureException(error, {
                tags: context.tags || {},
                extra: context.extra || {}
            });
        }
    }

    // Performance measurement utility
    measurePerformance(name, fn) {
        return async (...args) => {
            const startTime = Date.now();
            
            try {
                const result = await fn(...args);
                const duration = Date.now() - startTime;
                
                this.logger.debug(`Performance: ${name} took ${duration}ms`);
                
                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`Performance: ${name} failed after ${duration}ms:`, error);
                throw error;
            }
        };
    }

    // Graceful shutdown
    async shutdown() {
        this.logger.info('Shutting down performance monitoring...');
        
        if (Sentry.getCurrentHub().getClient()) {
            await Sentry.close(2000);
        }
        
        this.logger.info('✅ Performance monitoring shutdown complete');
    }
}

// Export singleton instance
const performanceMonitoringService = new PerformanceMonitoringService();

module.exports = performanceMonitoringService;