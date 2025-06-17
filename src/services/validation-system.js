// ChefSocial Input Validation and Sanitization System
const { body, query, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

class ValidationSystem {
    constructor() {
        this.validationRules = {};
        this.initializeRules();
    }

    initializeRules() {
        // Authentication validation rules
        this.validationRules = {
            // User Registration Validation
            register: [
                body('email')
                    .isEmail()
                    .normalizeEmail({
                        gmail_lowercase: true,
                        gmail_remove_dots: false,
                        gmail_remove_subaddress: false,
                        outlookdotcom_lowercase: true,
                        yahoo_lowercase: true,
                        icloud_lowercase: true
                    })
                    .withMessage('Please provide a valid email address')
                    .isLength({ max: 254 })
                    .withMessage('Email address is too long'),

                body('password')
                    .isLength({ min: 8, max: 128 })
                    .withMessage('Password must be between 8 and 128 characters')
                    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
                    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
                    .custom((value) => {
                        // Check for common weak passwords
                        const weakPasswords = ['password', '12345678', 'qwerty123', 'abc123456'];
                        if (weakPasswords.some(weak => value.toLowerCase().includes(weak))) {
                            throw new Error('Password is too common');
                        }
                        return true;
                    }),

                body('name')
                    .trim()
                    .isLength({ min: 1, max: 100 })
                    .withMessage('Name must be between 1 and 100 characters')
                    .matches(/^[a-zA-Z\s\-\.\']+$/)
                    .withMessage('Name can only contain letters, spaces, hyphens, dots, and apostrophes')
                    .escape(), // XSS protection

                body('restaurantName')
                    .optional()
                    .trim()
                    .isLength({ max: 200 })
                    .withMessage('Restaurant name must be less than 200 characters')
                    .escape(), // XSS protection

                body('paymentMethodId')
                    .matches(/^pm_[a-zA-Z0-9_]+$/)
                    .withMessage('Invalid payment method ID format'),

                body('planName')
                    .optional()
                    .isIn(['complete'])
                    .withMessage('Invalid plan name')
            ],

            // User Login Validation
            login: [
                body('email')
                    .isEmail()
                    .normalizeEmail({
                        gmail_lowercase: true,
                        gmail_remove_dots: false,
                        gmail_remove_subaddress: false,
                        outlookdotcom_lowercase: true,
                        yahoo_lowercase: true,
                        icloud_lowercase: true
                    })
                    .withMessage('Please provide a valid email address')
                    .isLength({ max: 254 })
                    .withMessage('Email address is too long'),

                body('password')
                    .isLength({ min: 1, max: 128 })
                    .withMessage('Password is required')
                    .not()
                    .isEmpty()
                    .withMessage('Password cannot be empty')
            ],

            // Token Verification
            tokenVerification: [
                body('token')
                    .optional()
                    .matches(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/)
                    .withMessage('Invalid token format'),

                body('refreshToken')
                    .optional()
                    .matches(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/)
                    .withMessage('Invalid refresh token format')
            ],

            // Password Reset
            passwordReset: [
                body('email')
                    .isEmail()
                    .normalizeEmail()
                    .withMessage('Please provide a valid email address'),

                body('token')
                    .optional()
                    .isLength({ min: 32, max: 128 })
                    .withMessage('Invalid reset token'),

                body('newPassword')
                    .optional()
                    .isLength({ min: 8, max: 128 })
                    .withMessage('Password must be between 8 and 128 characters')
                    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
                    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
            ],

            // User Profile Update
            profileUpdate: [
                body('name')
                    .optional()
                    .trim()
                    .isLength({ min: 1, max: 100 })
                    .withMessage('Name must be between 1 and 100 characters')
                    .matches(/^[a-zA-Z\s\-\.\']+$/)
                    .withMessage('Name can only contain letters, spaces, hyphens, dots, and apostrophes')
                    .escape(),

                body('restaurantName')
                    .optional()
                    .trim()
                    .isLength({ max: 200 })
                    .withMessage('Restaurant name must be less than 200 characters')
                    .escape(),

                body('cuisineType')
                    .optional()
                    .trim()
                    .isLength({ max: 100 })
                    .withMessage('Cuisine type must be less than 100 characters')
                    .escape(),

                body('location')
                    .optional()
                    .trim()
                    .isLength({ max: 200 })
                    .withMessage('Location must be less than 200 characters')
                    .escape(),

                body('phone')
                    .optional()
                    .isMobilePhone(['en-US', 'en-CA', 'fr-FR'])
                    .withMessage('Please provide a valid phone number'),

                body('description')
                    .optional()
                    .trim()
                    .isLength({ max: 1000 })
                    .withMessage('Description must be less than 1000 characters')
                    .escape()
            ],

            // Content Generation
            contentGeneration: [
                body('prompt')
                    .trim()
                    .isLength({ min: 1, max: 2000 })
                    .withMessage('Prompt must be between 1 and 2000 characters')
                    .escape(),

                body('platform')
                    .optional()
                    .isIn(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok'])
                    .withMessage('Invalid social media platform'),

                body('contentType')
                    .optional()
                    .isIn(['post', 'story', 'reel', 'video', 'image'])
                    .withMessage('Invalid content type'),

                body('language')
                    .optional()
                    .isIn(['en', 'fr'])
                    .withMessage('Language must be either en or fr')
            ],

            // Query Parameter Validation
            queryParams: {
                pagination: [
                    query('page')
                        .optional()
                        .isInt({ min: 1, max: 1000 })
                        .withMessage('Page must be between 1 and 1000')
                        .toInt(),

                    query('limit')
                        .optional()
                        .isInt({ min: 1, max: 100 })
                        .withMessage('Limit must be between 1 and 100')
                        .toInt(),

                    query('sort')
                        .optional()
                        .isIn(['created_at', 'updated_at', 'name', 'email'])
                        .withMessage('Invalid sort field'),

                    query('order')
                        .optional()
                        .isIn(['asc', 'desc'])
                        .withMessage('Order must be asc or desc')
                ],

                search: [
                    query('q')
                        .optional()
                        .trim()
                        .isLength({ min: 1, max: 100 })
                        .withMessage('Search query must be between 1 and 100 characters')
                        .escape(),

                    query('filter')
                        .optional()
                        .isIn(['active', 'inactive', 'all'])
                        .withMessage('Invalid filter value')
                ]
            },

            // Path Parameter Validation
            pathParams: {
                userId: [
                    param('userId')
                        .isUUID(4)
                        .withMessage('Invalid user ID format')
                ],

                sessionId: [
                    param('sessionId')
                        .isInt({ min: 1 })
                        .withMessage('Invalid session ID')
                        .toInt()
                ],

                contentId: [
                    param('contentId')
                        .isUUID(4)
                        .withMessage('Invalid content ID format')
                ]
            }
        };
    }

    // Main validation middleware factory
    validate(ruleName) {
        const rules = this.validationRules[ruleName];
        if (!rules) {
            throw new Error(`Validation rules for '${ruleName}' not found`);
        }

        return [
            ...rules,
            this.handleValidationErrors.bind(this)
        ];
    }

    // Query parameter validation
    validateQuery(ruleName) {
        const rules = this.validationRules.queryParams[ruleName];
        if (!rules) {
            throw new Error(`Query validation rules for '${ruleName}' not found`);
        }

        return [
            ...rules,
            this.handleValidationErrors.bind(this)
        ];
    }

    // Path parameter validation
    validateParams(ruleName) {
        const rules = this.validationRules.pathParams[ruleName];
        if (!rules) {
            throw new Error(`Path validation rules for '${ruleName}' not found`);
        }

        return [
            ...rules,
            this.handleValidationErrors.bind(this)
        ];
    }

    // Enhanced error handling middleware
    handleValidationErrors(req, res, next) {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            const errorDetails = errors.array().map(error => ({
                field: error.path || error.param,
                message: error.msg,
                value: error.value,
                location: error.location
            }));

            // Log validation errors for monitoring
            console.log(`❌ Validation error for ${req.method} ${req.path}:`, {
                errors: errorDetails,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });

            return res.status(400).json({
                error: 'Validation failed',
                message: 'The request contains invalid data',
                details: errorDetails,
                timestamp: new Date().toISOString(),
                path: req.path,
                method: req.method
            });
        }

        next();
    }

    // XSS Protection Middleware
    xssProtection() {
        return (req, res, next) => {
            // Set security headers
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

            // Additional XSS checks for request body
            if (req.body && typeof req.body === 'object') {
                this.sanitizeObject(req.body);
            }

            next();
        };
    }

    // Recursive object sanitization
    sanitizeObject(obj) {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (typeof obj[key] === 'string') {
                    // Check for potential XSS patterns
                    const xssPatterns = [
                        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                        /javascript:/gi,
                        /on\w+\s*=/gi,
                        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
                    ];

                    for (let pattern of xssPatterns) {
                        if (pattern.test(obj[key])) {
                            obj[key] = obj[key].replace(pattern, '');
                        }
                    }
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    this.sanitizeObject(obj[key]);
                }
            }
        }
    }

    // SQL Injection Protection (for raw queries)
    sqlInjectionProtection() {
        return (req, res, next) => {
            const checkSqlInjection = (value) => {
                if (typeof value !== 'string') return false;
                
                const sqlPatterns = [
                    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
                    /(--|;|\/\*|\*\/|'|")/gi,
                    /(\b(OR|AND)\b.*[=<>].*(\b(OR|AND)\b))/gi
                ];

                return sqlPatterns.some(pattern => pattern.test(value));
            };

            const scanObject = (obj) => {
                for (let key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        if (typeof obj[key] === 'string' && checkSqlInjection(obj[key])) {
                            return true;
                        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                            if (scanObject(obj[key])) return true;
                        }
                    }
                }
                return false;
            };

            // Check query parameters
            if (scanObject(req.query)) {
                return res.status(400).json({
                    error: 'Invalid input detected',
                    message: 'Request contains potentially harmful content',
                    timestamp: new Date().toISOString()
                });
            }

            // Check request body
            if (req.body && scanObject(req.body)) {
                return res.status(400).json({
                    error: 'Invalid input detected',
                    message: 'Request contains potentially harmful content',
                    timestamp: new Date().toISOString()
                });
            }

            next();
        };
    }

    // Rate limiting with validation
    createRateLimit(options = {}) {
        const defaultOptions = {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: {
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil(options.windowMs / 1000) || 900
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                res.status(429).json({
                    ...defaultOptions.message,
                    timestamp: new Date().toISOString(),
                    ip: req.ip
                });
            }
        };

        return rateLimit({ ...defaultOptions, ...options });
    }

    // Comprehensive security middleware stack
    securityMiddleware() {
        return [
            this.xssProtection(),
            this.sqlInjectionProtection(),
            this.createRateLimit()
        ];
    }

    // Custom validation rules
    addCustomRule(name, rules) {
        this.validationRules[name] = rules;
    }

    // Get validation summary for documentation
    getValidationSummary() {
        const summary = {};
        for (let ruleName in this.validationRules) {
            if (typeof this.validationRules[ruleName] === 'object' && Array.isArray(this.validationRules[ruleName])) {
                summary[ruleName] = this.validationRules[ruleName].length;
            }
        }
        return summary;
    }
}

module.exports = ValidationSystem;