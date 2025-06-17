// ChefSocial Voice AI - Voice Processing Routes
const express = require('express');
const router = express.Router();
const { asyncHandler, validateRequest } = require('../middleware/validation');
const { body, param } = require('express-validator');

// Voice processing routes module - receives services from app.js
module.exports = (app) => {
    const { authSystem, logger, rateLimitService, liveKitService, enhancedVoiceAgent, realtimeHandler, naturalHandler } = app.locals.services;
    
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