// ChefSocial Voice AI - Voice Processing Routes (Refactored)
const express = require('express');
const router = express.Router();
const { asyncHandler, validateRequest } = require('../middleware/validation');
const { body, param } = require('express-validator');

// Import voice services
const VoiceProcessingService = require('../services/voice-processing-service');
const VoiceSessionService = require('../services/voice-session-service');
const VoiceConversationService = require('../services/voice-conversation-service');
const VoiceBriefingService = require('../services/voice-briefing-service');
const VoiceTwiMLService = require('../services/voice-twiml-service');

module.exports = (app) => {
    const services = app.locals.services;
    const { authSystem, logger, rateLimitService, liveKitService } = services;
    
    // Initialize voice services
    const voiceProcessing = new VoiceProcessingService(services);
    const voiceSession = new VoiceSessionService(services);
    const voiceConversation = new VoiceConversationService(services);
    const voiceBriefing = new VoiceBriefingService(services);
    const voiceTwiML = new VoiceTwiMLService(services);
    
    const voiceLimiter = rateLimitService.createEndpointLimiter('voice');
    
    // Validation schemas
    const voiceProcessingValidation = validateRequest([
        body('audio').notEmpty().withMessage('Audio data is required'),
        body('image').optional().isString(),
        body('language').optional().isIn(['en', 'fr'])
    ]);
    
    const sessionValidation = validateRequest([
        body('sessionType').optional().isIn(['voice_chat', 'content_creation', 'brand_learning']),
        body('metadata').optional().isObject()
    ]);
    
    const sessionIdValidation = validateRequest([
        param('sessionId').isUUID().withMessage('Valid session ID required')
    ]);

    const recordingValidation = validateRequest([
        body('recordingOptions').optional().isObject()
    ]);

    // Main voice processing endpoint
    router.post('/process', 
        voiceLimiter,
        authSystem.authMiddleware(), 
        authSystem.featureAccessMiddleware('voice_content_creation'),
        voiceProcessingValidation,
        asyncHandler(async (req, res) => {
            const { audio, image } = req.body;
            const userLanguage = req.language || 'en';
            
            const result = await voiceProcessing.processVoiceRequest(
                req.userId, 
                audio, 
                image, 
                userLanguage, 
                req
            );

            res.json({
                success: true,
                ...result
            });
        })
    );

    // Demo voice processing endpoint
    router.post('/process-demo', 
        asyncHandler(async (req, res) => {
            const { audio, image, language } = req.body;
            const userLanguage = language || 'en';
            
            if (!audio) {
                return res.status(400).json({
                    success: false,
                    error: 'Audio data is required'
                });
            }
            
            const result = await voiceProcessing.processDemoVoiceRequest(audio, image, userLanguage);

            res.json({
                success: true,
                ...result
            });
        })
    );

    // LiveKit Voice Session Management
    router.post('/session/create', 
        authSystem.authMiddleware(),
        sessionValidation,
        asyncHandler(async (req, res) => {
            const { sessionType = 'voice_chat', metadata = {} } = req.body;
            
            const result = await voiceSession.createVoiceSession(req.userId, sessionType, metadata, req);

            res.json({
                success: true,
                ...result
            });
        })
    );

    router.post('/session/join/:sessionId',
        authSystem.authMiddleware(),
        sessionIdValidation,
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            
            const result = await voiceSession.joinVoiceSession(sessionId, req.userId, req);

            res.json({
                success: true,
                ...result
            });
        })
    );

    router.post('/session/end/:sessionId',
        authSystem.authMiddleware(),
        sessionIdValidation,
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            
            const result = await voiceSession.endVoiceSession(sessionId, req.userId, req);

            res.json({
                success: true,
                ...result
            });
        })
    );

    router.get('/session/active',
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const result = await voiceSession.getActiveSession(req.userId);
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    router.get('/session/stats/:sessionId',
        authSystem.authMiddleware(),
        sessionIdValidation,
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            const result = await voiceSession.getSessionStats(sessionId);
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    // Session Recording Management
    router.post('/session/record/start/:sessionId',
        authSystem.authMiddleware(),
        sessionIdValidation,
        recordingValidation,
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            const { recordingOptions = {} } = req.body;
            
            const result = await voiceSession.startSessionRecording(sessionId, req.userId, recordingOptions, req);

            res.json({
                success: true,
                ...result
            });
        })
    );

    router.post('/session/record/stop/:sessionId',
        authSystem.authMiddleware(),
        sessionIdValidation,
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            
            const result = await voiceSession.stopSessionRecording(sessionId, req.userId, req);

            res.json({
                success: true,
                ...result
            });
        })
    );

    // Enhanced Conversation Endpoints
    router.post('/enhanced-conversation/start', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const { context = {} } = req.body;
            
            const result = await voiceConversation.startEnhancedConversation(req.userId, context, req);

            res.json({
                success: true,
                ...result
            });
        })
    );

    router.post('/enhanced-conversation/audio', 
        authSystem.authMiddleware(),
        validateRequest([
            body('sessionId').isUUID(),
            body('audioBuffer').notEmpty(),
            body('userContext').optional().isObject()
        ]),
        asyncHandler(async (req, res) => {
            const { sessionId, audioBuffer, userContext = {} } = req.body;
            
            const result = await voiceConversation.processEnhancedAudio(sessionId, audioBuffer, req.userId, userContext, req);

            res.json({
                success: true,
                ...result
            });
        })
    );

    router.get('/enhanced-conversation/session/:sessionId', 
        authSystem.authMiddleware(),
        sessionIdValidation,
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            
            const result = await voiceConversation.getEnhancedSession(sessionId);

            res.json({
                success: true,
                ...result
            });
        })
    );

    router.post('/enhanced-conversation/generate-content', 
        authSystem.authMiddleware(),
        validateRequest([
            body('sessionId').isUUID(),
            body('contentType').optional().isIn(['post', 'story', 'reel'])
        ]),
        asyncHandler(async (req, res) => {
            const { sessionId, contentType = 'post' } = req.body;
            
            const result = await voiceConversation.generateContentFromConversation(sessionId, req.userId, contentType, req);

            res.json({
                success: true,
                ...result
            });
        })
    );

    router.get('/enhanced-conversation/stats', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const result = await voiceConversation.getEnhancedConversationStats(req.userId);
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    // Regular Conversation Endpoints (Legacy)
    router.post('/conversation/start', 
        asyncHandler(async (req, res) => {
            const result = await voiceConversation.startRegularConversation();
            
            res.json({
                success: true,
                ...result
            });
        })
    );

    router.post('/conversation/audio', 
        validateRequest([
            body('sessionId').isUUID(),
            body('audioBuffer').notEmpty()
        ]),
        asyncHandler(async (req, res) => {
            const { sessionId, audioBuffer } = req.body;
            
            const result = await voiceConversation.processRegularAudio(sessionId, audioBuffer);

            res.json({
                success: true,
                ...result
            });
        })
    );

    // LiveKit Agent Briefing Endpoints
    router.post('/schedule-briefing',
        authSystem.authMiddleware(),
        validateRequest([
            body('phoneNumber').isMobilePhone().withMessage('Valid phone number required'),
            body('imageUrl').isURL().withMessage('Valid image URL required'),
            body('scheduledTime').isISO8601().withMessage('Valid scheduled time required'),
            body('metadata').optional().isObject()
        ]),
        asyncHandler(async (req, res) => {
            const { phoneNumber, imageUrl, scheduledTime, metadata = {} } = req.body;
            
            const result = await voiceBriefing.scheduleBriefing(req.userId, phoneNumber, imageUrl, scheduledTime, metadata, req);

            res.json({
                success: true,
                ...result
            });
        })
    );

    router.get('/briefing/:sessionId',
        authSystem.authMiddleware(),
        validateRequest([
            param('sessionId').notEmpty().withMessage('Session ID required')
        ]),
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            
            const session = await voiceBriefing.getBriefingSession(sessionId, req.userId);

            res.json({
                success: true,
                session
            });
        })
    );

    router.patch('/briefing/:sessionId/status',
        authSystem.authMiddleware(),
        validateRequest([
            param('sessionId').notEmpty().withMessage('Session ID required'),
            body('status').isIn(['pending', 'scheduled', 'in_progress', 'completed', 'failed']).withMessage('Valid status required'),
            body('actualCallTime').optional().isISO8601(),
            body('briefingCompleted').optional().isBoolean()
        ]),
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            const { status, actualCallTime, briefingCompleted } = req.body;
            
            const result = await voiceBriefing.updateBriefingStatus(sessionId, req.userId, status, actualCallTime, briefingCompleted, req);

            res.json({
                success: true,
                ...result
            });
        })
    );

    router.post('/briefing/:sessionId/context',
        authSystem.authMiddleware(),
        validateRequest([
            param('sessionId').notEmpty().withMessage('Session ID required'),
            body('transcript').notEmpty().withMessage('Transcript required'),
            body('dishStory').optional().isString(),
            body('targetAudience').optional().isString(),
            body('desiredMood').optional().isString(),
            body('platformPreferences').optional().isString(),
            body('postingUrgency').optional().isString(),
            body('brandPersonality').optional().isString()
        ]),
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            const { transcript, dishStory, targetAudience, desiredMood, platformPreferences, postingUrgency, brandPersonality } = req.body;
            
            const contextData = {
                transcript, dishStory, targetAudience, desiredMood, 
                platformPreferences, postingUrgency, brandPersonality
            };

            const result = await voiceBriefing.saveBriefingContext(sessionId, req.userId, contextData, req);

            res.json({
                success: true,
                ...result
            });
        })
    );

    router.post('/briefing/webhook',
        validateRequest([
            body('sessionId').notEmpty().withMessage('Session ID required'),
            body('status').notEmpty().withMessage('Status required'),
            body('timestamp').isISO8601().withMessage('Valid timestamp required'),
            body('webhookSecret').notEmpty().withMessage('Webhook secret required')
        ]),
        asyncHandler(async (req, res) => {
            const { sessionId, status, timestamp, webhookSecret, data = {} } = req.body;
            
            const result = await voiceBriefing.processWebhook(sessionId, status, timestamp, webhookSecret, data);

            res.json({
                success: true,
                ...result
            });
        })
    );

    // Twilio Voice Integration Endpoints
    router.get('/twiml/briefing-call',
        asyncHandler(async (req, res) => {
            const { sessionId } = req.query;
            
            const twiml = await voiceTwiML.generateBriefingTwiML(sessionId, req);
            
            res.type('text/xml').send(twiml);
        })
    );

    router.get('/twiml/connect-livekit',
        asyncHandler(async (req, res) => {
            const { sessionId, room } = req.query;
            
            const twiml = await voiceTwiML.generateConnectLiveKitTwiML(sessionId, room);
            
            res.type('text/xml').send(twiml);
        })
    );

    router.post('/twiml/process-speech',
        asyncHandler(async (req, res) => {
            const { sessionId } = req.query;
            const { SpeechResult, Confidence } = req.body;
            
            const twiml = await voiceTwiML.processSpeechInput(sessionId, SpeechResult, Confidence);
            
            res.type('text/xml').send(twiml);
        })
    );

    router.post('/webhook/call-status',
        asyncHandler(async (req, res) => {
            const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;
            
            const result = await voiceTwiML.handleCallStatusUpdate(CallSid, CallStatus, CallDuration, RecordingUrl);
            
            res.status(200).send(result);
        })
    );

    router.post('/call/start-briefing',
        authSystem.authMiddleware(),
        validateRequest([
            body('phoneNumber').isMobilePhone().withMessage('Valid phone number required'),
            body('briefingSessionId').notEmpty().withMessage('Briefing session ID required')
        ]),
        asyncHandler(async (req, res) => {
            const { phoneNumber, briefingSessionId } = req.body;
            
            const result = await voiceBriefing.initiateOutboundCall(req.userId, phoneNumber, briefingSessionId, req);

            res.json({
                success: true,
                ...result
            });
        })
    );

    // Service Health and Monitoring
    router.get('/health',
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const health = await liveKitService.healthCheck();
            const metrics = liveKitService.getMetrics();

            res.json({
                success: true,
                health,
                metrics
            });
        })
    );

    // Error handling middleware for voice routes
    router.use((error, req, res, next) => {
        logger.error('Voice route error', error, {
            userId: req.userId,
            path: req.path,
            method: req.method
        });

        // Handle voice-specific errors
        if (error.message && error.message.includes('transcription')) {
            logger.logSecurityEvent(
                'transcription_error',
                `Voice transcription failed: ${error.message}`,
                'medium',
                {
                    userId: req.userId,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    error: error.message
                }
            );
        }

        if (error.message && error.message.includes('LiveKit')) {
            logger.logSecurityEvent(
                'livekit_error',
                `LiveKit service error: ${error.message}`,
                'high',
                {
                    userId: req.userId,
                    sessionId: req.params?.sessionId,
                    error: error.message
                }
            );
        }

        // Voice-specific error responses
        if (error.message && error.message.includes('session')) {
            return res.status(400).json({
                success: false,
                error: 'Voice session error',
                message: error.message
            });
        }

        if (error.message && error.message.includes('recording')) {
            return res.status(400).json({
                success: false,
                error: 'Recording error',
                message: error.message
            });
        }

        if (error.message && error.message.includes('audio')) {
            return res.status(400).json({
                success: false,
                error: 'Audio processing error',
                message: error.message
            });
        }

        // Default error response
        res.status(500).json({
            success: false,
            error: 'Voice processing error',
            message: error.message || 'An error occurred during voice processing'
        });
    });

    return router;
};