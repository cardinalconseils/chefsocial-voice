// ChefSocial Voice AI - Route Registry
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const userRoutes = require('./user');
const adminRoutes = require('./admin');
const voiceRoutes = require('./voice');
const contentRoutes = require('./content');
const restaurantRoutes = require('./restaurant');
const smsRoutes = require('./sms');
const systemRoutes = require('./system');

// Mount route modules - receives app instance with services
module.exports = (app) => {
    // Pass app instance to each route module for service access
    router.use('/auth', authRoutes(app));
    router.use('/user', userRoutes(app));
    router.use('/admin', adminRoutes(app));
    router.use('/voice', voiceRoutes(app));
    router.use('/content', contentRoutes(app));
    router.use('/restaurant', restaurantRoutes(app));
    // router.use('/sms', smsRoutes(app)); // Temporarily disabled - needs route-helpers pattern

    // Mount system routes at root level
    router.use('/', systemRoutes(app));

    // API information endpoint
    router.get('/', (req, res) => {
        res.json({
            name: 'ChefSocial Voice AI API',
            version: '2.0.0',
            description: 'Advanced voice-to-content AI platform for restaurants',
            environment: process.env.NODE_ENV || 'development',
            modules: {
                authentication: '/api/auth',
                userManagement: '/api/user',
                adminPanel: '/api/admin',
                voiceProcessing: '/api/voice',
                contentManagement: '/api/content',
                restaurantFeatures: '/api/restaurant',
                smsWorkflows: '/api/sms',
                systemUtilities: '/api'
            },
            documentation: 'https://docs.chefsocial.io',
            support: 'support@chefsocial.io',
            timestamp: new Date().toISOString()
        });
    });

    return router;
};