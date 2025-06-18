// ChefSocial Voice AI - Authentication Microservice
// Dedicated serverless function for authentication

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const Stripe = require('stripe');

// Initialize app
const app = express();

// Middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '1mb' }));

// Validation middleware
const validateRequest = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                details: errors.array()
            });
        }
        
        next();
    };
};

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...');

// Mock database for development
let users = [
  {
    id: 'user_demo',
    email: 'demo@chefsocial.io',
    password: '$2a$10$example.hash.for.demo.user', // 'demo123'
    name: 'Demo User',
    restaurantName: 'Demo Restaurant',
    role: 'user',
    subscriptionStatus: 'trialing',
    trialStartDate: new Date().toISOString(),
    trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    stripeCustomerId: null,
    createdAt: new Date().toISOString()
  }
];

// POST /api/auth/register
app.post('/api/auth/register', 
    validateRequest([
        body('email').isEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('name').notEmpty().withMessage('Name is required'),
        body('restaurantName').notEmpty().withMessage('Restaurant name is required'),
        body('cuisineType').notEmpty().withMessage('Cuisine type is required'),
        body('location').notEmpty().withMessage('Location is required'),
        body('phone').notEmpty().withMessage('Phone is required'),
        body('marketingConsent').isBoolean().withMessage('Marketing consent must be a boolean')
    ]),
    async (req, res) => {
        try {
            const { email, password, name, restaurantName, cuisineType, location, phone, marketingConsent } = req.body;
            
            // Check if user exists
            if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
                return res.status(409).json({
                    success: false,
                    error: 'User already exists',
                    message: 'An account with this email already exists'
                });
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);
            
            // Create Stripe customer
            let stripeCustomerId = null;
            try {
                const stripeCustomer = await stripe.customers.create({
                    email,
                    name,
                    metadata: {
                        restaurant_name: restaurantName,
                        cuisine_type: cuisineType,
                        location: location,
                        phone: phone,
                        source: 'chefsocial_registration',
                        marketing_consent: marketingConsent.toString()
                    }
                });
                stripeCustomerId = stripeCustomer.id;
                console.log('Stripe customer created:', stripeCustomerId);
            } catch (stripeError) {
                console.error('Stripe customer creation failed:', stripeError);
                // Continue with registration even if Stripe fails
            }
            
            // Create user
            const user = {
                id: Date.now().toString(),
                email,
                name,
                password: hashedPassword,
                restaurantName,
                cuisineType,
                location,
                phone,
                role: 'user',
                subscriptionStatus: 'trialing',
                trialStartDate: new Date().toISOString(),
                trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                stripeCustomerId,
                stripeSubscriptionId: null,
                marketingConsent,
                createdAt: new Date().toISOString(),
                lastLoginAt: null,
                emailVerified: false,
                onboardingCompleted: false
            };
            
            users.push(user);
            
            // Generate JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET || 'dev-secret',
                { expiresIn: '24h' }
            );
            
            res.json({
                success: true,
                message: 'Registration successful',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    restaurantName: user.restaurantName,
                    cuisineType: user.cuisineType,
                    location: user.location,
                    phone: user.phone,
                    role: user.role,
                    subscriptionStatus: user.subscriptionStatus,
                    trialEndDate: user.trialEndDate,
                    stripeCustomerId: user.stripeCustomerId,
                    onboardingCompleted: user.onboardingCompleted
                },
                token
            });
            
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                error: 'Registration failed',
                message: 'An error occurred during registration'
            });
        }
    }
);

// POST /api/auth/login
app.post('/api/auth/login',
    validateRequest([
        body('email').isEmail().withMessage('Valid email required'),
        body('password').notEmpty().withMessage('Password is required')
    ]),
    async (req, res) => {
        try {
            const { email, password } = req.body;
            
            // Find user
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                    message: 'Email or password is incorrect'
                });
            }
            
            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                    message: 'Email or password is incorrect'
                });
            }
            
            // Update last login
            user.lastLoginAt = new Date().toISOString();
            
            // Generate JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET || 'dev-secret',
                { expiresIn: '24h' }
            );
            
            // Calculate trial days remaining
            const trialEnd = new Date(user.trialEndDate);
            const now = new Date();
            const trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
            
            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    restaurantName: user.restaurantName,
                    cuisineType: user.cuisineType,
                    location: user.location,
                    phone: user.phone,
                    role: user.role,
                    subscriptionStatus: user.subscriptionStatus,
                    trialEndDate: user.trialEndDate,
                    stripeCustomerId: user.stripeCustomerId,
                    onboardingCompleted: user.onboardingCompleted
                },
                token,
                trialInfo: {
                    trialDaysRemaining,
                    trialEndDate: user.trialEndDate,
                    subscriptionRequired: trialDaysRemaining <= 3
                }
            });
            
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Login failed',
                message: 'An error occurred during login'
            });
        }
    }
);

// GET /api/auth/verify
app.get('/api/auth/verify', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided',
                message: 'Authorization token is required'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        const user = users.find(u => u.id === decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                message: 'User not found'
            });
        }
        
        // Calculate trial days remaining
        const trialEnd = new Date(user.trialEndDate);
        const now = new Date();
        const trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                restaurantName: user.restaurantName,
                cuisineType: user.cuisineType,
                location: user.location,
                phone: user.phone,
                role: user.role,
                subscriptionStatus: user.subscriptionStatus,
                trialEndDate: user.trialEndDate,
                stripeCustomerId: user.stripeCustomerId,
                onboardingCompleted: user.onboardingCompleted
            },
            trialInfo: {
                trialDaysRemaining,
                trialEndDate: user.trialEndDate,
                subscriptionRequired: trialDaysRemaining <= 3
            }
        });
        
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid token',
            message: 'Token verification failed'
        });
    }
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Auth service error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred in the authentication service'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `Authentication endpoint ${req.method} ${req.originalUrl} does not exist`,
        availableEndpoints: [
            'POST /api/auth/register',
            'POST /api/auth/login', 
            'GET /api/auth/verify'
        ]
    });
});

module.exports = app; 