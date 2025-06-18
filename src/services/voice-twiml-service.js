// Voice TwiML Service - Twilio voice integration and TwiML generation
class VoiceTwiMLService {
    constructor(services) {
        this.authSystem = services.authSystem;
        this.logger = services.logger;
        this.liveKitService = services.liveKitService;
        this.voiceCallingService = services.voiceCallingService;
        this.twilio = services.twilio;
    }

    async generateBriefingTwiML(sessionId, req) {
        if (!sessionId) {
            return '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid session</Say><Hangup/></Response>';
        }

        const session = await this.authSystem.db.getBriefingSession(sessionId);
        if (!session) {
            return '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Session not found</Say><Hangup/></Response>';
        }

        const liveKitSession = await this.liveKitService.createBriefingRoom(sessionId, session.phone_number, session.image_url);
        const twiml = this.voiceCallingService.generateBriefingTwiML(sessionId, liveKitSession.roomName, 'en');

        return twiml;
    }

    async generateConnectLiveKitTwiML(sessionId, room) {
        const VoiceResponse = this.twilio.twiml.VoiceResponse;
        const twiml = new VoiceResponse();

        twiml.say({
            voice: 'Polly.Joanna'
        }, "Thank you for using ChefSocial. Our AI assistant will now start the briefing session.");

        const gather = twiml.gather({
            input: 'speech',
            speechTimeout: 10,
            action: `/api/voice/twiml/process-speech?sessionId=${sessionId}`,
            method: 'POST'
        });

        gather.say({
            voice: 'Polly.Joanna'
        }, "Please tell me about the dish in your photo. What makes it special and who is your target audience?");

        twiml.say({
            voice: 'Polly.Joanna'
        }, "I didn't hear anything. Let me try again.");
        
        twiml.redirect(`/api/voice/twiml/connect-livekit?sessionId=${sessionId}&room=${room}`);

        return twiml.toString();
    }

    async processSpeechInput(sessionId, speechResult, confidence) {
        const VoiceResponse = this.twilio.twiml.VoiceResponse;
        const twiml = new VoiceResponse();

        if (speechResult && parseFloat(confidence) > 0.7) {
            // Save speech to briefing context
            await this.authSystem.db.saveBriefingContext({
                sessionId,
                transcript: speechResult,
                dishStory: speechResult,
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
            await this.authSystem.db.updateBriefingSessionSchedule(sessionId, new Date().toISOString(), 'completed');
            
            // Trigger webhook for content generation
            if (process.env.EXTERNAL_WEBHOOK_URL) {
                fetch(process.env.EXTERNAL_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId,
                        status: 'briefing_completed',
                        timestamp: new Date().toISOString(),
                        transcript: speechResult
                    })
                }).catch(err => this.logger.error('Webhook error:', err));
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
        return twiml.toString();
    }

    async handleCallStatusUpdate(callSid, callStatus, callDuration, recordingUrl) {
        await this.voiceCallingService.handleCallStatusUpdate(callSid, callStatus, callDuration, recordingUrl);

        this.logger.info('Call status update processed', {
            callSid,
            status: callStatus,
            duration: callDuration,
            service: 'twilio-voice'
        });

        return 'OK';
    }
}

module.exports = VoiceTwiMLService;