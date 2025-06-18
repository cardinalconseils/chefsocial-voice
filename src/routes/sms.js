// ChefSocial Voice AI - SMS Routes (Refactored)
const express = require('express');
const router = express.Router();
const { asyncHandler, validateRequest } = require('../middleware/validation');
const { body, query, param } = require('express-validator');

// Import SMS services
const SMSWorkflowService = require('../services/sms-workflow-service');
const SMSWebhookService = require('../services/sms-webhook-service');
const SMSSessionService = require('../services/sms-session-service');
const SMSConfigService = require('../services/sms-config-service');

module.exports = (app) => {
    const services = app.locals.services;
    const { authSystem, logger, rateLimitService, twilio } = services;
    
    // Initialize SMS services
    const smsWorkflow = new SMSWorkflowService(services);
    const smsWebhook = new SMSWebhookService(services);
    const smsSession = new SMSSessionService(services);
    const smsConfig = new SMSConfigService(services);
    
    const smsLimiter = rateLimitService.createEndpointLimiter('sms');
    
    // Validation schemas
    const smsApprovalValidation = validateRequest([
        body('contentId').isString().notEmpty().withMessage('Content ID is required')
    ]);

    const smsConfigValidation = validateRequest([
        body('phoneNumber').optional().isMobilePhone(),
        body('notifications').optional().isBoolean(),
        body('dailySuggestions').optional().isBoolean(),
        body('approvalWorkflow').optional().isBoolean()
    ]);

    // SMS Workflow Endpoints
    router.post('/send-approval', 
        authSystem.authMiddleware(),
        authSystem.featureAccessMiddleware('voice_content_creation'),
        smsLimiter,
        smsApprovalValidation,
        asyncHandler(async (req, res) => {
            const { contentId } = req.body;
            
            const result = await smsWorkflow.sendContentForApproval(req.userId, contentId, req);
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    router.post('/daily-suggestions', 
        authSystem.authMiddleware(),
        smsLimiter,
        asyncHandler(async (req, res) => {
            const result = await smsWorkflow.sendDailySuggestions(req.userId, req);
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    router.get('/workflows', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const { status = 'all', limit = 50 } = req.query;
            
            const result = await smsWorkflow.getUserWorkflows(req.userId, status, limit);
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    router.get('/workflow/:workflowId', 
        authSystem.authMiddleware(),
        validateRequest([
            param('workflowId').isString().notEmpty()
        ]),
        asyncHandler(async (req, res) => {
            const { workflowId } = req.params;
            
            const workflow = await smsWorkflow.getWorkflow(workflowId, req.userId);
            
            res.json({
                success: true,
                workflow
            });
        })
    );

    router.get('/stats', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const { timeframe = '30' } = req.query;
            
            const result = await smsWorkflow.getUserStats(req.userId, timeframe);
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    router.post('/test', 
        authSystem.authMiddleware(),
        smsLimiter,
        asyncHandler(async (req, res) => {
            const result = await smsWorkflow.sendTestSMS(req.userId, req);
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    // SMS Webhook Endpoints
    router.post('/webhook', 
        express.raw({type: 'application/x-www-form-urlencoded'}), 
        asyncHandler(async (req, res) => {
            const twiml = await smsWebhook.processIncomingSMS(req, res);
            res.type('text/xml').send(twiml);
        })
    );

    router.post('/webhook/image-received', 
        express.raw({type: 'application/x-www-form-urlencoded'}), 
        asyncHandler(async (req, res) => {
            const twiml = await smsWebhook.processImageReceived(req, res);
            res.type('text/xml').send(twiml);
        })
    );

    router.post('/webhook/schedule-response', 
        express.raw({type: 'application/x-www-form-urlencoded'}), 
        asyncHandler(async (req, res) => {
            const twiml = await smsWebhook.processScheduleResponse(req, res, app);
            res.type('text/xml').send(twiml);
        })
    );

    router.post('/test-webhook', 
        express.raw({type: 'application/x-www-form-urlencoded'}), 
        asyncHandler(async (req, res) => {
            const result = await smsWebhook.processTestWebhook(req, res);
            
            // Return JSON for testing, TwiML for actual Twilio
            const isTestCall = req.headers['user-agent']?.includes('test') || 
                              req.query.format === 'json';
            
            if (isTestCall) {
                res.json(result);
            } else {
                res.type('text/xml').send(result);
            }
        })
    );

    // SMS Session Management Endpoints
    router.get('/sessions', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const { status = 'all', limit = 50 } = req.query;
            
            const result = await smsSession.getBriefingSessions(req.userId, status, limit);
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    router.get('/session/:sessionId', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            
            const result = await smsSession.getBriefingSession(sessionId, req.userId);
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    router.post('/session/:sessionId/reschedule', 
        authSystem.authMiddleware(),
        validateRequest([
            body('scheduledTime').isISO8601().withMessage('Valid scheduled time required')
        ]),
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            const { scheduledTime } = req.body;
            
            const result = await smsSession.rescheduleSession(sessionId, req.userId, scheduledTime, req);
            
            res.json({
                success: true,
                sessionId,
                ...result
            });
        })
    );

    router.get('/webhook-logs', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const { limit = 50, hours = 24 } = req.query;
            
            const result = await smsSession.getWebhookLogs(req.userId, limit, hours);
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    // SMS Configuration Endpoints
    router.put('/config', 
        authSystem.authMiddleware(),
        smsConfigValidation,
        asyncHandler(async (req, res) => {
            const { phoneNumber, notifications, dailySuggestions, approvalWorkflow } = req.body;
            
            const configData = { phoneNumber, notifications, dailySuggestions, approvalWorkflow };
            const result = await smsConfig.updateSMSConfig(req.userId, configData, req);
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    router.get('/config', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const result = await smsConfig.getSMSConfig(req.userId);
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    // Error handling middleware for SMS routes
    router.use((error, req, res, next) => {
        // Log SMS errors
        logger.error('SMS route error', error, {
            userId: req.userId,
            path: req.path,
            method: req.method
        });

        // Handle SMS-specific errors
        if (error.message && error.message.includes('Twilio')) {
            return res.status(500).json({
                success: false,
                error: 'SMS service error',
                message: 'Unable to process SMS request'
            });
        }

        if (error.message && error.message.includes('phone')) {
            return res.status(400).json({
                success: false,
                error: 'Phone number error',
                message: 'Valid phone number required for SMS features'
            });
        }

        if (error.message && error.message.includes('workflow')) {
            return res.status(400).json({
                success: false,
                error: 'SMS workflow error',
                message: error.message
            });
        }

        // Default error response
        res.status(500).json({
            success: false,
            error: 'SMS operation error',
            message: error.message || 'An SMS operation error occurred'
        });
    });

    return router;
};