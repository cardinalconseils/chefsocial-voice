// ChefSocial Voice AI - Global Error Handler Middleware
module.exports = (logger) => {
    return (err, req, res, next) => {
        // Enhanced error logging with structured format
        const errorContext = {
            url: req.url,
            method: req.method,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip,
            userId: req.userId || null,
            requestId: req.requestId || null,
            severity: err.severity || 'error'
        };
        
        logger.error('Global error handler triggered', err, errorContext);
        
        // Handle specific error types
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: err.message
            });
        }
        
        if (err.name === 'UnauthorizedError' || err.message.includes('token')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'Please log in to access this resource'
            });
        }
        
        if (err.code === 'ENOENT') {
            return res.status(404).json({
                success: false,
                error: 'Resource not found'
            });
        }
        
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                error: 'File too large',
                message: 'Please upload a smaller file'
            });
        }
        
        // Database errors
        if (err.code && err.code.startsWith('SQLITE_')) {
            return res.status(500).json({
                success: false,
                error: 'Database error',
                message: 'Please try again later'
            });
        }
        
        // OpenAI API errors
        if (err.status && err.status >= 400 && err.status < 500) {
            return res.status(err.status).json({
                success: false,
                error: 'AI service error',
                message: 'Please try again or contact support'
            });
        }
        
        // Stripe errors
        if (err.type && err.type.startsWith('Stripe')) {
            return res.status(400).json({
                success: false,
                error: 'Payment error',
                message: err.message || 'Payment processing failed'
            });
        }
        
        // Default server error
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Something went wrong. Please try again later.',
            ...(process.env.NODE_ENV === 'development' && { 
                stack: err.stack,
                details: err.message 
            })
        });
    };
};