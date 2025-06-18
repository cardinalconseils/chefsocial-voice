// Voice Processing Service - Core audio processing functionality
class VoiceProcessingService {
    constructor(services) {
        this.authSystem = services.authSystem;
        this.logger = services.logger;
        this.enhancedVoiceAgent = services.enhancedVoiceAgent;
    }

    async processVoiceRequest(userId, audio, image, language = 'en', req) {
        const performanceTracker = this.logger.startPerformanceTracking('voice_processing', {
            userId,
            hasImage: !!image,
            language
        });

        await this.logger.auditUserAction(
            userId,
            'voice_process_start',
            'content',
            null,
            {
                hasAudio: !!audio,
                hasImage: !!image,
                language,
                audioSize: audio ? audio.length : 0
            },
            req
        );

        this.logger.info(`Processing voice request in ${language}`, {
            userId,
            hasImage: !!image,
            language
        });

        // Step 1: Convert voice to text using Whisper
        const transcriptionResult = await this.transcribeAudio(audio, language);
        const transcript = transcriptionResult.text || transcriptionResult;
        const detectedLanguage = transcriptionResult.detectedLanguage || language;

        this.logger.info('Audio transcribed', {
            userId,
            transcript: transcript.substring(0, 100),
            detectedLanguage
        });

        // Step 2: Analyze image if provided
        const imageAnalysis = await this.analyzeImage(image);
        this.logger.info('Image analyzed', {
            userId,
            hasImageAnalysis: !!imageAnalysis
        });

        // Step 3: Generate content
        const content = await this.generateContent(transcript, imageAnalysis, detectedLanguage);

        // Step 4: Auto-save content
        await this.autoSaveContent(userId, content, transcript);

        // Track usage
        await this.authSystem.db.trackUsage(userId, 'voice_minutes_used', 1);

        performanceTracker.end({
            success: true,
            transcriptLength: transcript.length,
            hasImageAnalysis: !!imageAnalysis,
            contentGenerated: Object.keys(content).length
        });

        await this.logger.auditUserAction(
            userId,
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

        return {
            transcript,
            content,
            detectedLanguage,
            processingTime: performanceTracker.getDuration()
        };
    }

    async processDemoVoiceRequest(audio, image, language = 'en') {
        this.logger.info('Processing demo voice request', {
            hasImage: !!image,
            language
        });

        let transcript = '';
        let imageAnalysis = '';

        try {
            const transcriptionResult = await this.transcribeAudio(audio, language);
            transcript = transcriptionResult.text || transcriptionResult;
            const detectedLang = transcriptionResult.detectedLanguage || language;

            this.logger.info('Demo transcript generated', {
                transcript: transcript.substring(0, 100),
                detectedLanguage: detectedLang
            });
        } catch (transcriptError) {
            this.logger.warn('Demo transcription failed, using fallback', transcriptError);
            transcript = language === 'fr' 
                ? "Je décris ce délicieux plat" 
                : "I'm describing this delicious dish";
        }

        if (image) {
            try {
                imageAnalysis = await this.analyzeImage(image);
                this.logger.info('Demo image analysis completed');
            } catch (imageError) {
                this.logger.warn('Demo image analysis failed, using fallback', imageError);
                imageAnalysis = "A delicious looking dish";
            }
        } else {
            imageAnalysis = "Food photo uploaded";
        }

        const content = await this.generateDemoContent(transcript, imageAnalysis, language);

        return {
            transcript,
            content,
            demo: true,
            message: "Demo mode - Register for advanced AI features!"
        };
    }

    async autoSaveContent(userId, content, transcript) {
        try {
            const contentPromises = [];
            
            if (content.instagram) {
                const instagramContentId = `content_${Date.now()}_ig_${Math.random().toString(36).substring(2, 11)}`;
                contentPromises.push(
                    this.authSystem.db.saveGeneratedContent({
                        id: instagramContentId,
                        userId,
                        platform: 'instagram',
                        contentType: 'post',
                        caption: content.instagram.caption,
                        hashtags: content.instagram.hashtags,
                        imageUrl: null,
                        transcript,
                        viralScore: content.viralPotential ? parseInt(content.viralPotential) : 7
                    })
                );
            }
            
            if (content.tiktok) {
                const tiktokContentId = `content_${Date.now()}_tt_${Math.random().toString(36).substring(2, 11)}`;
                contentPromises.push(
                    this.authSystem.db.saveGeneratedContent({
                        id: tiktokContentId,
                        userId,
                        platform: 'tiktok',
                        contentType: 'video',
                        caption: content.tiktok.caption,
                        hashtags: content.tiktok.hashtags,
                        imageUrl: null,
                        transcript,
                        viralScore: content.viralPotential ? parseInt(content.viralPotential) : 7
                    })
                );
            }
            
            await Promise.all(contentPromises);
            this.logger.info('Content auto-saved to user library', {
                userId,
                contentCount: contentPromises.length
            });
            
        } catch (saveError) {
            this.logger.error('Failed to auto-save content', saveError, { userId });
        }
    }

    // Placeholder methods - implement with actual AI services
    async transcribeAudio(audio, language) {
        // TODO: Implement Whisper API call
        return {
            text: "Sample transcription for testing",
            detectedLanguage: language
        };
    }

    async analyzeImage(image) {
        if (!image) return null;
        // TODO: Implement image analysis
        return "Sample image analysis for testing";
    }

    async generateContent(transcript, imageAnalysis, language) {
        // TODO: Implement content generation
        return {
            instagram: {
                caption: "Sample Instagram caption",
                hashtags: "#food #test"
            },
            tiktok: {
                caption: "Sample TikTok caption",
                hashtags: "#foodie #test"
            },
            viralPotential: "8"
        };
    }

    async generateDemoContent(transcript, imageAnalysis, language) {
        // TODO: Implement demo content generation with limited features
        return {
            instagram: {
                caption: "Demo Instagram caption",
                hashtags: "#demo #test"
            },
            message: "Demo mode - limited features"
        };
    }
}

module.exports = VoiceProcessingService;