// ChefSocial Voice AI - Request Logging Middleware
module.exports = (logger) => {
    return (req, res, next) => {
        // Generate request ID
        const requestId = require('uuid').v4().substr(0, 8);
        req.requestId = requestId;
        
        const startTime = Date.now();
        
        // Log incoming request
        logger.info(`Incoming Request: ${req.method} ${req.path}`, {
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
            
            logger.info(`Request Completed: ${req.method} ${req.path}`, {
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
                logger.warn(`HTTP Error Response: ${res.statusCode}`, {
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
};