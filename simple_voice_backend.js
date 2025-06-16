// server.js - ChefSocial Conversational AI Backend
require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const OpenAI = require('openai');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const ChefSocialRealtimeHandler = require('./realtime-handler');
const NaturalConversationHandler = require('./natural-conversation-fallback');
const ChefSocialAuth = require('./auth-system');
const SMSService = require('./sms-service');
const I18nManager = require('./i18n');
const twilio = require('twilio');

const app = express();

// Initialize Authentication System
const authSystem = new ChefSocialAuth();
const upload = multer({ dest: 'uploads/' });

// Initialize SMS Service
const smsService = new SMSService();

// Initialize I18n Manager
const i18n = new I18nManager();

// Schedule SMS workflow cleanup every hour
setInterval(() => {
    smsService.cleanupExpiredWorkflows();
}, 60 * 60 * 1000); // 1 hour

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    process.exit(1);
}

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Initialize ChefSocial Realtime Handler
const realtimeHandler = new ChefSocialRealtimeHandler();

// Initialize Natural Conversation Handler
const naturalHandler = new NaturalConversationHandler();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            scriptSrc: ["'self'", "js.stripe.com"],
            connectSrc: ["'self'", "api.openai.com", "api.stripe.com"],
            imgSrc: ["'self'", "data:", "https:"],
            mediaSrc: ["'self'", "data:"]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://chef-social.com', 'https://app.chef-social.com'] 
        : ['http://localhost:3000', 'http://localhost:4000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests',
        message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login/register attempts per windowMs
    message: {
        success: false,
        error: 'Too many authentication attempts',
        message: 'Please try again in 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const voiceLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 voice processing requests per minute
    message: {
        success: false,
        error: 'Voice processing rate limit exceeded',
        message: 'Please wait before processing more audio'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Apply internationalization middleware
app.use(i18n.middleware());

// Request validation middleware
const validateRequest = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        
        next();
    };
};

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('❌ Global error handler:', err);
    
    // Log error details for debugging
    const errorDetails = {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip
    };
    
    console.error('Error details:', errorDetails);
    
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
        message: 'Something went wrong. Please try again later.'
    });
};

// Request timeout middleware
const timeoutHandler = (req, res, next) => {
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

// Apply timeout middleware to all routes
app.use(timeoutHandler);

// Async error wrapper for async route handlers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Authentication Routes
app.post('/api/auth/register', 
    authLimiter,
    validateRequest([
        body('email').isEmail().normalizeEmail(),
        body('name').isLength({ min: 2, max: 50 }).trim(),
        body('password').isLength({ min: 8, max: 128 }),
        body('restaurantName').isLength({ min: 2, max: 100 }).trim(),
        body('planName').isIn(['starter', 'professional', 'enterprise']),
        body('paymentMethodId').isLength({ min: 10, max: 100 })
    ]),
    async (req, res) => {
    try {
        const { email, name, password, restaurantName, planName, paymentMethodId } = req.body;

        const result = await authSystem.registerUser({
            email,
            password,
            name,
            restaurantName,
            planName,
            paymentMethodId
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(400).json({ 
            success: false,
            error: error.message || 'Registration failed' 
        });
    }
});

app.post('/api/auth/login', 
    authLimiter,
    validateRequest([
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 1, max: 128 })
    ]),
    async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authSystem.loginUser(email, password);
        res.json(result);

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(401).json({ 
            success: false,
            error: error.message || 'Login failed' 
        });
    }
});

app.post('/api/auth/verify', authSystem.authMiddleware(), (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            restaurantName: req.user.restaurant_name,
            plan: req.user.plan_name || 'trial'
        }
    });
});

// Stripe webhook endpoint
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
        const event = authSystem.stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        await authSystem.handleStripeWebhook(event);
        res.json({received: true});

    } catch (error) {
        console.error('❌ Webhook error:', error.message);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});

// Get user features
app.get('/api/features', authSystem.authMiddleware(), async (req, res) => {
    try {
        const features = await authSystem.getUserFeatures(req.userId);
        res.json({ success: true, features });

    } catch (error) {
        console.error('❌ Features error:', error);
        res.status(500).json({ error: 'Failed to get features' });
    }
});

// Get pricing plans
app.get('/api/pricing', (req, res) => {
    const plans = authSystem.getPricingPlans();
    res.json({ success: true, plans });
});

// Language Management Endpoints
app.get('/api/languages', (req, res) => {
    const languages = i18n.getAvailableLanguages();
    res.json({ 
        success: true, 
        languages: languages,
        current: req.language || i18n.defaultLanguage
    });
});

