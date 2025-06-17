// ChefSocial Voice AI - Validation Middleware
const { validationResult } = require('express-validator');

// Async error wrapper for route handlers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation result checker middleware
const validateRequest = (validations) => {
    return [
        ...validations,
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            next();
        }
    ];
};

module.exports = {
    asyncHandler,
    validateRequest
};