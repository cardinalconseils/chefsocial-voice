// ChefSocial Voice AI - Express Application Configuration
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

// Import configuration and middleware
const config = require('./config/environment');
const middleware = require('./middleware');
const routes = require('./routes');

// Initialize Express app
const app = express();

// Initialize services (moved from original server)
const ChefSocialAuth = require('./services/auth-system');
const ChefSocialLogger = require('./services/logging-system');
const ChefSocialRateLimitService = require('./services/rate-limit-service');
const ChefSocialLiveKitService = require('./services/livekit-service');
const SMSService = require('./services/sms-service');
const BriefingSessionService = require('./services/briefing-session-service');
const VoiceCallingService = require('./services/voice-calling-service');
const EnhancedVoiceAgent = require('./services/enhanced-voice-agent');
const RealtimeHandler = require('./services/realtime-handler');
const NaturalConversationFallback = require('./services/natural-conversation-fallback');
const I18nManager = require('../i18n');
const ValidationSystem = require('./services/validation-system');
const N8NCoordinator = require('./services/n8n-coordinator');
const twilio = require('twilio');

// Initialize Twilio Client
// const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Initialize core services
const authSystem = new ChefSocialAuth();
const logger = new ChefSocialLogger(authSystem.db);
const rateLimitService = new ChefSocialRateLimitService(authSystem.db);
const validationSystem = new ValidationSystem();
const i18n = new I18nManager();
// const liveKitService = new ChefSocialLiveKitService(logger, authSystem.db);
// const briefingSessionService = new BriefingSessionService(authSystem.db, null, logger);
// const voiceCallingService = new VoiceCallingService(authSystem.db, logger);
// const smsService = new SMSService();
// const enhancedVoiceAgent = new EnhancedVoiceAgent();
// const realtimeHandler = new RealtimeHandler();
// const naturalHandler = new NaturalConversationFallback();
// const n8nCoordinator = new N8NCoordinator(logger, authSystem.db);

// Inject service dependencies after initialization
// briefingSessionService.smsService = smsService;
// smsService.setServices(briefingSessionService, voiceCallingService);

// Store services in app locals for access in routes
app.locals.services = {
    authSystem,
    logger,
    rateLimitService,
    validationSystem,
    i18n,
    // liveKitService,
    // smsService,
    // briefingSessionService,
    // voiceCallingService,
    // enhancedVoiceAgent,
    // realtimeHandler,
    // naturalHandler,
    // n8nCoordinator,
    // twilio: twilioClient
};

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "js.stripe.com"],
            connectSrc: ["'self'", "api.openai.com", "api.stripe.com", "ws:", "wss:"],
            imgSrc: ["'self'", "data:", "https:"],
            mediaSrc: ["'self'", "data:"]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? config.production.cors.origins
        : config.development.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Apply core middleware
app.use(middleware.requestLogger(logger));
app.use(middleware.rateLimiting(rateLimitService));
app.use(middleware.internationalization(i18n));  
app.use(middleware.security(validationSystem));
app.use(middleware.timeout());

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use(express.static('public'));

// Health check endpoint (always available)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Mount API routes - pass app instance for service access
app.use('/api', routes(app));

// Set up N8N callback endpoints
// n8nCoordinator.createN8NEndpoints(app);

// Global error handling middleware (must be last)
app.use(middleware.errorHandler(logger));

// 404 handler for unmatched routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`,
        availableEndpoints: [
            'GET /health',
            'GET /api/features',
            'POST /api/auth/login',
            'POST /api/auth/register',
            'GET /api/user/profile',
            'POST /api/process-voice'
        ]
    });
});

// Schedule periodic cleanup tasks
/*
setInterval(() => {
    try {
        smsService.cleanupExpiredWorkflows();
        logger.info('Scheduled cleanup completed', { task: 'sms_workflows' });
    } catch (error) {
        logger.error('Scheduled cleanup failed', error, { task: 'sms_workflows' });
    }
}, 60 * 60 * 1000); // 1 hour
*/

// Log application startup
logger.info('ChefSocial Voice AI application initialized', {
    environment: process.env.NODE_ENV || 'development',
    cors: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    features: {
        livekit: !!process.env.LIVEKIT_API_KEY,
        sms: !!process.env.TWILIO_ACCOUNT_SID,
        stripe: !!process.env.STRIPE_SECRET_KEY,
        n8n: !!process.env.N8N_WEBHOOK_URL
    }
});

module.exports = app;