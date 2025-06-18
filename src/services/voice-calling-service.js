// ChefSocial Voice Calling Service - Twilio Voice API Integration
require('dotenv').config();
const twilio = require('twilio');

class VoiceCallingService {
    constructor(database = null, logger = null) {
        this.client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        this.twilioNumber = process.env.TWILIO_PHONE_NUMBER;
        this.db = database;
        this.logger = logger;
        
        // Voice call tracking
        this.activeCalls = new Map(); // callSid -> callData
        this.briefingCalls = new Map(); // briefingSessionId -> callSid
        
        console.log('✅ VoiceCallingService initialized');
    }

    // Make outbound call to phone number for briefing session
    async makeOutboundCall(phoneNumber, briefingSessionId, liveKitSessionData) {
        try {
            const baseUrl = process.env.CHEFSOCIAL_API_URL || 'https://api.chefsocial.io';
            
            // Create TwiML for the call
            const twimlUrl = `${baseUrl}/api/voice/twiml/briefing-call?sessionId=${briefingSessionId}`;
            const statusCallbackUrl = `${baseUrl}/api/voice/webhook/call-status`;
            
            console.log(`📞 Initiating outbound call to ${phoneNumber} for briefing ${briefingSessionId}`);
            
            const call = await this.client.calls.create({
                to: phoneNumber,
                from: this.twilioNumber,
                url: twimlUrl,
                statusCallback: statusCallbackUrl,
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                statusCallbackMethod: 'POST',
                timeout: 60, // Ring for 60 seconds
                record: false, // We'll handle recording via LiveKit
                machineDetection: 'Enable', // Detect answering machines
                machineDetectionTimeout: 10
            });

            // Track the call
            const callData = {
                callSid: call.sid,
                phoneNumber,
                briefingSessionId,
                liveKitSessionData,
                status: 'initiated',
                startTime: new Date(),
                direction: 'outbound'
            };

            this.activeCalls.set(call.sid, callData);
            this.briefingCalls.set(briefingSessionId, call.sid);

            // Update briefing session status
            if (this.db) {
                await this.db.updateBriefingSessionSchedule(briefingSessionId, new Date().toISOString(), 'in_progress');
            }
            
            console.log(`✅ Outbound call initiated: ${call.sid}`);
            return {
                success: true,
                callSid: call.sid,
                status: 'initiated',
                briefingSessionId
            };

        } catch (error) {
            console.error('❌ Outbound call error:', error);
            
            // Update briefing session status to failed
            if (briefingSessionId && this.db) {
                await this.db.updateBriefingSessionSchedule(briefingSessionId, null, 'failed');
            }
            
            throw error;
        }
    }

    // Generate TwiML for briefing call
    generateBriefingTwiML(briefingSessionId, liveKitRoomName, language = 'en') {
        const VoiceResponse = twilio.twiml.VoiceResponse;
        const twiml = new VoiceResponse();

        // Welcome message
        const welcomeMessage = language === 'fr' ? 
            "Bonjour ! C'est votre assistant IA ChefSocial. Je vous appelle pour créer du contenu viral pour votre restaurant. Restez en ligne pendant que je me connecte à notre système." :
            "Hello! This is your ChefSocial AI assistant. I'm calling to create viral content for your restaurant. Please stay on the line while I connect to our system.";

        twiml.say({
            voice: 'Polly.Joanna',
            language: language === 'fr' ? 'fr-FR' : 'en-US'
        }, welcomeMessage);

        // Connect to LiveKit room
        if (liveKitRoomName) {
            // Use Twilio's WebRTC capabilities to bridge to LiveKit
            // Note: This would require additional configuration with LiveKit SIP gateway
            twiml.say({
                voice: 'Polly.Joanna',
                language: language === 'fr' ? 'fr-FR' : 'en-US'
            }, language === 'fr' ? 
                "Connexion à votre session de briefing..." :
                "Connecting you to your briefing session...");

            // For now, we'll redirect to a webhook that handles the LiveKit connection
            const baseUrl = process.env.CHEFSOCIAL_API_URL || 'https://api.chefsocial.io';
            twiml.redirect(`${baseUrl}/api/voice/twiml/connect-livekit?sessionId=${briefingSessionId}&room=${liveKitRoomName}`);
        } else {
            // Fallback to direct conversation
            twiml.say({
                voice: 'Polly.Joanna',
                language: language === 'fr' ? 'fr-FR' : 'en-US'
            }, language === 'fr' ? 
                "Désolé, il y a eu un problème technique. Veuillez réessayer plus tard." :
                "Sorry, there was a technical issue. Please try again later.");
            
            twiml.hangup();
        }

        return twiml.toString();
    }

