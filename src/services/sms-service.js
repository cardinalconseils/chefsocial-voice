// ChefSocial SMS Human-in-the-Loop Service
require('dotenv').config();
const twilio = require('twilio');
const ChefSocialDatabase = require('./database');
const I18nManager = require('../../i18n');

class SMSService {
    constructor() {
        this.client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        this.twilioNumber = process.env.TWILIO_PHONE_NUMBER;
        this.db = new ChefSocialDatabase();
        this.i18n = new I18nManager();
        
        // SMS workflow states
        this.workflows = new Map();
        
        // Generate session ID utility
        this.generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    // Send content for approval via SMS
    async sendContentForApproval(userId, contentId, content) {
        try {
            const user = await this.db.getUserById(userId);
            if (!user || !user.phone) {
                throw new Error('User phone number not found');
            }

            // Create approval workflow
            const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            
            this.workflows.set(workflowId, {
                type: 'content_approval',
                userId: userId,
                contentId: contentId,
                content: content,
                status: 'pending',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            });

            // Get user's preferred language
            const userLanguage = user.preferred_language || 'en';
            
            // Format content for SMS with translation support
            const platform = content.platform || 'social media';
            const caption = content.caption || content.instagram?.caption || content.tiktok?.caption || '';
            const hashtags = content.hashtags || content.instagram?.hashtags || content.tiktok?.hashtags || '';
            
            const message = `🍽️ ${this.i18n.t('sms.approval.title', userLanguage)}\n\n` +
                `${this.i18n.t('sms.approval.platform', userLanguage, { platform: platform.toUpperCase() })}\n\n` +
                `${this.i18n.t('sms.approval.caption', userLanguage)}\n${caption}\n\n` +
                `${this.i18n.t('sms.approval.hashtags', userLanguage, { hashtags })}\n\n` +
                `${this.i18n.t('sms.approval.actions', userLanguage)}\n` +
                `${this.i18n.t('sms.approval.approve', userLanguage)}\n` +
                `${this.i18n.t('sms.approval.edit', userLanguage)}\n` +
                `${this.i18n.t('sms.approval.reject', userLanguage)}\n` +
                `${this.i18n.t('sms.approval.view', userLanguage)}\n\n` +
                `${this.i18n.t('sms.approval.id', userLanguage, { id: workflowId.substring(-6) })}`;

            const smsResponse = await this.client.messages.create({
                body: message,
                from: this.twilioNumber,
                to: user.phone
            });

            console.log(`✅ SMS sent to ${user.phone} for content approval`);
            
            // Track SMS usage
            await this.db.trackUsage(userId, 'sms_human_loop', JSON.stringify({
                type: 'content_approval',
                workflowId: workflowId,
                messageId: smsResponse.sid
            }));

            return {
                success: true,
                workflowId: workflowId,
                messageId: smsResponse.sid
            };

        } catch (error) {
            console.error('❌ SMS approval error:', error);
            throw error;
        }
    }

    // Send daily content suggestions via SMS
    async sendDailyContentSuggestions(userId) {
        try {
            const user = await this.db.getUserById(userId);
            if (!user || !user.phone) {
                throw new Error('User phone number not found');
            }

            // Get recent content to analyze patterns
            const recentContent = await new Promise((resolve, reject) => {
                this.db.db.all(`
                    SELECT platform, caption, viral_score, created_at 
                    FROM generated_content 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT 10
                `, [userId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            // Get user's preferred language
            const userLanguage = user.preferred_language || 'en';
            
            // Generate personalized suggestions based on day and restaurant
            const suggestions = this.generateDailySuggestions(user, recentContent, userLanguage);
            
            const message = `🌟 ${this.i18n.t('sms.suggestions.greeting', userLanguage, { name: user.name })}\n\n` +
                `${this.i18n.t('sms.suggestions.title', userLanguage, { restaurant: user.restaurant_name })}\n\n` +
                suggestions.map((suggestion, index) => 
                    `${index + 1}. ${suggestion}`
                ).join('\n\n') +
                `\n\n${this.i18n.t('sms.suggestions.instructions', userLanguage)}\n\n` +
                `${this.i18n.t('sms.suggestions.tip', userLanguage, { tip: this.getDailyTip(userLanguage) })}`;

            const smsResponse = await this.client.messages.create({
                body: message,
                from: this.twilioNumber,
                to: user.phone
            });

            console.log(`✅ Daily suggestions sent to ${user.phone}`);
            
            return {
                success: true,
                messageId: smsResponse.sid,
                suggestions: suggestions
            };

        } catch (error) {
            console.error('❌ Daily suggestions error:', error);
            throw error;
        }
    }

    // Process incoming SMS responses
    async processIncomingSMS(fromNumber, messageBody, messageSid) {
        try {
            // Find user by phone number
            const user = await new Promise((resolve, reject) => {
                this.db.db.get(`
                    SELECT * FROM users WHERE phone = ? AND status = 'active'
                `, [fromNumber], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!user) {
                return await this.sendResponse(fromNumber, 
                    "❌ Phone number not registered. Please register at chef-social.com first!");
            }

            const response = messageBody.trim().toUpperCase();
            
            // Check for active workflows
            const activeWorkflow = this.findActiveWorkflow(user.id);
            
            if (activeWorkflow) {
                return await this.handleWorkflowResponse(activeWorkflow, response, fromNumber);
            }
            
            // Handle general commands
            return await this.handleGeneralCommand(user, response, fromNumber);

        } catch (error) {
            console.error('❌ Incoming SMS processing error:', error);
            return await this.sendResponse(fromNumber, 
                "❌ Sorry, something went wrong. Please try again or contact support.");
        }
    }

    // Handle workflow-specific responses
    async handleWorkflowResponse(workflow, response, fromNumber) {
        const workflowId = Array.from(this.workflows.entries())
            .find(([id, w]) => w === workflow)?.[0];

        if (workflow.type === 'content_approval') {
            switch (response) {
                case 'APPROVE':
                case '✅':
                    workflow.status = 'approved';
                    await this.publishContent(workflow.contentId, workflow.userId);
                    this.workflows.delete(workflowId);
                    return await this.sendResponse(fromNumber, 
                        "✅ Content approved and scheduled for publishing! 🚀");

                case 'EDIT':
                case '✏️':
                    workflow.status = 'editing';
                    return await this.sendResponse(fromNumber, 
                        "✏️ What would you like to change? Reply with your edits or call us for voice editing!");

                case 'REJECT':
                case '❌':
                    workflow.status = 'rejected';
                    this.workflows.delete(workflowId);
                    return await this.sendResponse(fromNumber, 
                        "❌ Content rejected and discarded. We'll create better options next time!");

                case 'VIEW':
                case '📱':
                    return await this.sendResponse(fromNumber, 
                        `📱 View your content at: https://app.chef-social.com/content/${workflow.contentId}`);

                default:
                    return await this.sendResponse(fromNumber, 
                        "Please reply with: APPROVE, EDIT, REJECT, or VIEW");
            }
        }

        return await this.sendResponse(fromNumber, "Command not recognized.");
    }

    // Handle general SMS commands
    async handleGeneralCommand(user, command, fromNumber) {
        switch (command) {
            case 'HELP':
                return await this.sendResponse(fromNumber, 
                    `🍽️ ChefSocial Commands:\n\n` +
                    `SUGGESTIONS - Get daily content ideas\n` +
                    `VOICE - Start voice content creation\n` +
                    `STATUS - Check your account status\n` +
                    `HELP - Show this menu\n\n` +
                    `Or visit: app.chef-social.com`);

            case 'SUGGESTIONS':
                return await this.sendDailyContentSuggestions(user.id);

            case 'VOICE':
                return await this.sendResponse(fromNumber, 
                    `🎤 Ready for voice input!\n\n` +
                    `Call: ${this.twilioNumber}\n` +
                    `Or visit: app.chef-social.com/voice\n\n` +
                    `Describe your dish and we'll create amazing content!`);

            case 'STATUS':
                const plan = user.plan_name || 'trial';
                return await this.sendResponse(fromNumber, 
                    `📊 Account Status:\n\n` +
                    `Restaurant: ${user.restaurant_name}\n` +
                    `Plan: ${plan.toUpperCase()}\n` +
                    `Status: Active ✅\n\n` +
                    `Manage at: app.chef-social.com/dashboard`);

            default:
                // Check if it's a number (content suggestion selection)
                const suggestionNumber = parseInt(command);
                if (!isNaN(suggestionNumber) && suggestionNumber >= 1 && suggestionNumber <= 5) {
                    return await this.sendResponse(fromNumber, 
                        `🎯 Great choice! Creating content for suggestion #${suggestionNumber}...\n\n` +
                        `We'll have your content ready in a few minutes and send it for approval!`);
                }

                return await this.sendResponse(fromNumber, 
                    `❓ Command not recognized. Reply "HELP" for available commands.`);
        }
    }

    // Generate daily content suggestions with language support
    generateDailySuggestions(user, recentContent, language = 'en') {
        const dayOfWeek = new Date().getDay();
        const restaurantName = user.restaurant_name || 'your restaurant';
        const cuisineType = user.cuisine_type || 'delicious food';
        
        // Create language-specific suggestions
        const suggestions = language === 'fr' ? [
            `Coulisses de la préparation de ${cuisineType} chez ${restaurantName}`,
            `Présentation du plat préféré des clients avec histoire`,
            `Spécial du chef d'aujourd'hui avec mise en valeur des ingrédients`,
            `Annonce des spéciaux de la semaine avec visuels appétissants`,
            `Coup de projecteur sur l'équipe ou moment en cuisine`
        ] : [
            `Behind-the-scenes of preparing ${cuisineType} at ${restaurantName}`,
            `Customer favorite dish showcase with story`,
            `Chef's special for today with ingredients highlight`,
            `Weekly specials announcement with appetizing visuals`,
            `Staff spotlight or kitchen team moment`
        ];

        // Customize based on day of week with language support
        const daySpecific = language === 'fr' ? {
            0: 'Spécial brunch du dimanche ou repas familial', // Sunday
            1: 'Repas motivant du lundi ou nouveau départ', // Monday  
            2: 'Test de goût du mardi ou nouvelle recette', // Tuesday
            3: 'Spécial réconfort du mercredi', // Wednesday
            4: 'Plat nostalgie du jeudi ou classique', // Thursday
            5: 'Célébration du vendredi ou préparation du weekend', // Friday
            6: 'Plat signature du samedi ou cuisine occupée' // Saturday
        } : {
            0: 'Sunday brunch special or family dining', // Sunday
            1: 'Monday motivation meal or fresh start', // Monday  
            2: 'Tuesday taste test or new recipe', // Tuesday
            3: 'Hump day comfort food special', // Wednesday
            4: 'Thursday throwback dish or classic', // Thursday
            5: 'Friday celebration or weekend prep', // Friday
            6: 'Saturday signature dish or busy kitchen' // Saturday
        };

        suggestions[2] = daySpecific[dayOfWeek];
        return suggestions;
    }

    // Get daily marketing tip with language support
    getDailyTip(language = 'en') {
        const tips = language === 'fr' ? [
            "Publiez quand vos clients sont les plus actifs (18h-20h fonctionne généralement bien)",
            "Utilisez des hashtags locaux pour atteindre les clients de votre région",
            "Montrez le processus de cuisson - les gens adorent le contenu des coulisses",
            "Posez des questions dans vos légendes pour stimuler l'engagement",
            "Partagez les témoignages et avis des clients",
            "Mettez en valeur les ingrédients de saison et les spéciaux",
            "Utilisez des audios tendance sur les vidéos pour une meilleure portée"
        ] : [
            "Post when your customers are most active (6-8 PM typically works best)",
            "Use local hashtags to reach customers in your area",
            "Show the cooking process - people love behind-the-scenes content",
            "Ask questions in your captions to boost engagement",
            "Share customer testimonials and reviews",
            "Highlight seasonal ingredients and specials",
            "Use trending audio on videos for better reach"
        ];

        return tips[Math.floor(Math.random() * tips.length)];
    }

    // Find active workflow for user
    findActiveWorkflow(userId) {
        for (const [id, workflow] of this.workflows.entries()) {
            if (workflow.userId === userId && workflow.status === 'pending') {
                // Check if expired
                if (workflow.expiresAt < new Date()) {
                    this.workflows.delete(id);
                    continue;
                }
                return workflow;
            }
        }
        return null;
    }

    // Publish approved content
    async publishContent(contentId, userId) {
        try {
            // In a real implementation, this would:
            // 1. Connect to social media APIs
            // 2. Schedule the post
            // 3. Update the content status
            
            await new Promise((resolve, reject) => {
                this.db.db.run(`
                    UPDATE generated_content 
                    SET published_at = CURRENT_TIMESTAMP 
                    WHERE id = ? AND user_id = ?
                `, [contentId, userId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log(`✅ Content ${contentId} marked as published`);
            
        } catch (error) {
            console.error('❌ Publish content error:', error);
            throw error;
        }
    }

    // Send SMS response
    async sendResponse(toNumber, message) {
        try {
            const smsResponse = await this.client.messages.create({
                body: message,
                from: this.twilioNumber,
                to: toNumber
            });

            console.log(`✅ SMS response sent to ${toNumber}`);
            return { success: true, messageId: smsResponse.sid };

        } catch (error) {
            console.error('❌ SMS response error:', error);
            throw error;
        }
    }

    // Clean up expired workflows
    cleanupExpiredWorkflows() {
        const now = new Date();
        for (const [id, workflow] of this.workflows.entries()) {
            if (workflow.expiresAt < now) {
                this.workflows.delete(id);
                console.log(`🧹 Cleaned up expired workflow: ${id}`);
            }
        }
    }

    // ===== NEW SMS SCHEDULING FUNCTIONALITY =====

    // Create briefing session when image is received via SMS
    async createBriefingSession(phoneNumber, imageUrl, userId = null) {
        try {
            const sessionId = this.generateSessionId();
            
            // Create session in database
            await this.db.createBriefingSession({
                id: sessionId,
                phoneNumber: phoneNumber,
                userId: userId,
                imageUrl: imageUrl,
                uploadMethod: 'sms'
            });

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

            const smsResponse = await this.client.messages.create({
                body: message,
                from: this.twilioNumber,
                to: phoneNumber
            });

            console.log(`✅ Scheduling options sent to ${phoneNumber}`);
            return { success: true, messageId: smsResponse.sid };

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
            // Get active session for this phone number
            const session = await this.db.getActiveBriefingSessionByPhone(phoneNumber);
            if (!session) {
                return await this.sendResponse(phoneNumber, 
                    "❌ No active session found. Please send a new image to start.");
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

            await this.sendResponse(phoneNumber, confirmationMessage);

            // Return scheduling info for N8N workflow
            return {
                success: true,
                sessionId: session.id,
                scheduledTime: scheduleInfo.scheduledTime,
                responseType: scheduleInfo.responseType
            };

        } catch (error) {
            console.error('❌ Handle scheduling response error:', error);
            await this.sendResponse(phoneNumber, 
                "❌ Sorry, couldn't schedule your call. Please try again or reply with 1, 2, 3, or 4.");
            throw error;
        }
    }

    // Send pre-call notification
    async sendPreCallNotification(phoneNumber, sessionId) {
        try {
            const message = `🎙️ ChefSocial calling you now for your content briefing!\n\n` +
                `Please answer the call and tell me about your dish.\n\n` +
                `Session: ${sessionId.slice(-6)}`;

            const smsResponse = await this.client.messages.create({
                body: message,
                from: this.twilioNumber,
                to: phoneNumber
            });

            console.log(`✅ Pre-call notification sent to ${phoneNumber}`);
            return { success: true, messageId: smsResponse.sid };

        } catch (error) {
            console.error('❌ Send pre-call notification error:', error);
            throw error;
        }
    }

    // Send content ready notification with approval options
    async sendContentReadyNotification(phoneNumber, sessionId, contentPreview) {
        try {
            const message = `🚀 Your viral content is ready!\n\n` +
                `Preview: ${contentPreview.caption?.substring(0, 100)}...\n\n` +
                `Platforms: ${contentPreview.platforms?.join(', ') || 'Multiple'}\n\n` +
                `Reply with:\n` +
                `✅ APPROVE - Post it now\n` +
                `✏️ EDIT - Make changes\n` +
                `👀 VIEW - See full content\n` +
                `❌ REJECT - Start over\n\n` +
                `Session: ${sessionId.slice(-6)}`;

            const smsResponse = await this.client.messages.create({
                body: message,
                from: this.twilioNumber,
                to: phoneNumber
            });

            console.log(`✅ Content ready notification sent to ${phoneNumber}`);
            return { success: true, messageId: smsResponse.sid };

        } catch (error) {
            console.error('❌ Send content ready notification error:', error);
            throw error;
        }
    }
}

module.exports = SMSService;