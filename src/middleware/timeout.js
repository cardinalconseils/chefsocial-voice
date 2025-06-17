// ChefSocial Voice AI - Request Timeout Middleware
module.exports = () => {
    return (req, res, next) => {
        const timeout = 30000; // 30 seconds
        
        const timer = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    success: false,
                    error: 'Request timeout',
                    message: 'Request took too long to process'
                });
            }
        }, timeout);
        
        res.on('finish', () => {
            clearTimeout(timer);
        });
        
        next();
    };
};