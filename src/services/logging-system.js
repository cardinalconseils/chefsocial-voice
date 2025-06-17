// ChefSocial Enhanced Logging System
// Professional logging with audit trails, monitoring, and alerting
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class ChefSocialLogger {
    constructor(database = null) {
        this.db = database;
        this.logDir = path.join(__dirname, 'logs');
        this.alerts = new Map(); // In-memory alert tracking
        this.performanceMetrics = new Map(); // Performance tracking
        this.securityEvents = [];
        
        // Ensure logs directory exists
        this.ensureLogDirectory();
        
        // Initialize Winston logger
        this.initializeLogger();
        
        // Start log monitoring
        this.startLogMonitoring();
        
        // Initialize alert thresholds
        this.initializeAlertThresholds();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
            console.log('✅ Created logs directory');
        }
    }

    initializeLogger() {
        // Custom format for structured logging
        const customFormat = winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            winston.format.errors({ stack: true }),
            winston.format.json(),
            winston.format.printf(({ timestamp, level, message, service, userId, adminId, action, metadata, stack, ...meta }) => {
                const logEntry = {
                    timestamp,
                    level: level.toUpperCase(),
                    message,
                    service: service || 'chefsocial',
                    correlationId: this.generateCorrelationId(),
                    ...meta
                };

                // Add user context if available
                if (userId) logEntry.userId = userId;
                if (adminId) logEntry.adminId = adminId;
                if (action) logEntry.action = action;
                if (metadata) logEntry.metadata = metadata;
                if (stack) logEntry.stack = stack;

                return JSON.stringify(logEntry);
            })
        );

        // Create Winston logger with multiple transports
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: customFormat,
            defaultMeta: { 
                service: 'chefsocial',
                environment: process.env.NODE_ENV || 'development'
            },
            transports: [
                // Console output with colors for development
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple(),
                        winston.format.printf(({ timestamp, level, message, service, userId, action }) => {
                            let logLine = `${timestamp} [${level}] ${message}`;
                            if (userId && action) {
                                logLine += ` | User: ${userId} | Action: ${action}`;
                            }
                            return logLine;
                        })
                    )
                }),

                // Application logs with rotation
                new winston.transports.File({
                    filename: path.join(this.logDir, 'application.log'),
                    maxsize: 50 * 1024 * 1024, // 50MB
                    maxFiles: 10,
                    tailable: true
                }),

                // Error logs separate file
                new winston.transports.File({
                    filename: path.join(this.logDir, 'error.log'),
                    level: 'error',
                    maxsize: 20 * 1024 * 1024, // 20MB
                    maxFiles: 5,
                    tailable: true
                }),

                // Audit logs separate file
                new winston.transports.File({
                    filename: path.join(this.logDir, 'audit.log'),
                    level: 'info',
                    maxsize: 100 * 1024 * 1024, // 100MB
                    maxFiles: 20,
                    tailable: true,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    )
                }),

                // Security events separate file
                new winston.transports.File({
                    filename: path.join(this.logDir, 'security.log'),
                    level: 'warn',
                    maxsize: 50 * 1024 * 1024, // 50MB
                    maxFiles: 15,
                    tailable: true
                })
            ],

            // Handle uncaught exceptions and rejections
            exceptionHandlers: [
                new winston.transports.File({
                    filename: path.join(this.logDir, 'exceptions.log'),
                    maxsize: 10 * 1024 * 1024,
                    maxFiles: 3
                })
            ],
            rejectionHandlers: [
                new winston.transports.File({
                    filename: path.join(this.logDir, 'rejections.log'),
                    maxsize: 10 * 1024 * 1024,
                    maxFiles: 3
                })
            ]
        });

        console.log('✅ ChefSocial logging system initialized');
    }

    initializeAlertThresholds() {
        this.alertThresholds = {
            errorRate: {
                threshold: 10, // errors per minute
                window: 60000, // 1 minute
                cooldown: 300000 // 5 minutes between alerts
            },
            failedLogins: {
                threshold: 20, // failed attempts per minute
                window: 60000,
                cooldown: 300000
            },
            apiErrors: {
                threshold: 50, // API errors per minute
                window: 60000,
                cooldown: 600000 // 10 minutes
            },
            performanceDegradation: {
                threshold: 5000, // response time > 5 seconds
                consecutiveCount: 5,
                cooldown: 300000
            }
        };
    }

    generateCorrelationId() {
        return uuidv4().substr(0, 8);
    }

    // Enhanced logging methods with context
    info(message, context = {}) {
        this.logger.info(message, context);
        this.trackPerformanceMetrics('info', context);
    }

    warn(message, context = {}) {
        this.logger.warn(message, context);
        this.trackSecurityEvent('warning', message, context);
        this.checkAlertThresholds('warning', context);
    }

    error(message, error = null, context = {}) {
        const errorContext = {
            ...context,
            stack: error?.stack,
            errorMessage: error?.message,
            errorCode: error?.code
        };
        
        this.logger.error(message, errorContext);
        this.trackSecurityEvent('error', message, errorContext);
        this.checkAlertThresholds('error', errorContext);
        
        // Store critical errors in database
        if (this.db && (context.severity === 'critical' || context.level === 'critical')) {
            this.logCriticalError(message, error, context);
        }
    }

    debug(message, context = {}) {
        this.logger.debug(message, context);
    }

    // Audit logging methods
    async auditUserAction(userId, action, entityType = null, entityId = null, details = {}, req = null) {
        const auditData = {
            userId,
            action,
            entityType,
            entityId,
            details: JSON.stringify(details),
            ipAddress: req?.ip || req?.connection?.remoteAddress,
            userAgent: req?.get('User-Agent'),
            timestamp: new Date().toISOString(),
            severity: 'info'
        };

        // Log to Winston
        this.logger.info(`User Action: ${action}`, {
            ...auditData,
            logType: 'audit',
            category: 'user_action'
        });

        // Store in database if available
        if (this.db) {
            try {
                await this.db.logAuditEvent({
                    userId,
                    adminId: null,
                    action,
                    entityType,
                    entityId,
                    details,
                    ipAddress: auditData.ipAddress,
                    userAgent: auditData.userAgent
                });
            } catch (error) {
                this.error('Failed to store audit event in database', error, { auditData });
            }
        }

        return auditData;
    }

    async auditAdminAction(adminId, action, entityType = null, entityId = null, details = {}, req = null) {
        const auditData = {
            adminId,
            action,
            entityType,
            entityId,
            details: JSON.stringify(details),
            ipAddress: req?.ip || req?.connection?.remoteAddress,
            userAgent: req?.get('User-Agent'),
            timestamp: new Date().toISOString(),
            severity: 'warn'
        };

        // Log to Winston with high priority
        this.logger.warn(`Admin Action: ${action}`, {
            ...auditData,
            logType: 'audit',
            category: 'admin_action',
            priority: 'high'
        });

        // Store in database
        if (this.db) {
            try {
                await this.db.logAuditEvent({
                    userId: null,
                    adminId,
                    action,
                    entityType,
                    entityId,
                    details,
                    ipAddress: auditData.ipAddress,
                    userAgent: auditData.userAgent
                });
            } catch (error) {
                this.error('Failed to store admin audit event in database', error, { auditData });
            }
        }

        return auditData;
    }

    auditSystemStateChange(component, oldState, newState, triggeredBy = 'system', details = {}) {
        const stateChangeData = {
            component,
            oldState: JSON.stringify(oldState),
            newState: JSON.stringify(newState),
            triggeredBy,
            details: JSON.stringify(details),
            timestamp: new Date().toISOString()
        };

        this.logger.info(`System State Change: ${component}`, {
            ...stateChangeData,
            logType: 'audit',
            category: 'system_state',
            severity: 'info'
        });

        return stateChangeData;
    }

    // Security event logging
    logSecurityEvent(eventType, description, severity = 'medium', context = {}) {
        const securityEvent = {
            eventType,
            description,
            severity,
            timestamp: new Date().toISOString(),
            ...context
        };

        // Log based on severity
        if (severity === 'critical' || severity === 'high') {
            this.logger.error(`Security Event: ${eventType}`, {
                ...securityEvent,
                logType: 'security',
                alertRequired: true
            });
        } else {
            this.logger.warn(`Security Event: ${eventType}`, {
                ...securityEvent,
                logType: 'security'
            });
        }

        // Track for pattern analysis
        this.trackSecurityEvent(eventType, description, securityEvent);

        return securityEvent;
    }

    // Performance monitoring
    startPerformanceTracking(operation, context = {}) {
        const trackingId = uuidv4();
        const startTime = Date.now();
        
        this.performanceMetrics.set(trackingId, {
            operation,
            startTime,
            context
        });

        return trackingId;
    }

    endPerformanceTracking(trackingId, additionalContext = {}) {
        const tracking = this.performanceMetrics.get(trackingId);
        if (!tracking) return null;

        const endTime = Date.now();
        const duration = endTime - tracking.startTime;
        
        const performanceData = {
            operation: tracking.operation,
            duration,
            startTime: tracking.startTime,
            endTime,
            ...tracking.context,
            ...additionalContext
        };

        // Log performance data
        if (duration > 5000) { // Slow operation (> 5 seconds)
            this.warn(`Slow Operation: ${tracking.operation}`, {
                ...performanceData,
                logType: 'performance',
                severity: 'high'
            });
        } else if (duration > 1000) { // Medium operation (> 1 second)
            this.info(`Operation: ${tracking.operation}`, {
                ...performanceData,
                logType: 'performance',
                severity: 'medium'
            });
        } else {
            this.debug(`Operation: ${tracking.operation}`, {
                ...performanceData,
                logType: 'performance'
            });
        }

        // Clean up tracking
        this.performanceMetrics.delete(trackingId);

        // Check for performance degradation alerts
        this.checkPerformanceAlerts(tracking.operation, duration);

        return performanceData;
    }

    // Request/Response logging middleware
    createRequestLogger() {
        return (req, res, next) => {
            const startTime = Date.now();
            const requestId = uuidv4().substr(0, 8);
            
            // Add request ID to request object
            req.requestId = requestId;

            // Log incoming request
            this.info(`Incoming Request: ${req.method} ${req.path}`, {
                requestId,
                method: req.method,
                path: req.path,
                query: req.query,
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip,
                userId: req.userId || null,
                logType: 'request'
            });

            // Override res.end to log response
            const originalEnd = res.end;
            res.end = (...args) => {
                const duration = Date.now() - startTime;
                
                this.info(`Request Completed: ${req.method} ${req.path}`, {
                    requestId,
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    duration,
                    userId: req.userId || null,
                    logType: 'response'
                });

                // Check for error responses
                if (res.statusCode >= 400) {
                    this.warn(`HTTP Error Response: ${res.statusCode}`, {
                        requestId,
                        method: req.method,
                        path: req.path,
                        statusCode: res.statusCode,
                        duration,
                        logType: 'http_error'
                    });
                }

                originalEnd.apply(res, args);
            };

            next();
        };
    }

    // Alert monitoring
    trackSecurityEvent(eventType, description, context) {
        this.securityEvents.push({
            eventType,
            description,
            timestamp: Date.now(),
            context
        });

        // Keep only last 1000 events in memory
        if (this.securityEvents.length > 1000) {
            this.securityEvents = this.securityEvents.slice(-1000);
        }
    }

    trackPerformanceMetrics(level, context) {
        // Track API call patterns for monitoring
        if (context.operation) {
            const key = `${level}_${context.operation}`;
            const current = this.performanceMetrics.get(key) || { count: 0, lastSeen: 0 };
            current.count++;
            current.lastSeen = Date.now();
            this.performanceMetrics.set(key, current);
        }
    }

    checkAlertThresholds(level, context) {
        const now = Date.now();
        
        // Check error rate threshold
        if (level === 'error') {
            this.checkErrorRateAlert(now);
        }

        // Check failed login threshold
        if (context.action === 'login_failed') {
            this.checkFailedLoginAlert(now);
        }

        // Check API error threshold
        if (context.logType === 'http_error') {
            this.checkApiErrorAlert(now);
        }
    }

    checkErrorRateAlert(now) {
        const alertKey = 'error_rate';
        const threshold = this.alertThresholds.errorRate;
        
        if (!this.alerts.has(alertKey)) {
            this.alerts.set(alertKey, { count: 0, firstSeen: now, lastAlert: 0 });
        }

        const alertData = this.alerts.get(alertKey);
        
        // Reset count if outside window
        if (now - alertData.firstSeen > threshold.window) {
            alertData.count = 1;
            alertData.firstSeen = now;
        } else {
            alertData.count++;
        }

        // Trigger alert if threshold exceeded and not in cooldown
        if (alertData.count >= threshold.threshold && 
            now - alertData.lastAlert > threshold.cooldown) {
            
            this.triggerAlert('High Error Rate', {
                type: 'error_rate',
                count: alertData.count,
                timeWindow: threshold.window / 1000,
                threshold: threshold.threshold
            });
            
            alertData.lastAlert = now;
        }

        this.alerts.set(alertKey, alertData);
    }

    checkPerformanceAlerts(operation, duration) {
        const threshold = this.alertThresholds.performanceDegradation;
        
        if (duration > threshold.threshold) {
            const alertKey = `perf_${operation}`;
            const alertData = this.alerts.get(alertKey) || { consecutive: 0, lastAlert: 0 };
            
            alertData.consecutive++;
            
            if (alertData.consecutive >= threshold.consecutiveCount &&
                Date.now() - alertData.lastAlert > threshold.cooldown) {
                
                this.triggerAlert('Performance Degradation', {
                    type: 'performance',
                    operation,
                    consecutiveSlowRequests: alertData.consecutive,
                    averageDuration: duration
                });
                
                alertData.lastAlert = Date.now();
                alertData.consecutive = 0;
            }
            
            this.alerts.set(alertKey, alertData);
        }
    }

    triggerAlert(alertType, details) {
        this.logger.error(`🚨 ALERT: ${alertType}`, {
            alertType,
            details,
            timestamp: new Date().toISOString(),
            logType: 'alert',
            severity: 'critical'
        });

        // In production, this would integrate with alerting systems
        console.error(`🚨 ALERT: ${alertType}`, details);
    }

    // Log analysis methods
    async getLogStatistics(timeRange = '1h') {
        const stats = {
            totalLogs: 0,
            errorCount: 0,
            warningCount: 0,
            infoCount: 0,
            uniqueUsers: new Set(),
            topErrors: new Map(),
            performanceMetrics: {
                averageResponseTime: 0,
                slowRequests: 0
            }
        };

        // This would typically query log files or a log aggregation system
        // For now, return current in-memory statistics
        
        return stats;
    }

    async startLogMonitoring() {
        // Monitor log health every 5 minutes
        setInterval(() => {
            this.info('Log system health check', {
                logType: 'system',
                activeAlerts: this.alerts.size,
                securityEvents: this.securityEvents.length,
                performanceTracking: this.performanceMetrics.size
            });
        }, 5 * 60 * 1000);

        // Clean up old performance metrics every hour
        setInterval(() => {
            this.cleanupPerformanceMetrics();
        }, 60 * 60 * 1000);
    }

    cleanupPerformanceMetrics() {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
        
        for (const [key, value] of this.performanceMetrics.entries()) {
            if (value.lastSeen && value.lastSeen < cutoff) {
                this.performanceMetrics.delete(key);
            }
        }

        this.info('Performance metrics cleanup completed', {
            logType: 'system',
            remainingMetrics: this.performanceMetrics.size
        });
    }

    async logCriticalError(message, error, context) {
        try {
            if (this.db) {
                await this.db.logAuditEvent({
                    userId: context.userId || null,
                    adminId: context.adminId || null,
                    action: 'critical_error',
                    entityType: 'system',
                    entityId: context.component || 'unknown',
                    details: {
                        message,
                        error: error?.message,
                        stack: error?.stack,
                        context
                    },
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent
                });
            }
        } catch (dbError) {
            console.error('❌ Failed to log critical error to database:', dbError);
        }
    }

    // Export logs for external analysis
    async exportLogs(startDate, endDate, logType = 'all') {
        const exportData = {
            startDate,
            endDate,
            logType,
            exportTime: new Date().toISOString(),
            logs: []
        };

        // This would typically read from log files
        // Implementation depends on log storage strategy
        
        this.info('Log export requested', {
            startDate,
            endDate,
            logType,
            logType: 'system'
        });

        return exportData;
    }

    // Graceful shutdown
    close() {
        if (this.logger) {
            this.logger.end();
            console.log('✅ ChefSocial logging system shutdown complete');
        }
    }
}

module.exports = ChefSocialLogger;