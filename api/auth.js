// ChefSocial Voice AI - Authentication Microservice
// Dedicated serverless function for authentication

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

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

// Temporary in-memory user store (replace with database)
const users = new Map();

// POST /api/auth/register
app.post('/api/auth/register', 
    validateRequest([
        body('email').isEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('name').notEmpty().withMessage('Name is required')
    ]),
    async (req, res) => {
        try {
            const { email, password, name } = req.body;
            
            // Check if user exists
            if (users.has(email)) {
                return res.status(409).json({
                    success: false,
                    error: 'User already exists',
                    message: 'An account with this email already exists'
                });
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);
            
            // Create user
            const user = {
                id: Date.now().toString(),
                email,
                name,
                password: hashedPassword,
                createdAt: new Date().toISOString(),
                verified: false
            };
            
            users.set(email, user);
            
            // Generate JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email },
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
                    verified: user.verified
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
            const user = users.get(email);
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
            
            // Generate JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET || 'dev-secret',
                { expiresIn: '24h' }
            );
            
            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    verified: user.verified
                },
                token
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
        const user = Array.from(users.values()).find(u => u.id === decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                verified: user.verified
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