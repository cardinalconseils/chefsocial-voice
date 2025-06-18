// ChefSocial Voice AI - Vercel Serverless Entry Point
// Simplified version for serverless deployment

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const Stripe = require('stripe');

// Initialize Stripe with secret key
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...');

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

// Mock database for admin functionality
let mockUsers = [
  {
    id: 'user_1',
    name: 'John Doe',
    email: 'john@restaurant.com',
    restaurantName: 'John\'s Bistro',
    subscriptionStatus: 'trialing',
    trialStartDate: '2024-01-01T00:00:00Z',
    trialEndDate: '2024-01-15T00:00:00Z',
    monthlyAmount: 7900,
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-01-10T10:30:00Z',
    stripeCustomerId: 'cus_test_123',
    stripeSubscriptionId: null
  },
  {
    id: 'user_2',
    name: 'Jane Smith',
    email: 'jane@foodplace.com',
    restaurantName: 'Jane\'s Kitchen',
    subscriptionStatus: 'active',
    trialStartDate: '2023-12-01T00:00:00Z',
    trialEndDate: '2023-12-15T00:00:00Z',
    subscriptionStartDate: '2023-12-15T00:00:00Z',
    lastPaymentDate: '2024-01-01T00:00:00Z',
    nextPaymentDate: '2024-02-01T00:00:00Z',
    monthlyAmount: 7900,
    paymentMethodLast4: '4242',
    createdAt: '2023-12-01T00:00:00Z',
    lastLoginAt: '2024-01-09T15:45:00Z',
    stripeCustomerId: 'cus_test_456',
    stripeSubscriptionId: 'sub_test_789'
  }
];

let mockActivity = [
  {
    id: 'activity_1',
    type: 'trial_started',
    userId: 'user_1',
    userName: 'John Doe',
    userEmail: 'john@restaurant.com',
    timestamp: '2024-01-01T00:00:00Z'
  },
  {
    id: 'activity_2',
    type: 'subscription_created',
    userId: 'user_2',
    userName: 'Jane Smith',
    userEmail: 'jane@foodplace.com',
    amount: 7900,
    timestamp: '2023-12-15T00:00:00Z'
  }
];

// Helper functions for admin
const calculateStats = () => {
  const totalUsers = mockUsers.length;
  const activeTrials = mockUsers.filter(u => u.subscriptionStatus === 'trialing').length;
  const activeSubscriptions = mockUsers.filter(u => u.subscriptionStatus === 'active').length;
  const cancelledSubscriptions = mockUsers.filter(u => u.subscriptionStatus === 'cancelled').length;
  
  const totalRevenue = mockActivity
    .filter(a => a.type === 'payment_succeeded')
    .reduce((sum, a) => sum + (a.amount || 0), 0);
  
  const monthlyRecurringRevenue = activeSubscriptions * 7900;
  const trialConversionRate = totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0;
  const churnRate = totalUsers > 0 ? (cancelledSubscriptions / totalUsers) * 100 : 0;
  
  return {
    totalUsers,
    activeTrials,
    activeSubscriptions,
    cancelledSubscriptions,
    totalRevenue,
    monthlyRecurringRevenue,
    trialConversionRate,
    churnRate
  };
};

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.substring(7);
  if (!token.startsWith('admin_') && token !== 'admin123') {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
  
  next();
};

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.2.0',
        environment: process.env.NODE_ENV || 'production',
        serverless: true,
        adminApiIntegrated: true,
        vercelConfigFixed: true
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

// Admin endpoints
app.get('/api/admin', (req, res) => {
    res.json({
        success: true,
        service: 'ChefSocial Admin API',
        message: 'Admin API is running',
        availableEndpoints: [
            'POST /api/admin/auth/login',
            'GET /api/admin/stats',
            'GET /api/admin/users',
            'POST /api/admin/users/action',
            'GET /api/admin/activity',
            'GET /api/admin/settings'
        ]
    });
});

app.post('/api/admin/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    
    if (email === 'admin@chefsocial.io' && password === 'admin123') {
        return res.status(200).json({
            success: true,
            token: 'admin_token_12345',
            user: {
                id: 'admin_1',
                email: 'admin@chefsocial.io',
                role: 'admin',
                name: 'Admin User'
            }
        });
    } else {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }
});

app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
    const stats = calculateStats();
    res.json({
        success: true,
        data: stats
    });
});

app.get('/api/admin/users', authenticateAdmin, (req, res) => {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    
    let filteredUsers = mockUsers;
    
    // Filter by search
    if (search) {
        filteredUsers = filteredUsers.filter(user => 
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase()) ||
            user.restaurantName.toLowerCase().includes(search.toLowerCase())
        );
    }
    
    // Filter by status
    if (status) {
        filteredUsers = filteredUsers.filter(user => user.subscriptionStatus === status);
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    // Calculate trial days remaining
    const usersWithTrialInfo = paginatedUsers.map(user => {
        let trialDaysRemaining = 0;
        if (user.subscriptionStatus === 'trialing' && user.trialEndDate) {
            const trialEnd = new Date(user.trialEndDate);
            const now = new Date();
            trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
        }
        
        return {
            ...user,
            trialDaysRemaining
        };
    });
    
    res.json({
        success: true,
        data: {
            users: usersWithTrialInfo,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: filteredUsers.length,
                pages: Math.ceil(filteredUsers.length / limit)
            }
        }
    });
});

app.get('/api/admin/activity', authenticateAdmin, (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedActivity = mockActivity.slice(startIndex, endIndex);
    
    res.json({
        success: true,
        data: {
            activities: paginatedActivity,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: mockActivity.length,
                pages: Math.ceil(mockActivity.length / limit)
            }
        }
    });
});

app.get('/api/admin/settings', authenticateAdmin, (req, res) => {
    res.json({
        success: true,
        data: {
            trialLengthDays: 14,
            extensionDays: 7,
            monthlyPriceCents: 7900,
            gracePeriodDays: 3,
            reminderDays: [7, 3, 1],
            emailNotificationsEnabled: true,
            webhookUrl: 'https://chefsocial-voice.vercel.app/api/admin/stripe/webhook'
        }
    });
});

// Redirect auth requests to dedicated microservice
app.use('/api/auth*', (req, res) => {
    res.json({
        success: true,
        message: 'Authentication service is now available as a dedicated microservice',
        redirectTo: '/api/auth',
        availableEndpoints: [
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/verify'
        ],
        note: 'Authentication requests are handled by a separate serverless function'
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
            'GET /api/admin',
            'POST /api/admin/auth/login',
            'GET /api/admin/stats',
            'GET /api/admin/users',
            'GET /api/admin/activity',
            'GET /api/admin/settings',
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