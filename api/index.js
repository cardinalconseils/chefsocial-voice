// ChefSocial Voice AI - Vercel Serverless Entry Point
// Simplified version for serverless deployment

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Create Express app
const app = express();

// Basic security and CORS
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", "ws:", "wss:"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    }
}));

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'production',
        serverless: true
    });
});

// Info endpoint
app.get('/api/info', (req, res) => {
    res.json({
        name: 'ChefSocial Voice AI API',
        version: '2.0.0',
        description: 'Advanced voice-to-content AI platform for restaurants',
        environment: process.env.NODE_ENV || 'production',
        status: 'operational',
        serverless: true,
        timestamp: new Date().toISOString()
    });
});

// Languages endpoint
app.get('/api/languages', (req, res) => {
    res.json({
        success: true,
        languages: [
            { code: 'en', name: 'English', nativeName: 'English' },
            { code: 'fr', name: 'Français', nativeName: 'Français' }
        ],
        current: 'en',
        total: 2
    });
});

// Temporary auth endpoints (simplified)
app.post('/api/auth/login', (req, res) => {
    res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Authentication service is being migrated to microservices architecture',
        temporaryStatus: 'under-maintenance'
    });
});

app.post('/api/auth/register', (req, res) => {
    res.status(503).json({
        success: false,
        error: 'Service Unavailable', 
        message: 'Registration service is being migrated to microservices architecture',
        temporaryStatus: 'under-maintenance'
    });
});

// Catch all for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`,
        availableEndpoints: [
            'GET /api/health',
            'GET /api/info',
            'GET /api/languages',
            'POST /api/auth/login (maintenance)',
            'POST /api/auth/register (maintenance)'
        ]
    });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Serverless function error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred in the serverless function',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;