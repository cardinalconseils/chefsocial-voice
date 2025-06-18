// Voice Session Service - LiveKit session management
class VoiceSessionService {
    constructor(services) {
        this.authSystem = services.authSystem;
        this.logger = services.logger;
        this.liveKitService = services.liveKitService;
    }

    async createVoiceSession(userId, sessionType = 'voice_chat', metadata = {}, req) {
        // Check for existing session
        const existingSession = this.liveKitService.getActiveSession(userId);
        if (existingSession) {
            return {
                session: existingSession,
                message: 'Rejoining existing session'
            };
        }

        // Create new session
        const session = await this.liveKitService.createVoiceSession(userId, sessionType, {
            ...metadata,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip
        });

        await this.logger.auditUserAction(
            userId,
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

        this.logger.info('LiveKit voice session created', {
            userId,
            sessionId: session.sessionId,
            sessionType,
            service: 'livekit'
        });

        return { session };
    }

    async joinVoiceSession(sessionId, userId, req) {
        const session = await this.liveKitService.joinVoiceSession(sessionId, userId);

        await this.logger.auditUserAction(
            userId,
            'voice_session_join',
            'voice_session',
            sessionId,
            {
                roomName: session.roomName,
                rejoining: true
            },
            req
        );

        this.logger.info('User joined LiveKit voice session', {
            userId,
            sessionId,
            service: 'livekit'
        });

        return { session };
    }

    async endVoiceSession(sessionId, userId, req) {
        const result = await this.liveKitService.endVoiceSession(sessionId, userId);

        await this.logger.auditUserAction(
            userId,
            'voice_session_end',
            'voice_session',
            sessionId,
            {
                duration: result.duration,
                summary: result.summary
            },
            req
        );

        this.logger.info('LiveKit voice session ended', {
            userId,
            sessionId,
            duration: result.duration,
            service: 'livekit'
        });

        return { result };
    }

    async getActiveSession(userId) {
        const activeSession = this.liveKitService.getActiveSession(userId);
        return { session: activeSession };
    }

    async getSessionStats(sessionId) {
        const stats = this.liveKitService.getSessionStats(sessionId);
        if (!stats) {
            throw new Error('Session not found');
        }
        return { stats };
    }

    async startSessionRecording(sessionId, userId, recordingOptions = {}, req) {
        const recording = await this.liveKitService.startSessionRecording(sessionId, recordingOptions);

        await this.logger.auditUserAction(
            userId,
            'voice_recording_start',
            'voice_session',
            sessionId,
            {
                recordingId: recording.recordingId,
                recordingOptions
            },
            req
        );

        this.logger.info('Voice session recording started', {
            userId,
            sessionId,
            recordingId: recording.recordingId,
            service: 'livekit'
        });

        return { recording };
    }

    async stopSessionRecording(sessionId, userId, req) {
        const recordings = await this.liveKitService.stopSessionRecording(sessionId);

        await this.logger.auditUserAction(
            userId,
            'voice_recording_stop',
            'voice_session',
            sessionId,
            {
                recordingsCount: recordings.length,
                recordings: recordings.map(r => ({ id: r.recordingId, duration: r.duration }))
            },
            req
        );

        this.logger.info('Voice session recording stopped', {
            userId,
            sessionId,
            recordingsCount: recordings.length,
            service: 'livekit'
        });

        return { recordings };
    }
}

module.exports = VoiceSessionService;