// ChefSocial Briefing Session Service - SMS Scheduling & Session Management
require('dotenv').config();

class BriefingSessionService {
    constructor(database = null, smsService = null, logger = null) {
        this.db = database;
        this.smsService = smsService;
        this.logger = logger;
        
        // Generate session ID utility
        this.generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        console.log('✅ BriefingSessionService initialized');
    }

    // Create briefing session when image is received via SMS
    async createBriefingSession(phoneNumber, imageUrl, userId = null) {
        try {
            const sessionId = this.generateSessionId();
            
            // Create session in database
            if (this.db) {
                await this.db.createBriefingSession({
                    id: sessionId,
                    phoneNumber: phoneNumber,
                    userId: userId,
                    imageUrl: imageUrl,
                    uploadMethod: 'sms'
                });
            }

            console.log(`✅ Created briefing session ${sessionId} for ${phoneNumber}`);
            return { sessionId, success: true };

        } catch (error) {
            console.error('❌ Create briefing session error:', error);
            throw error;
        }
    }

    // Send scheduling options SMS
    async sendSchedulingOptions(phoneNumber, sessionId, language = 'en') {
        try {
            if (!this.smsService) {
                throw new Error('SMS Service not available');
            }

            const message = language === 'fr' ? 
                `🍽️ Image reçue ! ChefSocial est prêt à créer du contenu viral pour vous.\n\n` +
                `Quand voulez-vous que votre assistant IA vous appelle pour le briefing ?\n\n` +
                `Répondez avec :\n` +
                `1 - Maintenant\n` +
                `2 - Dans 30 minutes\n` +
                `3 - Dans 1 heure\n` +
                `4 - Dites-moi l'heure (ex: 15:30)\n\n` +
                `Session: ${sessionId.slice(-6)}`
                :
                `🍽️ Image received! ChefSocial is ready to create viral content for you.\n\n` +
                `When would you like your AI assistant to call you for briefing?\n\n` +
                `Reply with:\n` +
                `1 - Now\n` +
                `2 - In 30 minutes\n` +
                `3 - In 1 hour\n` +
                `4 - Tell me the time (e.g., 3:30 PM)\n\n` +
                `Session: ${sessionId.slice(-6)}`;

            await this.smsService.sendResponse(phoneNumber, message);
            console.log(`✅ Scheduling options sent to ${phoneNumber}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Send scheduling options error:', error);
            throw error;
        }
    }

    // Parse scheduling response from chef
    parseScheduleResponse(responseText) {
        const response = responseText.trim().toLowerCase();
        const now = new Date();

        try {
            // Option 1: Now
            if (response === '1' || response.includes('now') || response.includes('maintenant')) {
                return {
                    scheduledTime: new Date(now.getTime() + 2 * 60 * 1000), // 2 minutes from now
                    responseType: 'immediate',
                    parsedSchedule: 'now'
                };
            }

            // Option 2: 30 minutes
            if (response === '2' || response.includes('30') || response.includes('trente')) {
                return {
                    scheduledTime: new Date(now.getTime() + 30 * 60 * 1000),
                    responseType: 'delay_30min',
                    parsedSchedule: '30 minutes'
                };
            }

            // Option 3: 1 hour
            if (response === '3' || response.includes('hour') || response.includes('heure')) {
                return {
                    scheduledTime: new Date(now.getTime() + 60 * 60 * 1000),
                    responseType: 'delay_1hour',
                    parsedSchedule: '1 hour'
                };
            }

            // Option 4: Specific time
            if (response === '4' || response.includes(':')) {
                // Try to parse time formats like "15:30", "3:30 PM", "3h30"
                const timeMatch = response.match(/(\d{1,2})[:h](\d{2})(\s*(am|pm))?/i);
                if (timeMatch) {
                    let hours = parseInt(timeMatch[1]);
                    const minutes = parseInt(timeMatch[2]);
                    const isPM = timeMatch[4] && timeMatch[4].toLowerCase() === 'pm';

                    if (isPM && hours !== 12) hours += 12;
                    if (!isPM && hours === 12) hours = 0;

                    const scheduledTime = new Date(now);
                    scheduledTime.setHours(hours, minutes, 0, 0);

                    // If time has passed today, schedule for tomorrow
                    if (scheduledTime <= now) {
                        scheduledTime.setDate(scheduledTime.getDate() + 1);
                    }

                    return {
                        scheduledTime,
                        responseType: 'specific_time',
                        parsedSchedule: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                    };
                }
            }

            // Fallback: default to 30 minutes
            return {
                scheduledTime: new Date(now.getTime() + 30 * 60 * 1000),
                responseType: 'fallback',
                parsedSchedule: 'default 30 minutes'
            };

        } catch (error) {
            console.error('❌ Parse schedule error:', error);
            // Fallback to immediate
            return {
                scheduledTime: new Date(now.getTime() + 5 * 60 * 1000),
                responseType: 'error_fallback',
                parsedSchedule: 'error - default 5 minutes'
            };
        }
    }

    // Handle scheduling response from chef
    async handleSchedulingResponse(phoneNumber, responseText) {
        try {
            if (!this.db) {
                throw new Error('Database not available');
            }

            // Get active session for this phone number
            const session = await this.db.getActiveBriefingSessionByPhone(phoneNumber);
            if (!session) {
                if (this.smsService) {
                    await this.smsService.sendResponse(phoneNumber, 
                        "❌ No active session found. Please send a new image to start.");
                }
                return { success: false, error: 'No active session' };
            }

            // Parse the scheduling response
            const scheduleInfo = this.parseScheduleResponse(responseText);

            // Save the response
            await this.db.saveSchedulingResponse({
                sessionId: session.id,
                phoneNumber: phoneNumber,
                responseText: responseText,
                parsedSchedule: scheduleInfo.parsedSchedule,
                scheduledTime: scheduleInfo.scheduledTime,
                responseType: scheduleInfo.responseType
            });

            // Update session with scheduled time
            await this.db.updateBriefingSessionSchedule(
                session.id, 
                scheduleInfo.scheduledTime, 
                'scheduled'
            );

            // Send confirmation
            const confirmationMessage = scheduleInfo.responseType === 'immediate' ?
                `🎙️ Perfect! I'll call you in 2 minutes for your content briefing.\n\nGet ready to tell me about your dish!` :
                `✅ Scheduled! I'll call you at ${scheduleInfo.scheduledTime.toLocaleTimeString()} for your content briefing.\n\nSession: ${session.id.slice(-6)}`;

            if (this.smsService) {
                await this.smsService.sendResponse(phoneNumber, confirmationMessage);
            }

            // Return scheduling info for N8N workflow
            return {
                success: true,
                sessionId: session.id,
                scheduledTime: scheduleInfo.scheduledTime,
                responseType: scheduleInfo.responseType
            };

        } catch (error) {
            console.error('❌ Handle scheduling response error:', error);
            if (this.smsService) {
                await this.smsService.sendResponse(phoneNumber, 
                    "❌ Sorry, couldn't schedule your call. Please try again or reply with 1, 2, 3, or 4.");
            }
            throw error;
        }
    }

    // Send pre-call notification
    async sendPreCallNotification(phoneNumber, sessionId) {
        try {
            if (!this.smsService) {
                throw new Error('SMS Service not available');
            }

            const message = `🎙️ ChefSocial calling you now for your content briefing!\n\n` +
                `Please answer the call and tell me about your dish.\n\n` +
                `Session: ${sessionId.slice(-6)}`;

            await this.smsService.sendResponse(phoneNumber, message);
            console.log(`✅ Pre-call notification sent to ${phoneNumber}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Send pre-call notification error:', error);
            throw error;
        }
    }

    // Send content ready notification with approval options
    async sendContentReadyNotification(phoneNumber, sessionId, contentPreview) {
        try {
            if (!this.smsService) {
                throw new Error('SMS Service not available');
            }

            const message = `🚀 Your viral content is ready!\n\n` +
                `Preview: ${contentPreview.caption?.substring(0, 100)}...\n\n` +
                `Platforms: ${contentPreview.platforms?.join(', ') || 'Multiple'}\n\n` +
                `Reply with:\n` +
                `✅ APPROVE - Post it now\n` +
                `✏️ EDIT - Make changes\n` +
                `👀 VIEW - See full content\n` +
                `❌ REJECT - Start over\n\n` +
                `Session: ${sessionId.slice(-6)}`;

            await this.smsService.sendResponse(phoneNumber, message);
            console.log(`✅ Content ready notification sent to ${phoneNumber}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Send content ready notification error:', error);
            throw error;
        }
    }

    // Get briefing session by ID
    async getBriefingSession(sessionId) {
        if (!this.db) {
            throw new Error('Database not available');
        }
        return await this.db.getBriefingSession(sessionId);
    }

    // Get active briefing session by phone number
    async getActiveBriefingSessionByPhone(phoneNumber) {
        if (!this.db) {
            throw new Error('Database not available');
        }
        return await this.db.getActiveBriefingSessionByPhone(phoneNumber);
    }

    // Update briefing session status
    async updateBriefingSessionStatus(sessionId, status, scheduledTime = null) {
        if (!this.db) {
            throw new Error('Database not available');
        }
        return await this.db.updateBriefingSessionSchedule(sessionId, scheduledTime, status);
    }

    // Save briefing context from voice conversation
    async saveBriefingContext(contextData) {
        if (!this.db) {
            throw new Error('Database not available');
        }
        return await this.db.saveBriefingContext(contextData);
    }

    // Track workflow step
    async trackWorkflowStep(sessionId, step, status, data = null) {
        if (!this.db) {
            throw new Error('Database not available');
        }
        return await this.db.trackWorkflowStep(sessionId, step, status, data);
    }

    // Get briefing session metrics
    getMetrics() {
        // This would be enhanced with actual database queries if needed
        return {
            service: 'briefing-session',
            status: 'operational'
        };
    }
}

module.exports = BriefingSessionService;