app.post('/api/language', authSystem.authMiddleware(), async (req, res) => {
    try {
        const { language } = req.body;
        
        if (!language || !i18n.isSupported(language)) {
            return res.status(400).json({
                success: false,
                error: req.t('errors.validation'),
                message: 'Unsupported language'
            });
        }

        // Update user's preferred language in database
        await authSystem.db.db.run(`
            UPDATE users 
            SET preferred_language = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [language, req.userId]);

        res.json({
            success: true,
            message: req.t('common.success'),
            language: language
        });

    } catch (error) {
        console.error('❌ Language update error:', error);
        res.status(500).json({ 
            success: false,
            error: req.t('errors.server')
        });
    }
});

// User Profile Management Endpoints
app.get('/api/user/profile', authSystem.authMiddleware(), async (req, res) => {
    try {
        const user = await authSystem.db.getUserById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Return user profile without sensitive data
        res.json({
            success: true,
            profile: {
                id: user.id,
                email: user.email,
                name: user.name,
                restaurantName: user.restaurant_name,
                cuisineType: user.cuisine_type,
                location: user.location,
                phone: user.phone,
                createdAt: user.created_at,
                lastLogin: user.last_login,
                plan: user.plan_name || 'trial'
            }
        });

    } catch (error) {
        console.error('❌ Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

app.put('/api/user/profile', authSystem.authMiddleware(), async (req, res) => {
    try {
        const { name, restaurantName, cuisineType, location, phone } = req.body;
        
        // Update user profile
        await authSystem.db.db.run(`
            UPDATE users 
            SET name = ?, restaurant_name = ?, cuisine_type = ?, location = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, restaurantName, cuisineType, location, phone, req.userId]);

        // Get updated user data
        const updatedUser = await authSystem.db.getUserById(req.userId);
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            profile: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                restaurantName: updatedUser.restaurant_name,
                cuisineType: updatedUser.cuisine_type,
                location: updatedUser.location,
                phone: updatedUser.phone
            }
        });

    } catch (error) {
        console.error('❌ Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

app.post('/api/user/logout', authSystem.authMiddleware(), async (req, res) => {
    try {
        // In a production environment, you would invalidate the JWT token
        // For now, we'll just return success and let the client remove the token
        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

app.delete('/api/user/account', authSystem.authMiddleware(), async (req, res) => {
    try {
        // Cancel subscription if active
        const user = await authSystem.db.getUserById(req.userId);
        if (user.stripe_customer_id) {
            // Cancel Stripe subscription
            const subscriptions = await authSystem.stripe.subscriptions.list({
                customer: user.stripe_customer_id,
                status: 'active'
            });

            for (const subscription of subscriptions.data) {
                await authSystem.stripe.subscriptions.cancel(subscription.id);
            }
        }

        // Soft delete user account (mark as deleted)
        await authSystem.db.db.run(`
            UPDATE users 
            SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [req.userId]);

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// Content History and Library Management Endpoints
app.get('/api/content/history', authSystem.authMiddleware(), async (req, res) => {
    try {
        const { limit = 50, offset = 0, platform } = req.query;
        
        let query = `
            SELECT * FROM generated_content 
            WHERE user_id = ?
        `;
        let params = [req.userId];
        
        if (platform) {
            query += ` AND platform = ?`;
            params.push(platform);
        }
        
        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        const content = await new Promise((resolve, reject) => {
            authSystem.db.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        res.json({
            success: true,
            content: content,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: content.length
            }
        });

    } catch (error) {
        console.error('❌ Get content history error:', error);
        res.status(500).json({ error: 'Failed to get content history' });
    }
});

app.post('/api/content/save', authSystem.authMiddleware(), async (req, res) => {
    try {
        const { platform, contentType, caption, hashtags, imageUrl, transcript, viralScore } = req.body;
        
        if (!platform || !caption) {
            return res.status(400).json({ error: 'Platform and caption are required' });
        }
        
        const contentId = `content_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        const result = await authSystem.db.saveGeneratedContent({
            id: contentId,
            userId: req.userId,
            platform: platform,
            contentType: contentType || 'post',
            caption: caption,
            hashtags: hashtags || '',
            imageUrl: imageUrl,
            transcript: transcript,
            viralScore: viralScore || 0
        });
        
        res.json({
            success: true,
            message: 'Content saved successfully',
            contentId: contentId
        });

    } catch (error) {
        console.error('❌ Save content error:', error);
        res.status(500).json({ error: 'Failed to save content' });
    }
});

app.get('/api/content/:id', authSystem.authMiddleware(), async (req, res) => {
    try {
        const contentId = req.params.id;
        
        const content = await new Promise((resolve, reject) => {
            authSystem.db.db.get(`
                SELECT * FROM generated_content 
                WHERE id = ? AND user_id = ?
            `, [contentId, req.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!content) {
            return res.status(404).json({ error: 'Content not found' });
        }
        
        res.json({
            success: true,
            content: content
        });

    } catch (error) {
        console.error('❌ Get content error:', error);
        res.status(500).json({ error: 'Failed to get content' });
    }
});

app.put('/api/content/:id', authSystem.authMiddleware(), async (req, res) => {
    try {
        const contentId = req.params.id;
        const { caption, hashtags, viralScore } = req.body;
        
        // Check if content exists and belongs to user
        const existingContent = await new Promise((resolve, reject) => {
            authSystem.db.db.get(`
                SELECT * FROM generated_content 
                WHERE id = ? AND user_id = ?
            `, [contentId, req.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!existingContent) {
            return res.status(404).json({ error: 'Content not found' });
        }
        
        // Update content
        await new Promise((resolve, reject) => {
            authSystem.db.db.run(`
                UPDATE generated_content 
                SET caption = ?, hashtags = ?, viral_score = ?
                WHERE id = ? AND user_id = ?
            `, [caption || existingContent.caption, hashtags || existingContent.hashtags, viralScore || existingContent.viral_score, contentId, req.userId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        res.json({
            success: true,
            message: 'Content updated successfully'
        });

    } catch (error) {
        console.error('❌ Update content error:', error);
        res.status(500).json({ error: 'Failed to update content' });
    }
});

app.delete('/api/content/:id', authSystem.authMiddleware(), async (req, res) => {
    try {
        const contentId = req.params.id;
        
        // Check if content exists and belongs to user
        const existingContent = await new Promise((resolve, reject) => {
            authSystem.db.db.get(`
                SELECT * FROM generated_content 
                WHERE id = ? AND user_id = ?
            `, [contentId, req.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!existingContent) {
            return res.status(404).json({ error: 'Content not found' });
        }
        
        // Delete content
        await new Promise((resolve, reject) => {
            authSystem.db.db.run(`
                DELETE FROM generated_content 
                WHERE id = ? AND user_id = ?
            `, [contentId, req.userId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        res.json({
            success: true,
            message: 'Content deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete content error:', error);
        res.status(500).json({ error: 'Failed to delete content' });
    }
});

// Restaurant Profile Management Endpoints
app.get('/api/restaurant/profile', authSystem.authMiddleware(), async (req, res) => {
    try {
        const user = await authSystem.db.getUserById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get restaurant-specific data
        const restaurantProfile = {
            restaurantName: user.restaurant_name,
            cuisineType: user.cuisine_type,
            location: user.location,
            phone: user.phone,
            description: user.description || '',
            brandColors: user.brand_colors || '',
            brandFonts: user.brand_fonts || '',
            specialties: user.specialties || '',
            ambiance: user.ambiance || '',
            targetAudience: user.target_audience || '',
            uniqueSellingPoints: user.unique_selling_points || ''
        };

        res.json({
            success: true,
            restaurant: restaurantProfile
        });

    } catch (error) {
        console.error('❌ Get restaurant profile error:', error);
        res.status(500).json({ error: 'Failed to get restaurant profile' });
    }
});

app.put('/api/restaurant/profile', authSystem.authMiddleware(), async (req, res) => {
    try {
        const {
            restaurantName,
            cuisineType,
            location,
            phone,
            description,
            brandColors,
            brandFonts,
            specialties,
            ambiance,
            targetAudience,
            uniqueSellingPoints
        } = req.body;

        // Update restaurant profile in user table (extend as needed)
        await authSystem.db.db.run(`
            UPDATE users 
            SET restaurant_name = ?, cuisine_type = ?, location = ?, phone = ?, 
                description = ?, brand_colors = ?, brand_fonts = ?, specialties = ?,
                ambiance = ?, target_audience = ?, unique_selling_points = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            restaurantName,
            cuisineType,
            location,
            phone,
            description,
            brandColors,
            brandFonts,
            specialties,
            ambiance,
            targetAudience,
            uniqueSellingPoints,
            req.userId
        ]);

        res.json({
            success: true,
            message: 'Restaurant profile updated successfully'
        });

    } catch (error) {
        console.error('❌ Update restaurant profile error:', error);
        res.status(500).json({ error: 'Failed to update restaurant profile' });
    }
});

// Brand Voice Learning Endpoints
app.get('/api/restaurant/brand-voice', authSystem.authMiddleware(), async (req, res) => {
    try {
        const user = await authSystem.db.getUserById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get recent content to analyze brand voice
        const recentContent = await new Promise((resolve, reject) => {
            authSystem.db.db.all(`
                SELECT caption, platform, viral_score, created_at 
                FROM generated_content 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 20
            `, [req.userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const brandVoice = {
            restaurantName: user.restaurant_name,
            cuisineType: user.cuisine_type,
            targetAudience: user.target_audience || 'food lovers',
            brandPersonality: user.brand_personality || 'friendly and authentic',
            contentTone: user.content_tone || 'enthusiastic',
            keyMessages: user.key_messages || '',
            recentContentCount: recentContent.length,
            avgViralScore: recentContent.length > 0 
                ? (recentContent.reduce((sum, content) => sum + (content.viral_score || 0), 0) / recentContent.length).toFixed(1)
                : 0
        };

        res.json({
            success: true,
            brandVoice: brandVoice,
            recentContent: recentContent
        });

    } catch (error) {
        console.error('❌ Get brand voice error:', error);
        res.status(500).json({ error: 'Failed to get brand voice' });
    }
});

app.post('/api/restaurant/brand-voice/learn', 
    authSystem.authMiddleware(), 
    authSystem.featureAccessMiddleware('brand_voice_learning'), 
    async (req, res) => {
    try {
        const { examples, preferences, personality, tone } = req.body;

        if (!examples || examples.length === 0) {
            return res.status(400).json({ error: 'Brand voice examples are required' });
        }

        // Update user's brand voice preferences
        await authSystem.db.db.run(`
            UPDATE users 
            SET brand_personality = ?, content_tone = ?, key_messages = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            personality || 'friendly and authentic',
            tone || 'enthusiastic',
            JSON.stringify(examples),
            req.userId
        ]);

        // Track feature usage
        await authSystem.db.trackUsage(req.userId, 'brand_voice_learning', JSON.stringify({
            exampleCount: examples.length,
            personality: personality,
            tone: tone
        }));

        res.json({
            success: true,
            message: 'Brand voice updated successfully',
            learnedFrom: examples.length + ' examples'
        });

    } catch (error) {
        console.error('❌ Brand voice learning error:', error);
        res.status(500).json({ error: 'Failed to update brand voice' });
    }
});

// SMS Human-in-the-Loop Endpoints
app.post('/api/sms/send-approval', 
    authSystem.authMiddleware(),
    authSystem.featureAccessMiddleware('voice_content_creation'),
    async (req, res) => {
    try {
        const { contentId } = req.body;
        
        if (!contentId) {
            return res.status(400).json({ error: 'Content ID is required' });
        }
        
        // Get the content
        const content = await new Promise((resolve, reject) => {
            authSystem.db.db.get(`
                SELECT * FROM generated_content 
                WHERE id = ? AND user_id = ?
            `, [contentId, req.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!content) {
            return res.status(404).json({ error: 'Content not found' });
        }
        
        // Send SMS for approval
        const result = await smsService.sendContentForApproval(req.userId, contentId, content);
        
        res.json({
            success: true,
            message: 'SMS sent for approval',
            workflowId: result.workflowId
        });

    } catch (error) {
        console.error('❌ SMS approval error:', error);
        res.status(500).json({ error: 'Failed to send SMS approval' });
    }
});

app.post('/api/sms/daily-suggestions', 
    authSystem.authMiddleware(),
    async (req, res) => {
    try {
        const result = await smsService.sendDailyContentSuggestions(req.userId);
        
        res.json({
            success: true,
            message: 'Daily suggestions sent via SMS',
            suggestions: result.suggestions
        });

    } catch (error) {
        console.error('❌ SMS daily suggestions error:', error);
        res.status(500).json({ error: 'Failed to send daily suggestions' });
    }
});

// Twilio webhook for incoming SMS
app.post('/api/sms/webhook', express.raw({type: 'application/x-www-form-urlencoded'}), async (req, res) => {
    try {
        // Parse Twilio webhook data
        const twiml = new twilio.twiml.MessagingResponse();
        
        const fromNumber = req.body.From;
        const messageBody = req.body.Body;
        const messageSid = req.body.MessageSid;
        
        console.log(`📱 Incoming SMS from ${fromNumber}: ${messageBody}`);
        
        // Process the incoming SMS
        await smsService.processIncomingSMS(fromNumber, messageBody, messageSid);
        
        // Respond with empty TwiML (we handle responses separately)
        res.type('text/xml').send(twiml.toString());

    } catch (error) {
        console.error('❌ SMS webhook error:', error);
        const twiml = new twilio.twiml.MessagingResponse();
        res.type('text/xml').send(twiml.toString());
    }
});

// Get SMS workflow status
app.get('/api/sms/workflows', 
    authSystem.authMiddleware(),
    async (req, res) => {
    try {
        // Get user's active workflows
        const userWorkflows = [];
        for (const [id, workflow] of smsService.workflows.entries()) {
            if (workflow.userId === req.userId) {
                userWorkflows.push({
                    id: id,
                    type: workflow.type,
                    status: workflow.status,
                    createdAt: workflow.createdAt,
                    expiresAt: workflow.expiresAt
                });
            }
        }
        
        res.json({
            success: true,
            workflows: userWorkflows
        });

    } catch (error) {
        console.error('❌ SMS workflows error:', error);
        res.status(500).json({ error: 'Failed to get SMS workflows' });
    }
});

// Demo voice processing endpoint (public with limited features)
app.post('/api/process-voice-demo', async (req, res) => {
    try {
        const { audio, image, language } = req.body;
        const userLanguage = language || 'en';
        
        console.log('🎯 Processing demo voice request...');
        
        // Validate audio input
        if (!audio) {
            return res.status(400).json({
                success: false,
                error: 'Audio data is required'
            });
        }
        
        let transcript = '';
        let imageAnalysis = '';
        
        // Step 1: Convert voice to text using Whisper (with error handling)
        try {
            transcript = await transcribeAudio(audio, userLanguage);
            console.log('✅ Demo transcript:', transcript);
        } catch (transcriptError) {
            console.error('⚠️ Demo transcription failed:', transcriptError.message);
            // Provide fallback transcript based on language
            transcript = userLanguage === 'fr' 
                ? "Je décris ce délicieux plat" 
                : "I'm describing this delicious dish";
        }
        
        // Step 2: Analyze the image (optional for demo - skip if it fails)
        if (image) {
            try {
                imageAnalysis = await analyzeImage(image);
                console.log('✅ Demo image analysis:', imageAnalysis);
            } catch (imageError) {
                console.error('⚠️ Demo image analysis failed (skipping):', imageError.message);
                imageAnalysis = "A delicious looking dish";
            }
        } else {
            imageAnalysis = "Food photo uploaded";
        }
        
        // Step 3: Generate social media content (limited features)
        const content = await generateDemoContent(transcript, imageAnalysis, userLanguage);
        
        res.json({
            success: true,
            transcript: transcript,
            content: content,
            demo: true,
            message: "Demo mode - Register for advanced AI features!"
        });
        
    } catch (error) {
        console.error('❌ Error processing demo voice:', error);
        
        // Provide fallback response even on error
        const fallbackContent = {
            instagram: {
                caption: "🍽️ Just made something delicious! What's your favorite dish to cook? Share in the comments! 👇✨",
                hashtags: "#chef #foodie #cooking #delicious #instafood #yummy"
            },
            tiktok: {
                caption: "Cooking magic happening in the kitchen! 🔥👨‍🍳",
                hashtags: "#foodtok #chef #cooking #food #fyp #yummy"
            },
            viralPotential: "5",
            bestTime: "6:00 PM",
            demoNote: "Demo mode - Something went wrong but here's sample content!"
        };
        
        res.json({
            success: true,
            transcript: "Demo mode - voice processing",
            content: fallbackContent,
            demo: true,
            message: "Demo mode - Register for full features!"
        });
    }
});

// Main voice processing endpoint (protected)
app.post('/api/process-voice', 
    voiceLimiter,
    authSystem.authMiddleware(), 
    authSystem.featureAccessMiddleware('voice_content_creation'),
    validateRequest([
        body('audio').notEmpty().withMessage('Audio data is required')
    ]),
    async (req, res) => {
    try {
        const { audio, image } = req.body;
        const userLanguage = req.language || 'en'; // Get detected language from i18n middleware
        
        console.log(`Processing voice request in ${userLanguage}...`);
        
        // Step 1: Convert voice to text using Whisper with language detection
        const transcript = await transcribeAudio(audio, userLanguage);
        console.log('Transcript:', transcript);
        
        // Step 2: Analyze the image (optional but adds value)
        const imageAnalysis = await analyzeImage(image);
        console.log('Image analysis:', imageAnalysis);
        
        // Step 3: Generate social media content in user's language
        const content = await generateContent(transcript, imageAnalysis, userLanguage);
        
        // Step 4: Auto-save generated content for user
        try {
            const contentPromises = [];
            
            if (content.instagram) {
                const instagramContentId = `content_${Date.now()}_ig_${Math.random().toString(36).substring(2, 11)}`;
                contentPromises.push(
                    authSystem.db.saveGeneratedContent({
                        id: instagramContentId,
                        userId: req.userId,
                        platform: 'instagram',
                        contentType: 'post',
                        caption: content.instagram.caption,
                        hashtags: content.instagram.hashtags,
                        imageUrl: null, // Will be handled in file upload endpoint
                        transcript: transcript,
                        viralScore: content.viralPotential ? parseInt(content.viralPotential) : 7
                    })
                );
            }
            
            if (content.tiktok) {
                const tiktokContentId = `content_${Date.now()}_tt_${Math.random().toString(36).substring(2, 11)}`;
                contentPromises.push(
                    authSystem.db.saveGeneratedContent({
                        id: tiktokContentId,
                        userId: req.userId,
                        platform: 'tiktok',
                        contentType: 'video',
                        caption: content.tiktok.caption,
                        hashtags: content.tiktok.hashtags,
                        imageUrl: null,
                        transcript: transcript,
                        viralScore: content.viralPotential ? parseInt(content.viralPotential) : 7
                    })
                );
            }
            
            await Promise.all(contentPromises);
            console.log('✅ Content auto-saved to user library');
            
            // Auto-send SMS for approval if user has phone number
            try {
                const user = await authSystem.db.getUserById(req.userId);
                if (user && user.phone && contentPromises.length > 0) {
                    // Send SMS for the first piece of content created
                    const firstContentId = instagramContentId || tiktokContentId;
                    if (firstContentId) {
                        console.log('📱 Auto-sending SMS for content approval...');
                        await smsService.sendContentForApproval(req.userId, firstContentId, content);
                    }
                }
            } catch (smsError) {
                console.error('⚠️ Failed to auto-send SMS:', smsError);
                // Don't fail the entire request if SMS fails
            }
            
        } catch (saveError) {
            console.error('⚠️ Failed to auto-save content:', saveError);
            // Don't fail the entire request if save fails
        }
        
        res.json({
            success: true,
            transcript: transcript,
            content: content,
            smsApprovalSent: true // Indicate that SMS was sent
        });
        
    } catch (error) {
        console.error('Error processing voice:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process voice input'
        });
    }
});

// Convert base64 audio to text using Whisper with language detection
async function transcribeAudio(base64Audio, language = null) {
    let tempPath = null;
    
    try {
        // Validate input
        if (!base64Audio || typeof base64Audio !== 'string') {
            throw new Error('Invalid audio data provided');
        }
        
        // Convert base64 to file
        const audioBuffer = Buffer.from(base64Audio, 'base64');
        if (audioBuffer.length === 0) {
            throw new Error('Empty audio data received');
        }
        
        tempPath = path.join(__dirname, `temp_audio_${Date.now()}.wav`);
        fs.writeFileSync(tempPath, audioBuffer);
        
        console.log('📝 Transcribing audio with Whisper...');
        
        // Determine language for Whisper
        const whisperLanguage = language === 'fr' ? 'fr' : 'en';
        console.log(`🌐 Using language: ${whisperLanguage}`);
        
        // Transcribe with Whisper using ReadStream (Node.js v18 compatible)
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempPath),
            model: "whisper-1",
            language: whisperLanguage, // Dynamic language selection
        });
        
        const transcriptText = transcription.text || transcription;
        if (!transcriptText || transcriptText.trim().length === 0) {
            throw new Error('Empty transcription received');
        }
        
        console.log('✅ Transcription successful:', transcriptText.substring(0, 100) + '...');
        return transcriptText;
        
    } catch (error) {
        console.error('❌ Transcription error:', error.message);
        
        // Handle specific OpenAI API errors
        if (error.status === 429) {
            return "Service is busy. Please try again in a moment.";
        } else if (error.status === 401) {
            return "Authentication error. Please contact support.";
        } else if (error.status >= 500) {
            return "OpenAI service is temporarily unavailable. Please try again.";
        }
        
        return "Could not transcribe audio. Please try speaking more clearly and ensure your microphone is working.";
    } finally {
        // Always clean up temp file
        if (tempPath && fs.existsSync(tempPath)) {
            try {
                fs.unlinkSync(tempPath);
            } catch (cleanupError) {
                console.error('⚠️ Failed to cleanup temp file:', cleanupError.message);
            }
        }
    }
}

// Analyze image using GPT-4 Vision
async function analyzeImage(base64Image) {
    try {
        // Validate input
        if (!base64Image || typeof base64Image !== 'string') {
            throw new Error('Invalid image data provided');
        }
        
        // Ensure proper data URL format
        if (!base64Image.startsWith('data:image/')) {
            base64Image = `data:image/jpeg;base64,${base64Image}`;
        }
        
        console.log('🖼️ Analyzing image with GPT-4o Vision...');
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this food image. What dish is this? What ingredients can you see? What's the cooking style? What mood does it convey? Keep it brief and focus on details that would help create engaging social media content."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: base64Image,
                                detail: "low" // Reduce costs while maintaining quality
                            }
                        }
                    ]
                }
            ],
            max_tokens: 200
        });
        
        const analysis = response.choices[0]?.message?.content;
        if (!analysis || analysis.trim().length === 0) {
            throw new Error('Empty image analysis received');
        }
        
        console.log('✅ Image analysis successful:', analysis.substring(0, 100) + '...');
        return analysis;
        
    } catch (error) {
        console.error('❌ Image analysis error:', error.message);
        
        // Handle specific OpenAI API errors
        if (error.status === 429) {
            return "Service is busy analyzing images. Please try again in a moment.";
        } else if (error.status === 401) {
            return "Authentication error. Please contact support.";
        } else if (error.status >= 500) {
            return "OpenAI image service is temporarily unavailable. Please try again.";
        }
        
        return "Could not analyze image. Please ensure the image is clear and shows food.";
    }
}

// Generate limited demo content
async function generateDemoContent(transcript, imageAnalysis) {
    try {
        console.log('✨ Generating demo social media content...');
        
        // Ensure we have valid transcript
        if (!transcript || transcript.trim().length < 5) {
            transcript = "This delicious dish looks amazing";
        }
        
        // Clean transcript for social media
        const cleanTranscript = transcript.trim().substring(0, 120);
        
        // Generate basic but personalized content using the transcript
        const instagramCaption = generateInstagramCaption(cleanTranscript, imageAnalysis);
        const tiktokCaption = generateTiktokCaption(cleanTranscript);
        
        return {
            instagram: {
                caption: instagramCaption,
                hashtags: "#chef #foodie #delicious #instafood #cooking #yummy"
            },
            tiktok: {
                caption: tiktokCaption,
                hashtags: "#foodtok #chef #cooking #yummy #food #fyp"
            },
            viralPotential: "6",
            bestTime: "7:00 PM",
            demoNote: "Demo version - Upgrade for AI-powered viral content!"
        };
        
    } catch (error) {
        console.error('❌ Demo content generation error:', error.message);
        
        // Fallback content
        return {
            instagram: {
                caption: "🍽️ Fresh from our kitchen! This dish was made with love and passion. What's your favorite comfort food? 👇✨",
                hashtags: "#chef #foodie #demo #delicious #instafood #cooking"
            },
            tiktok: {
                caption: "When passion meets the plate 🔥 #foodlover",
                hashtags: "#foodtok #chef #demo #cooking #yummy"
            },
            viralPotential: "5",
            bestTime: "6:00 PM",
            demoNote: "Upgrade for full AI features!"
        };
    }
}

// Helper function to generate Instagram caption
function generateInstagramCaption(transcript, imageAnalysis) {
    // Extract key food words from transcript
    const foodKeywords = extractFoodKeywords(transcript);
    const emotion = extractEmotion(transcript);
    
    // Create engaging Instagram caption
    let caption = "🍽️ ";
    
    if (transcript.length > 10) {
        caption += transcript.charAt(0).toUpperCase() + transcript.slice(1);
        if (!transcript.endsWith('.') && !transcript.endsWith('!')) {
            caption += "!";
        }
    } else {
        caption += "Check out this amazing dish!";
    }
    
    // Add engagement question
    if (foodKeywords.length > 0) {
        caption += ` Have you tried ${foodKeywords[0]} before? `;
    } else {
        caption += " What's your favorite dish to cook? ";
    }
    
    caption += "Let us know in the comments! 👇✨";
    
    return caption;
}

// Helper function to generate TikTok caption
function generateTiktokCaption(transcript) {
    const shortTranscript = transcript.substring(0, 40);
    
    if (transcript.toLowerCase().includes('delicious') || transcript.toLowerCase().includes('amazing')) {
        return `${shortTranscript}... 😍🔥 #foodlover`;
    } else if (transcript.toLowerCase().includes('recipe') || transcript.toLowerCase().includes('cook')) {
        return `Cooking magic happening! ${shortTranscript} ✨👨‍🍳`;
    } else {
        return `${shortTranscript}... This hits different! 🔥😋`;
    }
}

// Helper function to extract food keywords
function extractFoodKeywords(transcript) {
    const commonFoods = ['pasta', 'pizza', 'burger', 'salad', 'chicken', 'beef', 'fish', 'soup', 'bread', 'rice', 'noodles', 'sandwich', 'tacos', 'curry', 'steak', 'shrimp', 'salmon'];
    const words = transcript.toLowerCase().split(/\s+/);
    return words.filter(word => commonFoods.includes(word));
}

// Helper function to extract emotion from transcript
function extractEmotion(transcript) {
    const positiveWords = ['delicious', 'amazing', 'fantastic', 'incredible', 'perfect', 'wonderful', 'excellent', 'outstanding', 'love', 'great'];
    const words = transcript.toLowerCase().split(/\s+/);
    return words.some(word => positiveWords.includes(word)) ? 'positive' : 'neutral';
}

// Generate social media content with language support
async function generateContent(transcript, imageAnalysis, language = 'en') {
    try {
        // Validate inputs
        if (!transcript || typeof transcript !== 'string') {
            transcript = "A delicious dish prepared with care";
        }
        if (!imageAnalysis || typeof imageAnalysis !== 'string') {
            imageAnalysis = "A beautiful food presentation";
        }
        
        console.log(`✨ Generating social media content in ${language}...`);
        
        // Create language-specific prompts
        const languageInstruction = language === 'fr' 
            ? "Créez le contenu en français. Utilisez des expressions françaises naturelles et des hashtags appropriés pour le marché francophone."
            : "Create content in English. Use natural English expressions and hashtags appropriate for English-speaking markets.";
        
        const exampleHashtagsFr = "#chef #restaurantfr #gastronomie #delicieux #nourriture #cuisinefrancaise";
        const exampleHashtagsEn = "#chef #foodie #restaurant #delicious #instafood";
        
        const prompt = `
        Create viral social media content for a restaurant/chef based on:
        
        CHEF'S DESCRIPTION: "${transcript}"
        IMAGE ANALYSIS: "${imageAnalysis}"
        LANGUAGE: ${language.toUpperCase()}
        
        ${languageInstruction}
        
        Generate content in this exact JSON format:
        {
            "instagram": {
                "caption": "Engaging Instagram caption with emojis, storytelling, and call-to-action",
                "hashtags": "${language === 'fr' ? exampleHashtagsFr : exampleHashtagsEn}"
            },
            "tiktok": {
                "caption": "Short, catchy TikTok caption with trending language",
                "hashtags": "${language === 'fr' ? '#foodtok #recette #chef #viral #fyp #cuisinefrancaise' : '#foodtok #recipe #chef #viral #fyp'}"
            },
            "viralPotential": "8",
            "bestTime": "${language === 'fr' ? '19h00 (heure de pointe du dîner)' : '7:00 PM (dinner rush)'}"
        }
        
        Make it authentic, engaging, and platform-optimized. Use emojis, trending language, and focus on the sensory experience of the food.
        `;
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            max_tokens: 600,
            temperature: 0.8 // Add creativity
        });
        
        const generatedContent = response.choices[0]?.message?.content;
        if (!generatedContent) {
            throw new Error('Empty content generation response');
        }
        
        const parsedContent = JSON.parse(generatedContent);
        
        // Validate required fields
        if (!parsedContent.instagram || !parsedContent.tiktok) {
            throw new Error('Invalid content structure received');
        }
        
        console.log('✅ Content generation successful');
        return parsedContent;
        
    } catch (error) {
        console.error('❌ Content generation error:', error.message);
        
        // Handle specific OpenAI API errors
        if (error.status === 429) {
            console.log('🔄 Using fallback content due to rate limit');
        } else if (error.status >= 500) {
            console.log('🔄 Using fallback content due to OpenAI service issue');
        }
        
        // Return enhanced fallback content
        return {
            instagram: {
                caption: `✨ Fresh from our kitchen! ${transcript.length > 10 ? transcript.substring(0, 100) + '...' : 'Delicious food created with passion!'} 🍽️ What's your favorite comfort food? Tell us below! 👇`,
                hashtags: "#chef #foodie #restaurant #delicious #instafood #freshfood #homemade #foodlover"
            },
            tiktok: {
                caption: "When passion meets the plate 🔥 This is how we do it! 👨‍🍳",
                hashtags: "#foodtok #chef #viral #fyp #cooking #restaurant #foodie"
            },
            viralPotential: "7",
            bestTime: "7:00 PM (dinner time)"
        };
    }
}

// New Realtime Conversation endpoint
app.post('/api/conversation/start', async (req, res) => {
    try {
        console.log('🎙️ Starting new conversation session...');
        const session = await realtimeHandler.createRealtimeSession();
        res.json({
            success: true,
            session_id: session.id,
            message: "Conversation session started! I'm your restaurant marketing expert. How can I help you today?"
        });
    } catch (error) {
        console.error('❌ Conversation start error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start conversation session'
        });
    }
});

app.post('/api/conversation/audio', async (req, res) => {
    try {
        const { audio, session_id } = req.body;
        
        if (!audio) {
            return res.status(400).json({
                success: false,
                error: 'Audio data required'
            });
        }
        
        console.log('🎵 Processing conversational audio...');
        
        // Convert base64 audio to buffer
        const audioBuffer = Buffer.from(audio, 'base64');
        
        // Create session object (temporary until full realtime implementation)
        const session = { id: session_id || 'default' };
        
        // Process audio with realtime handler
        const result = await realtimeHandler.processAudioInput(audioBuffer, session);
        
        res.json({
            success: true,
            transcript: result.transcript,
            response: result.response,
            session_id: result.session_id,
            audio_response: result.audioResponse ? result.audioResponse.toString('base64') : null
        });
        
    } catch (error) {
        console.error('❌ Conversation audio error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process conversational audio'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🍽️ ChefSocial AI Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to test the conversational assistant`);
});

// WebSocket Server for Realtime Communication
const wss = new WebSocket.Server({ 
    server,
    path: '/ws/conversation'
});

console.log('🔌 WebSocket server ready at ws://localhost:' + PORT + '/ws/conversation');
console.log('🧠 Natural conversation ready at ws://localhost:' + PORT + '/ws/natural-conversation');

// Natural Conversation WebSocket
const naturalWss = new WebSocket.Server({ 
    server,
    path: '/ws/natural-conversation'
});

naturalWss.on('connection', (ws) => {
    console.log('🧠 New natural conversation client connected');
    
    let sessionId = null;
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'start_natural_session') {
                sessionId = `natural_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                
                // Create natural conversation session
                naturalHandler.createSession(sessionId);
                
                // Send initial greeting
                const greeting = naturalHandler.getInitialGreeting();
                
                ws.send(JSON.stringify({
                    type: 'session_ready',
                    session_id: sessionId,
                    message: greeting
                }));
                
                console.log('✅ Natural session started:', sessionId);
                
            } else if (data.type === 'audio_chunk') {
                // Convert audio array to buffer
                const audioBuffer = Buffer.from(data.audio);
                
                // Process with natural conversation handler
                const result = await naturalHandler.processVoiceInput(sessionId, audioBuffer);
                
                // Send response back to client
                ws.send(JSON.stringify({
                    type: 'conversation_response',
                    transcript: result.transcript,
                    response: result.response,
                    audio_response: result.audioResponse ? result.audioResponse.toString('base64') : null,
                    session_id: sessionId
                }));
                
            } else if (data.type === 'audio_end') {
                // Audio processing handled in audio_chunk for fallback version
                console.log('🎤 Audio input ended');
                
            } else if (data.type === 'interrupt') {
                // Handle interruption (could implement response cancellation)
                console.log('⚡ Conversation interrupted');
            }
            
        } catch (error) {
            console.error('❌ Natural conversation error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Sorry, I had trouble processing that. Could you try again?'
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('🧠 Natural conversation client disconnected');
        if (sessionId) {
            naturalHandler.closeSession(sessionId);
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ Natural conversation WebSocket error:', error);
    });
});

// Original Conversation WebSocket (for backward compatibility)
wss.on('connection', (ws) => {
    console.log('👋 New conversation client connected');
    
    let sessionId = null;
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'start_session') {
                const session = await realtimeHandler.createRealtimeSession();
                sessionId = session.id;
                
                ws.send(JSON.stringify({
                    type: 'session_started',
                    session_id: sessionId,
                    message: "Hi! I'm your ChefSocial marketing expert. Tell me about your restaurant and what you'd like to work on today!"
                }));
                
            } else if (data.type === 'audio_chunk') {
                // Handle real-time audio streaming
                const audioBuffer = Buffer.from(data.audio, 'base64');
                const session = { id: sessionId };
                
                const result = await realtimeHandler.processAudioInput(audioBuffer, session);
                
                ws.send(JSON.stringify({
                    type: 'conversation_response',
                    transcript: result.transcript,
                    response: result.response,
                    audio_response: result.audioResponse ? result.audioResponse.toString('base64') : null
                }));
            }
            
        } catch (error) {
            console.error('❌ WebSocket message error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Sorry, I had trouble processing that. Could you try again?'
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('👋 Conversation client disconnected');
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

// Apply global error handling middleware (must be last)
app.use(errorHandler);

// Handle 404 errors for undefined routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`
    });
});

// Handle cleanup
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    console.log('Shutting down server due to uncaught exception...');
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    console.log('Shutting down server due to unhandled promise rejection...');
    process.exit(1);
});