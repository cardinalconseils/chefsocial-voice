// Voice Conversation Service - Enhanced and regular conversation handling
class VoiceConversationService {
    constructor(services) {
        this.authSystem = services.authSystem;
        this.logger = services.logger;
        this.enhancedVoiceAgent = services.enhancedVoiceAgent;
        this.realtimeHandler = services.realtimeHandler;
    }

    // Enhanced Conversation Methods
    async startEnhancedConversation(userId, context = {}, req) {
        const session = await this.enhancedVoiceAgent.startConversation(userId, context);

        await this.logger.auditUserAction(
            userId,
            'enhanced_conversation_start',
            'conversation',
            session.sessionId,
            { context },
            req
        );

        this.logger.info('Enhanced conversation started', {
            userId,
            sessionId: session.sessionId
        });

        return { session };
    }

    async processEnhancedAudio(sessionId, audioBuffer, userId, userContext = {}, req) {
        const result = await this.enhancedVoiceAgent.processVoiceInput(sessionId, audioBuffer, { 
            userId,
            ...userContext 
        });

        await this.logger.auditUserAction(
            userId,
            'enhanced_conversation_audio',
            'conversation',
            sessionId,
            {
                audioProcessed: true,
                responseGenerated: !!result.response
            },
            req
        );

        this.logger.info('Enhanced conversation audio processed', {
            userId,
            sessionId,
            hasResponse: !!result.response
        });

        return { result };
    }

    async getEnhancedSession(sessionId) {
        const session = await this.enhancedVoiceAgent.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        return { session };
    }

    async generateContentFromConversation(sessionId, userId, contentType = 'post', req) {
        const content = await this.enhancedVoiceAgent.generateContent(sessionId, contentType);

        await this.logger.auditUserAction(
            userId,
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

        this.logger.info('Enhanced conversation content generated', {
            userId,
            sessionId,
            contentType
        });

        return { content };
    }

    async getEnhancedConversationStats(userId) {
        const stats = await this.enhancedVoiceAgent.getUserStats(userId);
        return { stats };
    }

    // Regular Conversation Methods (Legacy)
    async startRegularConversation() {
        const session = await this.realtimeHandler.createSession();

        this.logger.info('Regular conversation started', {
            sessionId: session.sessionId
        });

        return { session };
    }

    async processRegularAudio(sessionId, audioBuffer) {
        const session = await this.realtimeHandler.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const result = await this.realtimeHandler.processAudioInput(audioBuffer, session);

        this.logger.info('Regular conversation audio processed', {
            sessionId,
            hasResponse: !!result.response
        });

        return { result };
    }
}

module.exports = VoiceConversationService;