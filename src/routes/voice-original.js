// ChefSocial Voice AI - Voice Processing Routes
const express = require('express');
const router = express.Router();
const { asyncHandler, validateRequest } = require('../middleware/validation');
const { body, param } = require('express-validator');

// Voice processing routes module - receives services from app.js
module.exports = (app) => {
    const { authSystem, logger, rateLimitService, liveKitService, enhancedVoiceAgent, realtimeHandler, naturalHandler, smsService, briefingSessionService, voiceCallingService } = app.locals.services;
    
    // Rate limiter for voice processing endpoints
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
            
            // Start performance tracking for voice processing
            const performanceTracker = logger.startPerformanceTracking('voice_processing', {
                userId: req.userId,
                hasImage: !!image,
                language: userLanguage
            });

            // Audit log voice processing request
            await logger.auditUserAction(
                req.userId,
                'voice_process_start',
                'content',
                null,
                {
                    hasAudio: !!audio,
                    hasImage: !!image,
                    language: userLanguage,
                    audioSize: audio ? audio.length : 0
                },
                req
            );
            
            logger.info(`Processing voice request in ${userLanguage}`, {
                userId: req.userId,
                hasImage: !!image,
                language: userLanguage
            });
            
            // Step 1: Convert voice to text using Whisper with enhanced language detection
            const transcriptionResult = await transcribeAudio(audio, userLanguage);
            const transcript = transcriptionResult.text || transcriptionResult;
            const detectedLanguage = transcriptionResult.detectedLanguage || userLanguage;
            
            logger.info('Audio transcribed', {
                userId: req.userId,
                transcript: transcript.substring(0, 100),
                detectedLanguage
            });
            
            // Step 2: Analyze the image (optional but adds value)
            const imageAnalysis = await analyzeImage(image);
            logger.info('Image analyzed', {
                userId: req.userId,
                hasImageAnalysis: !!imageAnalysis
            });
            
            // Step 3: Generate social media content using detected language
            const content = await generateContent(transcript, imageAnalysis, detectedLanguage);
            
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
                            imageUrl: null,
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
                logger.info('Content auto-saved to user library', {
                    userId: req.userId,
                    contentCount: contentPromises.length
                });
                
            } catch (saveError) {
                logger.error('Failed to auto-save content', saveError, {
                    userId: req.userId
                });
            }

            // Track usage for voice processing
            await authSystem.db.trackUsage(req.userId, 'voice_minutes_used', 1);

            // End performance tracking
            performanceTracker.end({
                success: true,
                transcriptLength: transcript.length,
                hasImageAnalysis: !!imageAnalysis,
                contentGenerated: Object.keys(content).length
            });

            // Audit log successful voice processing
            await logger.auditUserAction(
                req.userId,
                'voice_process_complete',
                'content',
                null,
                {
                    transcript: transcript.substring(0, 200),
                    detectedLanguage,
                    contentPlatforms: Object.keys(content),
                    viralPotential: content.viralPotential
                },
                req
            );

            res.json({
                success: true,
                transcript: transcript,
                content: content,
                detectedLanguage: detectedLanguage,
                processingTime: performanceTracker.getDuration()
            });
        })
    );

    // Demo voice processing endpoint (public with limited features)
    router.post('/process-demo', 
        asyncHandler(async (req, res) => {
            const { audio, image, language } = req.body;
            const userLanguage = language || 'en';
            
            logger.info('Processing demo voice request', {
                hasImage: !!image,
                language: userLanguage
            });
            
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
                const transcriptionResult = await transcribeAudio(audio, userLanguage);
                transcript = transcriptionResult.text || transcriptionResult;
                const detectedLang = transcriptionResult.detectedLanguage || userLanguage;
                
                logger.info('Demo transcript generated', {
                    transcript: transcript.substring(0, 100),
                    detectedLanguage: detectedLang
                });
            } catch (transcriptError) {
                logger.warn('Demo transcription failed, using fallback', transcriptError);
                transcript = userLanguage === 'fr' 
                    ? "Je décris ce délicieux plat" 
                    : "I'm describing this delicious dish";
            }
            
            // Step 2: Analyze the image (optional for demo - skip if it fails)
            if (image) {
                try {
                    imageAnalysis = await analyzeImage(image);
                    logger.info('Demo image analysis completed');
                } catch (imageError) {
                    logger.warn('Demo image analysis failed, using fallback', imageError);
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
        })
    );

    // LiveKit Voice Session Management

    // Create voice session
    router.post('/session/create', 
        authSystem.authMiddleware(),
        sessionValidation,
        asyncHandler(async (req, res) => {
            const { sessionType = 'voice_chat', metadata = {} } = req.body;
            
            // Check if user already has an active session
            const existingSession = liveKitService.getActiveSession(req.userId);
            if (existingSession) {
                return res.json({
                    success: true,
                    session: existingSession,
                    message: 'Rejoining existing session'
                });
            }

            // Create new voice session
            const session = await liveKitService.createVoiceSession(req.userId, sessionType, {
                ...metadata,
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip
            });

            // Audit log session creation
            await logger.auditUserAction(
                req.userId,
                'voice_session_create',
                'voice_session',
                session.sessionId,
                {
                    sessionType,
                    roomName: session.roomName,
                    liveKitEnabled: true
                },
                req
            );

            logger.info('LiveKit voice session created', {
                userId: req.userId,
                sessionId: session.sessionId,
                sessionType,
                service: 'livekit'
            });

            res.json({
                success: true,
                session: session
            });
        })
    );

    // Join existing voice session
    router.post('/session/join/:sessionId',
        authSystem.authMiddleware(),
        sessionIdValidation,
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            
            const session = await liveKitService.joinVoiceSession(sessionId, req.userId);

            // Audit log session join
            await logger.auditUserAction(
                req.userId,
                'voice_session_join',
                'voice_session',
                sessionId,
                {
                    roomName: session.roomName,
                    rejoining: true
                },
                req
            );

            logger.info('User joined LiveKit voice session', {
                userId: req.userId,
                sessionId,
                service: 'livekit'
            });

            res.json({
                success: true,
                session: session
            });
        })
    );

    // End voice session
    router.post('/session/end/:sessionId',
        authSystem.authMiddleware(),
        sessionIdValidation,
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            
            const result = await liveKitService.endVoiceSession(sessionId, req.userId);

            // Audit log session end
            await logger.auditUserAction(
                req.userId,
                'voice_session_end',
                'voice_session',
                sessionId,
                {
                    duration: result.duration,
                    summary: result.summary
                },
                req
            );

            logger.info('LiveKit voice session ended', {
                userId: req.userId,
                sessionId,
                duration: result.duration,
                service: 'livekit'
            });

            res.json({
                success: true,
                result: result
            });
        })
    );

    // Get active voice session
    router.get('/session/active',
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const activeSession = liveKitService.getActiveSession(req.userId);
            
            res.json({
                success: true,
                session: activeSession
            });
        })
    );

    // Get voice session statistics
    router.get('/session/stats/:sessionId',
        authSystem.authMiddleware(),
        sessionIdValidation,
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            const stats = liveKitService.getSessionStats(sessionId);
            
            if (!stats) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }

            res.json({
                success: true,
                stats: stats
            });
        })
    );

    // Session Recording Management

    // Start session recording
    router.post('/session/record/start/:sessionId',
        authSystem.authMiddleware(),
        sessionIdValidation,
        recordingValidation,
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            const { recordingOptions = {} } = req.body;
            
            const recording = await liveKitService.startSessionRecording(sessionId, recordingOptions);

            // Audit log recording start
            await logger.auditUserAction(
                req.userId,
                'voice_recording_start',
                'voice_session',
                sessionId,
                {
                    recordingId: recording.recordingId,
                    recordingOptions
                },
                req
            );

            logger.info('Voice session recording started', {
                userId: req.userId,
                sessionId,
                recordingId: recording.recordingId,
                service: 'livekit'
            });

            res.json({
                success: true,
                recording: recording
            });
        })
    );

    // Stop session recording
    router.post('/session/record/stop/:sessionId',
        authSystem.authMiddleware(),
        sessionIdValidation,
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            
            const recordings = await liveKitService.stopSessionRecording(sessionId);

            // Audit log recording stop
            await logger.auditUserAction(
                req.userId,
                'voice_recording_stop',
                'voice_session',
                sessionId,
                {
                    recordingsCount: recordings.length,
                    recordings: recordings.map(r => ({ id: r.recordingId, duration: r.duration }))
                },
                req
            );

            logger.info('Voice session recording stopped', {
                userId: req.userId,
                sessionId,
                recordingsCount: recordings.length,
                service: 'livekit'
            });

            res.json({
                success: true,
                recordings: recordings
            });
        })
    );

    // Enhanced Conversation Endpoints

    // Start enhanced conversation
    router.post('/enhanced-conversation/start', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const { context = {} } = req.body;
            
            const session = await enhancedVoiceAgent.startConversation(req.userId, context);
            
            // Audit log enhanced conversation start
            await logger.auditUserAction(
                req.userId,
                'enhanced_conversation_start',
                'conversation',
                session.sessionId,
                { context },
                req
            );

            logger.info('Enhanced conversation started', {
                userId: req.userId,
                sessionId: session.sessionId
            });

            res.json({
                success: true,
                session: session
            });
        })
    );

    // Process audio in enhanced conversation
    router.post('/enhanced-conversation/audio', 
        authSystem.authMiddleware(),
        validateRequest([
            body('sessionId').isUUID(),
            body('audioBuffer').notEmpty(),
            body('userContext').optional().isObject()
        ]),
        asyncHandler(async (req, res) => {
            const { sessionId, audioBuffer, userContext = {} } = req.body;
            
            const result = await enhancedVoiceAgent.processVoiceInput(sessionId, audioBuffer, { 
                userId: req.userId,
                ...userContext 
            });

            // Audit log audio processing
            await logger.auditUserAction(
                req.userId,
                'enhanced_conversation_audio',
                'conversation',
                sessionId,
                {
                    audioProcessed: true,
                    responseGenerated: !!result.response
                },
                req
            );

            logger.info('Enhanced conversation audio processed', {
                userId: req.userId,
                sessionId,
                hasResponse: !!result.response
            });

            res.json({
                success: true,
                result: result
            });
        })
    );

    // Get enhanced conversation session
    router.get('/enhanced-conversation/session/:sessionId', 
        authSystem.authMiddleware(),
        sessionIdValidation,
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            
            const session = await enhancedVoiceAgent.getSession(sessionId);
            
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }

            res.json({
                success: true,
                session: session
            });
        })
    );

    // Generate content from enhanced conversation
    router.post('/enhanced-conversation/generate-content', 
        authSystem.authMiddleware(),
        validateRequest([
            body('sessionId').isUUID(),
            body('contentType').optional().isIn(['post', 'story', 'reel'])
        ]),
        asyncHandler(async (req, res) => {
            const { sessionId, contentType = 'post' } = req.body;
            
            const content = await enhancedVoiceAgent.generateContent(sessionId, contentType);

            // Audit log content generation
            await logger.auditUserAction(
                req.userId,
                'enhanced_conversation_content_generate',
                'content',
                null,
                {
                    sessionId,
                    contentType,
                    contentGenerated: !!content
                },
                req
            );

            logger.info('Enhanced conversation content generated', {
                userId: req.userId,
                sessionId,
                contentType
            });

            res.json({
                success: true,
                content: content
            });
        })
    );

    // Get enhanced conversation statistics
    router.get('/enhanced-conversation/stats', 
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const stats = await enhancedVoiceAgent.getUserStats(req.userId);
            
            res.json({
                success: true,
                stats: stats
            });
        })
    );

    // Regular Conversation Endpoints (Legacy)

    // Start regular conversation
    router.post('/conversation/start', 
        asyncHandler(async (req, res) => {
            const session = await realtimeHandler.createSession();
            
            logger.info('Regular conversation started', {
                sessionId: session.sessionId
            });

            res.json({
                success: true,
                session: session
            });
        })
    );

    // Process audio in regular conversation
    router.post('/conversation/audio', 
        validateRequest([
            body('sessionId').isUUID(),
            body('audioBuffer').notEmpty()
        ]),
        asyncHandler(async (req, res) => {
            const { sessionId, audioBuffer } = req.body;
            
            const session = await realtimeHandler.getSession(sessionId);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }

            const result = await realtimeHandler.processAudioInput(audioBuffer, session);

            logger.info('Regular conversation audio processed', {
                sessionId,
                hasResponse: !!result.response
            });

            res.json({
                success: true,
                result: result
            });
        })
    );

    // LiveKit Agent Briefing Endpoints

    // Schedule a briefing session
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
            
            // Generate unique session ID
            const sessionId = `briefing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Create briefing session in database
            const sessionData = {
                id: sessionId,
                phoneNumber,
                userId: req.userId,
                imageUrl,
                uploadMethod: 'api'
            };
            
            await authSystem.db.createBriefingSession(sessionData);
            
            // Schedule the briefing time
            await authSystem.db.updateBriefingSessionSchedule(sessionId, scheduledTime, 'scheduled');
            
            // Track workflow step
            await authSystem.db.trackWorkflowStep(sessionId, 'briefing_scheduled', 'completed', {
                scheduledTime,
                phoneNumber,
                metadata
            });

            // Audit log briefing creation
            await logger.auditUserAction(
                req.userId,
                'briefing_session_scheduled',
                'briefing_session',
                sessionId,
                {
                    phoneNumber,
                    scheduledTime,
                    imageUrl,
                    metadata
                },
                req
            );

            logger.info('Briefing session scheduled', {
                userId: req.userId,
                sessionId,
                phoneNumber,
                scheduledTime,
                service: 'livekit-agent'
            });

            res.json({
                success: true,
                sessionId,
                scheduledTime,
                message: 'Briefing session scheduled successfully'
            });
        })
    );

    // Get briefing session details
    router.get('/briefing/:sessionId',
        authSystem.authMiddleware(),
        validateRequest([
            param('sessionId').notEmpty().withMessage('Session ID required')
        ]),
        asyncHandler(async (req, res) => {
            const { sessionId } = req.params;
            
            const session = await authSystem.db.getBriefingSession(sessionId);
            
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Briefing session not found'
                });
            }

            // Verify user owns this session
            if (session.user_id !== req.userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied to this briefing session'
                });
            }

            res.json({
                success: true,
                session: {
                    sessionId: session.id,
                    phoneNumber: session.phone_number,
                    imageUrl: session.image_url,
                    status: session.status,
                    scheduledTime: session.scheduled_time,
                    actualCallTime: session.actual_call_time,
                    briefingCompleted: session.briefing_completed,
                    createdAt: session.created_at,
                    updatedAt: session.updated_at
                }
            });
        })
    );

    // Update briefing session status
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
            
            const session = await authSystem.db.getBriefingSession(sessionId);
            
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Briefing session not found'
                });
            }

            // Verify user owns this session
            if (session.user_id !== req.userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied to this briefing session'
                });
            }

            // Update session status
            if (status === 'completed' && actualCallTime) {
                await authSystem.db.updateBriefingSessionSchedule(sessionId, actualCallTime, status);
            } else {
                await authSystem.db.updateBriefingSessionSchedule(sessionId, session.scheduled_time, status);
            }

            // Track workflow step
            await authSystem.db.trackWorkflowStep(sessionId, 'status_update', 'completed', {
                newStatus: status,
                actualCallTime,
                briefingCompleted
            });

            // Audit log status update
            await logger.auditUserAction(
                req.userId,
                'briefing_session_status_update',
                'briefing_session',
                sessionId,
                {
                    status,
                    actualCallTime,
                    briefingCompleted
                },
                req
            );

            logger.info('Briefing session status updated', {
                userId: req.userId,
                sessionId,
                status,
                service: 'livekit-agent'
            });

            res.json({
                success: true,
                sessionId,
                status,
                message: 'Briefing session status updated successfully'
            });
        })
    );

    // Save briefing context from voice session
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
            
            const session = await authSystem.db.getBriefingSession(sessionId);
            
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Briefing session not found'
                });
            }

            // Verify user owns this session
            if (session.user_id !== req.userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied to this briefing session'
                });
            }

            // Save briefing context
            const contextData = {
                sessionId,
                transcript,
                dishStory,
                targetAudience,
                desiredMood,
                platformPreferences,
                postingUrgency,
                brandPersonality
            };

            const contextId = await authSystem.db.saveBriefingContext(contextData);

            // Track workflow step
            await authSystem.db.trackWorkflowStep(sessionId, 'context_saved', 'completed', contextData);

            // Audit log context save
            await logger.auditUserAction(
                req.userId,
                'briefing_context_saved',
                'briefing_session',
                sessionId,
                {
                    contextId,
                    transcriptLength: transcript.length,
                    hasCustomData: !!(dishStory || targetAudience || desiredMood)
                },
                req
            );

            logger.info('Briefing context saved', {
                userId: req.userId,
                sessionId,
                contextId,
                service: 'livekit-agent'
            });

            res.json({
                success: true,
                sessionId,
                contextId,
                message: 'Briefing context saved successfully'
            });
        })
    );

    // Webhook endpoint for external system notifications
    router.post('/briefing/webhook',
        validateRequest([
            body('sessionId').notEmpty().withMessage('Session ID required'),
            body('status').notEmpty().withMessage('Status required'),
            body('timestamp').isISO8601().withMessage('Valid timestamp required'),
            body('webhookSecret').notEmpty().withMessage('Webhook secret required')
        ]),
        asyncHandler(async (req, res) => {
            const { sessionId, status, timestamp, webhookSecret, data = {} } = req.body;
            
            // Verify webhook secret (you should set this in your environment)
            const expectedSecret = process.env.LIVEKIT_WEBHOOK_SECRET || 'default-webhook-secret';
            if (webhookSecret !== expectedSecret) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid webhook secret'
                });
            }

            const session = await authSystem.db.getBriefingSession(sessionId);
            
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Briefing session not found'
                });
            }

            // Update session based on webhook status
            if (status === 'briefing_completed') {
                await authSystem.db.updateBriefingSessionSchedule(sessionId, new Date().toISOString(), 'completed');
                
                // Track completion
                await authSystem.db.trackWorkflowStep(sessionId, 'briefing_completed', 'completed', {
                    completedAt: timestamp,
                    webhookData: data
                });

                // Trigger your system's webhook if configured
                if (process.env.EXTERNAL_WEBHOOK_URL) {
                    try {
                        await fetch(process.env.EXTERNAL_WEBHOOK_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${process.env.EXTERNAL_WEBHOOK_TOKEN || ''}`
                            },
                            body: JSON.stringify({
                                sessionId,
                                status: 'completed',
                                timestamp,
                                phoneNumber: session.phone_number,
                                userId: session.user_id,
                                imageUrl: session.image_url,
                                data
                            })
                        });

                        logger.info('External webhook notification sent', {
                            sessionId,
                            status,
                            service: 'livekit-agent'
                        });
                    } catch (webhookError) {
                        logger.error('Failed to send external webhook notification', webhookError, {
                            sessionId,
                            status
                        });
                    }
                }
            }

            logger.info('Briefing webhook received', {
                sessionId,
                status,
                timestamp,
                service: 'livekit-agent'
            });

            res.json({
                success: true,
                sessionId,
                status,
                message: 'Webhook processed successfully'
            });
        })
    );

    // Twilio Voice Integration Endpoints

    // TwiML endpoint for briefing calls
    router.get('/twiml/briefing-call',
        asyncHandler(async (req, res) => {
            const { sessionId } = req.query;
            
            if (!sessionId) {
                return res.status(400).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid session</Say><Hangup/></Response>');
            }

            // Get briefing session details
            const session = await authSystem.db.getBriefingSession(sessionId);
            if (!session) {
                return res.status(400).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Session not found</Say><Hangup/></Response>');
            }

            // Create LiveKit briefing room
            const liveKitSession = await liveKitService.createBriefingRoom(sessionId, session.phone_number, session.image_url);
            
            // Generate TwiML for the call
            const twiml = voiceCallingService.generateBriefingTwiML(sessionId, liveKitSession.roomName, 'en');

            res.type('text/xml').send(twiml);
        })
    );

    // TwiML endpoint for connecting to LiveKit
    router.get('/twiml/connect-livekit',
        asyncHandler(async (req, res) => {
            const { sessionId, room } = req.query;
            
            const VoiceResponse = require('twilio').twiml.VoiceResponse;
            const twiml = new VoiceResponse();

            // For now, we'll use Twilio's built-in conversation features
            // In production, you would set up a LiveKit SIP gateway
            twiml.say({
                voice: 'Polly.Joanna'
            }, "Thank you for using ChefSocial. Our AI assistant will now start the briefing session.");

            // Start gathering input from the user
            const gather = twiml.gather({
                input: 'speech',
                speechTimeout: 10,
                action: `/api/voice/twiml/process-speech?sessionId=${sessionId}`,
                method: 'POST'
            });

            gather.say({
                voice: 'Polly.Joanna'
            }, "Please tell me about the dish in your photo. What makes it special and who is your target audience?");

            // If no speech is detected
            twiml.say({
                voice: 'Polly.Joanna'
            }, "I didn't hear anything. Let me try again.");
            
            twiml.redirect(`/api/voice/twiml/connect-livekit?sessionId=${sessionId}&room=${room}`);

            res.type('text/xml').send(twiml.toString());
        })
    );

    // TwiML endpoint for processing speech
    router.post('/twiml/process-speech',
        asyncHandler(async (req, res) => {
            const { sessionId } = req.query;
            const { SpeechResult, Confidence } = req.body;
            
            const VoiceResponse = require('twilio').twiml.VoiceResponse;
            const twiml = new VoiceResponse();

            if (SpeechResult && parseFloat(Confidence) > 0.7) {
                // Save the speech to briefing context
                await authSystem.db.saveBriefingContext({
                    sessionId,
                    transcript: SpeechResult,
                    dishStory: SpeechResult,
                    targetAudience: 'General audience',
                    desiredMood: 'Engaging',
                    platformPreferences: 'Instagram, TikTok',
                    postingUrgency: 'Soon',
                    brandPersonality: 'Friendly'
                });

                twiml.say({
                    voice: 'Polly.Joanna'
                }, "Perfect! I've captured your information. ChefSocial will now create viral content for your restaurant. You'll receive the content via SMS for approval. Thank you!");

                // Mark briefing as completed
                await authSystem.db.updateBriefingSessionSchedule(sessionId, new Date().toISOString(), 'completed');
                
                // Trigger webhook for content generation
                if (process.env.EXTERNAL_WEBHOOK_URL) {
                    fetch(process.env.EXTERNAL_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId,
                            status: 'briefing_completed',
                            timestamp: new Date().toISOString(),
                            transcript: SpeechResult
                        })
                    }).catch(err => logger.error('Webhook error:', err));
                }
            } else {
                twiml.say({
                    voice: 'Polly.Joanna'
                }, "I didn't understand that clearly. Could you please repeat what makes your dish special?");

                const gather = twiml.gather({
                    input: 'speech',
                    speechTimeout: 10,
                    action: `/api/voice/twiml/process-speech?sessionId=${sessionId}`,
                    method: 'POST'
                });

                gather.say({
                    voice: 'Polly.Joanna'
                }, "Please tell me about your dish again.");
            }

            twiml.hangup();
            res.type('text/xml').send(twiml.toString());
        })
    );

    // Webhook endpoint for call status updates
    router.post('/webhook/call-status',
        asyncHandler(async (req, res) => {
            const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;
            
            await voiceCallingService.handleCallStatusUpdate(CallSid, CallStatus, CallDuration, RecordingUrl);

            logger.info('Call status update processed', {
                callSid: CallSid,
                status: CallStatus,
                duration: CallDuration,
                service: 'twilio-voice'
            });

            res.status(200).send('OK');
        })
    );

    // Endpoint to initiate outbound call for briefing
    router.post('/call/start-briefing',
        authSystem.authMiddleware(),
        validateRequest([
            body('phoneNumber').isMobilePhone().withMessage('Valid phone number required'),
            body('briefingSessionId').notEmpty().withMessage('Briefing session ID required')
        ]),
        asyncHandler(async (req, res) => {
            const { phoneNumber, briefingSessionId } = req.body;
            
            // Verify user owns this briefing session
            const session = await authSystem.db.getBriefingSession(briefingSessionId);
            if (!session || session.user_id !== req.userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied to this briefing session'
                });
            }

            // Validate phone number
            const phoneValidation = await voiceCallingService.validatePhoneNumber(phoneNumber);
            
            if (!phoneValidation.valid || !phoneValidation.canReceiveCalls) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number cannot receive calls',
                    validation: phoneValidation
                });
            }

            // Create LiveKit briefing room
            const liveKitSession = await liveKitService.createBriefingRoom(briefingSessionId, phoneNumber, session.image_url);

            // Initiate outbound call
            const callResult = await voiceCallingService.makeOutboundCall(phoneNumber, briefingSessionId, liveKitSession);

            // Audit log
            await logger.auditUserAction(
                req.userId,
                'outbound_call_initiated',
                'briefing_session',
                briefingSessionId,
                {
                    phoneNumber: phoneNumber.slice(-4),
                    callSid: callResult.callSid,
                    liveKitRoom: liveKitSession.roomName
                },
                req
            );

            logger.info('Outbound briefing call initiated', {
                userId: req.userId,
                briefingSessionId,
                callSid: callResult.callSid,
                phoneNumber: phoneNumber.slice(-4),
                service: 'twilio-voice'
            });

            res.json({
                success: true,
                callSid: callResult.callSid,
                briefingSessionId,
                liveKitSession: {
                    sessionId: liveKitSession.sessionId,
                    roomName: liveKitSession.roomName
                },
                message: 'Outbound call initiated successfully'
            });
        })
    );

    // Service Health and Monitoring

    // Get LiveKit service health and metrics
    router.get('/health',
        authSystem.authMiddleware(),
        asyncHandler(async (req, res) => {
            const health = await liveKitService.healthCheck();
            const metrics = liveKitService.getMetrics();

            res.json({
                success: true,
                health: health,
                metrics: metrics
            });
        })
    );

    // Error handling middleware for voice routes
    router.use((error, req, res, next) => {
        // Log voice processing errors
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

        // Handle voice-specific errors
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