    // Handle call status updates from Twilio
    async handleCallStatusUpdate(callSid, status, duration, recordingUrl) {
        try {
            const callData = this.activeCalls.get(callSid);
            if (!callData) {
                console.log(`⚠️ Call status update for unknown call: ${callSid}`);
                return;
            }

            callData.status = status;
            callData.lastUpdate = new Date();

            if (duration) {
                callData.duration = parseInt(duration);
            }

            if (recordingUrl) {
                callData.recordingUrl = recordingUrl;
            }

            console.log(`📞 Call ${callSid} status: ${status} (Briefing: ${callData.briefingSessionId})`);

            // Handle specific status updates
            switch (status) {
                case 'answered':
                    console.log(`✅ Call answered for briefing ${callData.briefingSessionId}`);
                    if (this.db) {
                        await this.db.trackWorkflowStep(callData.briefingSessionId, 'call_answered', 'completed', {
                            callSid,
                            answeredAt: new Date().toISOString()
                        });
                    }
                    break;

                case 'completed':
                case 'failed':
                case 'canceled':
                case 'no-answer':
                    console.log(`📞 Call ended: ${status} for briefing ${callData.briefingSessionId}`);
                    
                    // Update briefing session
                    const finalStatus = status === 'completed' ? 'completed' : 'failed';
                    if (this.db) {
                        await this.db.updateBriefingSessionSchedule(callData.briefingSessionId, null, finalStatus);
                        
                        // Track workflow completion
                        await this.db.trackWorkflowStep(callData.briefingSessionId, 'call_completed', finalStatus, {
                            callSid,
                            finalStatus: status,
                            duration: callData.duration,
                            recordingUrl: callData.recordingUrl
                        });
                    }

                    // Clean up tracking
                    this.activeCalls.delete(callSid);
                    this.briefingCalls.delete(callData.briefingSessionId);
                    break;
            }

            return { success: true, status };

        } catch (error) {
            console.error('❌ Call status update error:', error);
            throw error;
        }
    }

    // Get active call for briefing session
    getActiveCallForBriefing(briefingSessionId) {
        const callSid = this.briefingCalls.get(briefingSessionId);
        if (!callSid) return null;

        return this.activeCalls.get(callSid);
    }

    // End call for briefing session
    async endBriefingCall(briefingSessionId) {
        try {
            const callSid = this.briefingCalls.get(briefingSessionId);
            if (!callSid) {
                throw new Error('No active call found for briefing session');
            }

            console.log(`📞 Ending call ${callSid} for briefing ${briefingSessionId}`);
            
            await this.client.calls(callSid).update({
                status: 'completed'
            });

            return { success: true, callSid };

        } catch (error) {
            console.error('❌ End briefing call error:', error);
            throw error;
        }
    }

    // Check if phone number can receive calls (basic validation)
    async validatePhoneNumber(phoneNumber) {
        try {
            // Use Twilio Lookup API to validate phone number
            const lookup = await this.client.lookups.v1.phoneNumbers(phoneNumber).fetch({
                type: ['carrier']
            });

            const isValid = lookup && lookup.carrier && lookup.carrier.type !== null;
            const canReceiveCalls = lookup.carrier && 
                (lookup.carrier.type === 'mobile' || lookup.carrier.type === 'landline');

            return {
                valid: isValid,
                canReceiveCalls,
                carrierInfo: lookup.carrier,
                phoneNumber: lookup.phoneNumber
            };

        } catch (error) {
            console.error('❌ Phone validation error:', error);
            return {
                valid: false,
                canReceiveCalls: false,
                error: error.message
            };
        }
    }

    // Get call metrics
    getMetrics() {
        return {
            activeCalls: this.activeCalls.size,
            briefingSessions: this.briefingCalls.size,
            callsInProgress: Array.from(this.activeCalls.values()).filter(call => 
                ['initiated', 'ringing', 'answered'].includes(call.status)
            ).length
        };
    }
}

module.exports = VoiceCallingService;