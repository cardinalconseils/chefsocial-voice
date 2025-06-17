// ChefSocial Voice AI - SMS Routes
const express = require('express');
const router = express.Router();
const { asyncHandler, validateRequest } = require('../middleware/validation');
const { body, query } = require('express-validator');

// SMS routes module - receives services from app.js
module.exports = (app) => {
    const { authSystem, logger, rateLimitService, smsService, twilio } = app.locals.services;
    
    // Rate limiter for SMS endpoints
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

    // POST /api/sms/send-approval
    router.post('/send-approval', 
        authSystem.authMiddleware(),
        authSystem.featureAccessMiddleware('voice_content_creation'),
        smsLimiter,
        smsApprovalValidation,
        asyncHandler(async (req, res) => {
            const { contentId } = req.body;
            
            // Get the content
            const content = await authSystem.db.db.get(`
                SELECT * FROM generated_content 
                WHERE id = ? AND user_id = ?
            `, [contentId, req.userId]);
            
            if (!content) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Content not found' 
                });
            }

            // Check if user has phone number
            const user = await authSystem.db.getUserById(req.userId);
            if (!user.phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number required for SMS approval',
                    message: 'Please add your phone number to your profile to use SMS features'
                });
            }
            
            // Send SMS for approval
            const result = await smsService.sendContentForApproval(req.userId, contentId, content);
            
            // Audit log SMS approval request
            await logger.auditUserAction(
                req.userId,
                'sms_approval_sent',
                'content',
                contentId,
                {
                    platform: content.platform,
                    contentType: content.content_type,
                    workflowId: result.workflowId,
                    phoneNumber: user.phone.slice(-4) // Only log last 4 digits
                },
                req
            );

            logger.info('SMS approval sent', {
                userId: req.userId,
                contentId,
                workflowId: result.workflowId,
                platform: content.platform
            });
            
            res.json({
                success: true,
                message: 'SMS sent for approval',
                workflowId: result.workflowId,
                content: {
                    id: contentId,
                    platform: content.platform,
                    preview: content.caption.substring(0, 100) + '...'
                }
            });
        })
    );

    // POST /api/sms/daily-suggestions
    router.post('/daily-suggestions', 
        authSystem.authMiddleware(),
        smsLimiter,
        asyncHandler(async (req, res) => {
            // Check if user has phone number
            const user = await authSystem.db.getUserById(req.userId);
            if (!user.phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number required for SMS suggestions',
                    message: 'Please add your phone number to your profile to receive SMS suggestions'
                });
            }

            const result = await smsService.sendDailyContentSuggestions(req.userId);
            
            // Audit log daily suggestions request
            await logger.auditUserAction(
                req.userId,
                'sms_daily_suggestions_sent',
                'sms',
                null,
                {
                    suggestionsCount: result.suggestions?.length || 0,
                    phoneNumber: user.phone.slice(-4)
                },
                req
            );

            logger.info('Daily SMS suggestions sent', {
                userId: req.userId,
                suggestionsCount: result.suggestions?.length || 0
            });
            
            res.json({
                success: true,
                message: 'Daily suggestions sent via SMS',
                suggestions: result.suggestions,
                sentAt: new Date().toISOString()
            });
        })
    );

    // POST /api/sms/webhook - Twilio webhook for incoming SMS
    router.post('/webhook', 
        express.raw({type: 'application/x-www-form-urlencoded'}), 
        asyncHandler(async (req, res) => {
            // Parse Twilio webhook data
            const twiml = new twilio.twiml.MessagingResponse();
            
            const fromNumber = req.body.From;
            const messageBody = req.body.Body;
            const messageSid = req.body.MessageSid;
            
            logger.info('Incoming SMS received', {
                fromNumber: fromNumber.slice(-4), // Only log last 4 digits
                messageLength: messageBody?.length || 0,
                messageSid
            });
            
            try {
                // Process the incoming SMS
                await smsService.processIncomingSMS(fromNumber, messageBody, messageSid);
                
                // Log successful SMS processing
                logger.info('SMS processed successfully', {
                    fromNumber: fromNumber.slice(-4),
                    messageSid
                });
                
            } catch (error) {
                logger.error('SMS processing failed', error, {
                    fromNumber: fromNumber.slice(-4),
                    messageSid,
                    messageBody: messageBody?.substring(0, 50)
                });
            }
            
            // Respond with empty TwiML (we handle responses separately)
            res.type('text/xml').send(twiml.toString());
        })
    );

    // GET /api/sms/workflows
    router.get('/workflows', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const { status = 'all', limit = 50 } = req.query;
            
            // Get user's SMS workflows
            const userWorkflows = [];
            
            if (smsService && smsService.workflows) {
                for (const [id, workflow] of smsService.workflows.entries()) {
                    if (workflow.userId === req.userId) {
                        if (status === 'all' || workflow.status === status) {
                            userWorkflows.push({
                                id: id,
                                type: workflow.type,
                                status: workflow.status,
                                createdAt: workflow.createdAt,
                                expiresAt: workflow.expiresAt,
                                contentId: workflow.contentId,
                                platform: workflow.platform
                            });
                        }
                    }
                }
            }
            
            // Sort by creation date (newest first) and limit results
            const sortedWorkflows = userWorkflows
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, parseInt(limit));

            logger.info('SMS workflows retrieved', {
                userId: req.userId,
                workflowCount: sortedWorkflows.length,
                status
            });
            
            res.json({
                success: true,
                workflows: sortedWorkflows,
                total: sortedWorkflows.length,
                status: status
            });
        })
    );

    // GET /api/sms/workflow/:workflowId
    router.get('/workflow/:workflowId', 
        authSystem.authMiddleware(),
        validateRequest([
            query('workflowId').isString().notEmpty()
        ]),
        asyncHandler(async (req, res) => {
            const { workflowId } = req.params;
            
            if (!smsService || !smsService.workflows) {
                return res.status(404).json({
                    success: false,
                    error: 'SMS service not available'
                });
            }
            
            const workflow = smsService.workflows.get(workflowId);
            
            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: 'Workflow not found'
                });
            }
            
            // Check if workflow belongs to user
            if (workflow.userId !== req.userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            logger.info('SMS workflow accessed', {
                userId: req.userId,
                workflowId,
                status: workflow.status
            });
            
            res.json({
                success: true,
                workflow: {
                    id: workflowId,
                    type: workflow.type,
                    status: workflow.status,
                    createdAt: workflow.createdAt,
                    expiresAt: workflow.expiresAt,
                    contentId: workflow.contentId,
                    platform: workflow.platform,
                    responses: workflow.responses || [],
                    lastActivity: workflow.lastActivity
                }
            });
        })
    );

    // PUT /api/sms/config
    router.put('/config', 
        authSystem.authMiddleware(),
        smsConfigValidation,
        asyncHandler(async (req, res) => {
            const { phoneNumber, notifications, dailySuggestions, approvalWorkflow } = req.body;
            
            // Update user's SMS preferences
            const updateFields = [];
            const updateValues = [];
            
            if (phoneNumber !== undefined) {
                updateFields.push('phone = ?');
                updateValues.push(phoneNumber);
            }
            
            // Store SMS preferences in user metadata or separate table
            const smsPreferences = {
                notifications: notifications !== undefined ? notifications : true,
                dailySuggestions: dailySuggestions !== undefined ? dailySuggestions : false,
                approvalWorkflow: approvalWorkflow !== undefined ? approvalWorkflow : true
            };
            
            if (updateFields.length > 0) {
                updateFields.push('updated_at = CURRENT_TIMESTAMP');
                updateValues.push(req.userId);
                
                await authSystem.db.db.run(`
                    UPDATE users 
                    SET ${updateFields.join(', ')}
                    WHERE id = ?
                `, updateValues);
            }
            
            // Store SMS preferences (you might want to create a separate table for this)
            // For now, we'll store in user metadata or handle in the SMS service
            
            // Audit log SMS config update
            await logger.auditUserAction(
                req.userId,
                'sms_config_update',
                'user',
                req.userId,
                {
                    phoneNumberUpdated: phoneNumber !== undefined,
                    preferences: smsPreferences
                },
                req
            );

            logger.info('SMS configuration updated', {
                userId: req.userId,
                phoneNumberUpdated: phoneNumber !== undefined,
                preferences: Object.keys(smsPreferences)
            });
            
            res.json({
                success: true,
                message: 'SMS configuration updated successfully',
                config: {
                    phoneNumber: phoneNumber ? phoneNumber.slice(-4) + ' (updated)' : 'not changed',
                    preferences: smsPreferences
                }
            });
        })
    );

    // GET /api/sms/config
    router.get('/config', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const user = await authSystem.db.getUserById(req.userId);
            
            // Get SMS preferences (from user metadata or separate config)
            const smsConfig = {
                hasPhoneNumber: !!user.phone,
                phoneNumber: user.phone ? '***-***-' + user.phone.slice(-4) : null,
                preferences: {
                    notifications: true, // Default values - you might store these separately
                    dailySuggestions: false,
                    approvalWorkflow: true
                },
                features: {
                    contentApproval: true,
                    dailySuggestions: true,
                    workflowManagement: true
                }
            };

            logger.info('SMS configuration accessed', {
                userId: req.userId,
                hasPhoneNumber: smsConfig.hasPhoneNumber
            });
            
            res.json({
                success: true,
                config: smsConfig
            });
        })
    );

    // POST /api/sms/test
    router.post('/test', 
        authSystem.authMiddleware(),
        smsLimiter,
        asyncHandler(async (req, res) => {
            const user = await authSystem.db.getUserById(req.userId);
            
            if (!user.phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number required for SMS testing'
                });
            }
            
            try {
                // Send test SMS
                const testMessage = `Hello from ChefSocial! This is a test message to confirm your SMS setup is working. Reply STOP to opt out.`;
                
                const result = await smsService.sendSMS(user.phone, testMessage);
                
                // Audit log test SMS
                await logger.auditUserAction(
                    req.userId,
                    'sms_test_sent',
                    'sms',
                    null,
                    {
                        phoneNumber: user.phone.slice(-4),
                        messageSid: result.sid
                    },
                    req
                );

                logger.info('Test SMS sent', {
                    userId: req.userId,
                    phoneNumber: user.phone.slice(-4),
                    messageSid: result.sid
                });
                
                res.json({
                    success: true,
                    message: 'Test SMS sent successfully',
                    sentTo: user.phone.slice(-4),
                    messageSid: result.sid
                });
                
            } catch (error) {
                logger.error('Test SMS failed', error, {
                    userId: req.userId,
                    phoneNumber: user.phone.slice(-4)
                });
                
                res.status(500).json({
                    success: false,
                    error: 'Failed to send test SMS',
                    message: error.message
                });
            }
        })
    );

    // GET /api/sms/stats
    router.get('/stats', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const { timeframe = '30' } = req.query;
            const days = parseInt(timeframe);
            
            // Get SMS usage stats for the user
            let sentCount = 0;
            let receivedCount = 0;
            let activeWorkflows = 0;
            
            if (smsService && smsService.workflows) {
                // Count workflows in the timeframe
                const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
                
                for (const workflow of smsService.workflows.values()) {
                    if (workflow.userId === req.userId && new Date(workflow.createdAt) > cutoffDate) {
                        activeWorkflows++;
                        if (workflow.status === 'active') sentCount++;
                        if (workflow.responses && workflow.responses.length > 0) receivedCount++;
                    }
                }
            }

            const stats = {
                timeframe: days,
                sms: {
                    sent: sentCount,
                    received: receivedCount,
                    activeWorkflows: activeWorkflows
                },
                features: {
                    contentApproval: sentCount > 0,
                    dailySuggestions: false, // Track this separately
                    workflowAutomation: activeWorkflows > 0
                },
                generatedAt: new Date().toISOString()
            };

            logger.info('SMS stats accessed', {
                userId: req.userId,
                timeframe: days,
                stats
            });
            
            res.json({
                success: true,
                stats: stats
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