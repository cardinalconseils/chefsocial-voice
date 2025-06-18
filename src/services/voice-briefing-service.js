// Voice Briefing Service - LiveKit agent briefing functionality
class VoiceBriefingService {
    constructor(services) {
        this.authSystem = services.authSystem;
        this.logger = services.logger;
        this.liveKitService = services.liveKitService;
        this.voiceCallingService = services.voiceCallingService;
    }

    async scheduleBriefing(userId, phoneNumber, imageUrl, scheduledTime, metadata = {}, req) {
        const sessionId = `briefing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const sessionData = {
            id: sessionId,
            phoneNumber,
            userId,
            imageUrl,
            uploadMethod: 'api'
        };

        await this.authSystem.db.createBriefingSession(sessionData);
        await this.authSystem.db.updateBriefingSessionSchedule(sessionId, scheduledTime, 'scheduled');

        await this.authSystem.db.trackWorkflowStep(sessionId, 'briefing_scheduled', 'completed', {
            scheduledTime,
            phoneNumber,
            metadata
        });

        await this.logger.auditUserAction(
            userId,
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

        this.logger.info('Briefing session scheduled', {
            userId,
            sessionId,
            phoneNumber,
            scheduledTime,
            service: 'livekit-agent'
        });

        return {
            sessionId,
            scheduledTime,
            message: 'Briefing session scheduled successfully'
        };
    }

    async getBriefingSession(sessionId, userId) {
        const session = await this.authSystem.db.getBriefingSession(sessionId);
        
        if (!session) {
            throw new Error('Briefing session not found');
        }

        if (session.user_id !== userId) {
            throw new Error('Access denied to this briefing session');
        }

        return {
            sessionId: session.id,
            phoneNumber: session.phone_number,
            imageUrl: session.image_url,
            status: session.status,
            scheduledTime: session.scheduled_time,
            actualCallTime: session.actual_call_time,
            briefingCompleted: session.briefing_completed,
            createdAt: session.created_at,
            updatedAt: session.updated_at
        };
    }

    async updateBriefingStatus(sessionId, userId, status, actualCallTime, briefingCompleted, req) {
        const session = await this.authSystem.db.getBriefingSession(sessionId);
        
        if (!session) {
            throw new Error('Briefing session not found');
        }

        if (session.user_id !== userId) {
            throw new Error('Access denied to this briefing session');
        }

        if (status === 'completed' && actualCallTime) {
            await this.authSystem.db.updateBriefingSessionSchedule(sessionId, actualCallTime, status);
        } else {
            await this.authSystem.db.updateBriefingSessionSchedule(sessionId, session.scheduled_time, status);
        }

        await this.authSystem.db.trackWorkflowStep(sessionId, 'status_update', 'completed', {
            newStatus: status,
            actualCallTime,
            briefingCompleted
        });

        await this.logger.auditUserAction(
            userId,
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

        this.logger.info('Briefing session status updated', {
            userId,
            sessionId,
            status,
            service: 'livekit-agent'
        });

        return {
            sessionId,
            status,
            message: 'Briefing session status updated successfully'
        };
    }

    async saveBriefingContext(sessionId, userId, contextData, req) {
        const session = await this.authSystem.db.getBriefingSession(sessionId);
        
        if (!session) {
            throw new Error('Briefing session not found');
        }

        if (session.user_id !== userId) {
            throw new Error('Access denied to this briefing session');
        }

        const fullContextData = {
            sessionId,
            ...contextData
        };

        const contextId = await this.authSystem.db.saveBriefingContext(fullContextData);

        await this.authSystem.db.trackWorkflowStep(sessionId, 'context_saved', 'completed', fullContextData);

        await this.logger.auditUserAction(
            userId,
            'briefing_context_saved',
            'briefing_session',
            sessionId,
            {
                contextId,
                transcriptLength: contextData.transcript?.length || 0,
                hasCustomData: !!(contextData.dishStory || contextData.targetAudience || contextData.desiredMood)
            },
            req
        );

        this.logger.info('Briefing context saved', {
            userId,
            sessionId,
            contextId,
            service: 'livekit-agent'
        });

        return {
            sessionId,
            contextId,
            message: 'Briefing context saved successfully'
        };
    }

    async processWebhook(sessionId, status, timestamp, webhookSecret, data = {}) {
        const expectedSecret = process.env.LIVEKIT_WEBHOOK_SECRET || 'default-webhook-secret';
        if (webhookSecret !== expectedSecret) {
            throw new Error('Invalid webhook secret');
        }

        const session = await this.authSystem.db.getBriefingSession(sessionId);
        if (!session) {
            throw new Error('Briefing session not found');
        }

        if (status === 'briefing_completed') {
            await this.authSystem.db.updateBriefingSessionSchedule(sessionId, new Date().toISOString(), 'completed');
            
            await this.authSystem.db.trackWorkflowStep(sessionId, 'briefing_completed', 'completed', {
                completedAt: timestamp,
                webhookData: data
            });

            // Trigger external webhook if configured
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

                    this.logger.info('External webhook notification sent', {
                        sessionId,
                        status,
                        service: 'livekit-agent'
                    });
                } catch (webhookError) {
                    this.logger.error('Failed to send external webhook notification', webhookError, {
                        sessionId,
                        status
                    });
                }
            }
        }

        this.logger.info('Briefing webhook received', {
            sessionId,
            status,
            timestamp,
            service: 'livekit-agent'
        });

        return {
            sessionId,
            status,
            message: 'Webhook processed successfully'
        };
    }

    async initiateOutboundCall(userId, phoneNumber, briefingSessionId, req) {
        // Verify session ownership
        const session = await this.authSystem.db.getBriefingSession(briefingSessionId);
        if (!session || session.user_id !== userId) {
            throw new Error('Access denied to this briefing session');
        }

        // Validate phone number
        const phoneValidation = await this.voiceCallingService.validatePhoneNumber(phoneNumber);
        
        if (!phoneValidation.valid || !phoneValidation.canReceiveCalls) {
            throw new Error('Phone number cannot receive calls');
        }

        // Create LiveKit briefing room
        const liveKitSession = await this.liveKitService.createBriefingRoom(briefingSessionId, phoneNumber, session.image_url);

        // Initiate outbound call
        const callResult = await this.voiceCallingService.makeOutboundCall(phoneNumber, briefingSessionId, liveKitSession);

        await this.logger.auditUserAction(
            userId,
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

        this.logger.info('Outbound briefing call initiated', {
            userId,
            briefingSessionId,
            callSid: callResult.callSid,
            phoneNumber: phoneNumber.slice(-4),
            service: 'twilio-voice'
        });

        return {
            callSid: callResult.callSid,
            briefingSessionId,
            liveKitSession: {
                sessionId: liveKitSession.sessionId,
                roomName: liveKitSession.roomName
            },
            message: 'Outbound call initiated successfully'
        };
    }
}

module.exports = VoiceBriefingService;