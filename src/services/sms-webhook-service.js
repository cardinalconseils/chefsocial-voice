// SMS Webhook Service - Twilio webhook handling for SMS/MMS
class SMSWebhookService {
    constructor(services) {
        this.authSystem = services.authSystem;
        this.logger = services.logger;
        this.smsService = services.smsService;
        this.twilio = services.twilio;
    }

    async processIncomingSMS(req, res) {
        const twiml = new this.twilio.twiml.MessagingResponse();
        
        const fromNumber = req.body.From;
        const messageBody = req.body.Body;
        const messageSid = req.body.MessageSid;
        
        this.logger.info('Incoming SMS received', {
            fromNumber: fromNumber.slice(-4),
            messageLength: messageBody?.length || 0,
            messageSid
        });
        
        try {
            // Process the incoming SMS
            await this.smsService.processIncomingSMS(fromNumber, messageBody, messageSid);
            
            // Log successful SMS processing
            this.logger.info('SMS processed successfully', {
                fromNumber: fromNumber.slice(-4),
                messageSid
            });
            
        } catch (error) {
            this.logger.error('SMS processing failed', error, {
                fromNumber: fromNumber.slice(-4),
                messageSid,
                messageBody: messageBody?.substring(0, 50)
            });
        }
        
        return twiml.toString();
    }

    async processImageReceived(req, res) {
        // Log all incoming Twilio webhook data for debugging
        this.logger.info('Twilio webhook /image-received called', {
            method: req.method,
            contentType: req.headers['content-type'],
            userAgent: req.headers['user-agent'],
            twilioSignature: req.headers['x-twilio-signature'],
            bodySize: req.body ? Buffer.byteLength(req.body) : 0,
            rawBodyPreview: req.body ? req.body.toString().substring(0, 200) : 'no body'
        });

        const twiml = new this.twilio.twiml.MessagingResponse();
        
        // Parse Twilio form data
        const parsedBody = new URLSearchParams(req.body.toString());
        const fromNumber = parsedBody.get('From');
        const messageBody = parsedBody.get('Body') || '';
        const messageSid = parsedBody.get('MessageSid');
        const imageUrl = parsedBody.get('MediaUrl0');
        const numMedia = parseInt(parsedBody.get('NumMedia')) || 0;
        const toNumber = parsedBody.get('To');
        const accountSid = parsedBody.get('AccountSid');
        
        // Enhanced logging with all Twilio webhook data
        this.logger.info('MMS webhook parsed data', {
            fromNumber: fromNumber ? fromNumber.slice(-4) : 'missing',
            toNumber: toNumber ? toNumber.slice(-4) : 'missing',
            messageSid: messageSid || 'missing',
            accountSid: accountSid ? accountSid.substring(0, 10) + '...' : 'missing',
            hasImage: !!imageUrl,
            imageUrl: imageUrl ? imageUrl.substring(0, 50) + '...' : 'no image',
            numMedia,
            messageBodyLength: messageBody.length,
            allMediaUrls: Array.from({length: numMedia}, (_, i) => 
                parsedBody.get(`MediaUrl${i}`) ? 'present' : 'missing'
            )
        });
        
        // Validate required Twilio fields
        if (!fromNumber || !messageSid) {
            this.logger.error('Invalid Twilio webhook - missing required fields', {
                hasFrom: !!fromNumber,
                hasMessageSid: !!messageSid,
                hasAccountSid: !!accountSid,
                contentType: req.headers['content-type'],
                bodyPreview: req.body ? req.body.toString().substring(0, 100) : 'empty'
            });
            
            return twiml.toString();
        }
        
        try {
            // Audit log webhook call
            await this.logger.auditUserAction(
                null,
                'webhook_image_received',
                'webhook',
                messageSid,
                {
                    fromNumber: fromNumber.slice(-4),
                    hasImage: !!imageUrl,
                    numMedia,
                    twilioData: {
                        messageSid,
                        accountSid: accountSid ? accountSid.substring(0, 10) + '...' : null,
                        toNumber: toNumber ? toNumber.slice(-4) : null
                    }
                },
                req
            );

            if (imageUrl && numMedia > 0) {
                this.logger.info('Processing MMS with image - starting briefing session', {
                    fromNumber: fromNumber.slice(-4),
                    imageUrl: imageUrl.substring(0, 50) + '...',
                    numMedia
                });
                
                // Create briefing session for the image
                const result = await this.smsService.createBriefingSession(fromNumber, imageUrl);
                
                this.logger.info('Briefing session created - sending scheduling options', {
                    fromNumber: fromNumber.slice(-4),
                    sessionId: result.sessionId
                });
                
                // Send scheduling options
                await this.smsService.sendSchedulingOptions(fromNumber, result.sessionId);
                
                // Track the workflow step
                await this.authSystem.db.trackWorkflowStep(result.sessionId, 'image_received', 'completed', {
                    imageUrl,
                    messageBody,
                    messageSid,
                    twilioData: {
                        fromNumber: fromNumber,
                        toNumber: toNumber,
                        accountSid: accountSid
                    }
                });
                
                this.logger.info('MMS workflow completed successfully', {
                    fromNumber: fromNumber.slice(-4),
                    sessionId: result.sessionId,
                    messageSid,
                    workflowStep: 'image_received'
                });
                
            } else {
                this.logger.warn('MMS received without image - sending help message', {
                    fromNumber: fromNumber.slice(-4),
                    numMedia,
                    hasImageUrl: !!imageUrl,
                    messageSid
                });
                
                // No image found, send help message
                const helpResponse = await this.smsService.sendResponse(fromNumber, 
                    "🍽️ Welcome to ChefSocial! Please send a photo of your dish to start creating viral content. " +
                    "I'll then call you for a quick briefing to create amazing social media posts!");
                
                this.logger.info('Help message sent for imageless MMS', {
                    fromNumber: fromNumber.slice(-4),
                    messageSid: helpResponse.sid
                });
            }
            
        } catch (error) {
            this.logger.error('MMS image processing failed', error, {
                fromNumber: fromNumber ? fromNumber.slice(-4) : 'unknown',
                messageSid: messageSid || 'unknown',
                hasImage: !!imageUrl,
                numMedia,
                errorMessage: error.message,
                errorStack: error.stack,
                twilioData: {
                    accountSid: accountSid,
                    toNumber: toNumber
                }
            });
            
            // Send error message to user
            try {
                const errorResponse = await this.smsService.sendResponse(fromNumber, 
                    "❌ Sorry, there was an issue processing your image. Please try again or contact support.");
                
                this.logger.info('Error message sent to user', {
                    fromNumber: fromNumber.slice(-4),
                    errorMessageSid: errorResponse.sid
                });
            } catch (sendError) {
                this.logger.error('Failed to send error message to user', sendError, {
                    fromNumber: fromNumber ? fromNumber.slice(-4) : 'unknown',
                    originalError: error.message
                });
            }
        }
        
        return twiml.toString();
    }

    async processScheduleResponse(req, res, app) {
        // Log all incoming webhook data for debugging
        this.logger.info('Twilio webhook /schedule-response called', {
            method: req.method,
            contentType: req.headers['content-type'],
            userAgent: req.headers['user-agent'],
            twilioSignature: req.headers['x-twilio-signature'],
            bodySize: req.body ? Buffer.byteLength(req.body) : 0,
            rawBodyPreview: req.body ? req.body.toString().substring(0, 200) : 'no body'
        });

        const twiml = new this.twilio.twiml.MessagingResponse();
        
        // Parse Twilio form data
        const parsedBody = new URLSearchParams(req.body.toString());
        const fromNumber = parsedBody.get('From');
        const messageBody = parsedBody.get('Body');
        const messageSid = parsedBody.get('MessageSid');
        const toNumber = parsedBody.get('To');
        const accountSid = parsedBody.get('AccountSid');
        
        // Enhanced logging
        this.logger.info('Schedule response webhook parsed data', {
            fromNumber: fromNumber ? fromNumber.slice(-4) : 'missing',
            toNumber: toNumber ? toNumber.slice(-4) : 'missing',
            messageSid: messageSid || 'missing',
            accountSid: accountSid ? accountSid.substring(0, 10) + '...' : 'missing',
            messageBody: messageBody || 'empty',
            messageLength: messageBody ? messageBody.length : 0
        });
        
        // Validate required fields
        if (!fromNumber || !messageSid || !messageBody) {
            this.logger.error('Invalid schedule response webhook - missing required fields', {
                hasFrom: !!fromNumber,
                hasMessageSid: !!messageSid,
                hasMessageBody: !!messageBody,
                contentType: req.headers['content-type'],
                bodyPreview: req.body ? req.body.toString().substring(0, 100) : 'empty'
            });
            
            return twiml.toString();
        }
        
        try {
            // Audit log webhook call
            await this.logger.auditUserAction(
                null,
                'webhook_schedule_response',
                'webhook',
                messageSid,
                {
                    fromNumber: fromNumber.slice(-4),
                    response: messageBody,
                    twilioData: {
                        messageSid,
                        accountSid: accountSid ? accountSid.substring(0, 10) + '...' : null,
                        toNumber: toNumber ? toNumber.slice(-4) : null
                    }
                },
                req
            );

            this.logger.info('Processing schedule response from user', {
                fromNumber: fromNumber.slice(-4),
                response: messageBody,
                messageSid
            });
            
            // Handle the scheduling response
            const result = await this.smsService.handleSchedulingResponse(fromNumber, messageBody);
            
            if (result.success) {
                this.logger.info('Schedule response processed successfully', {
                    fromNumber: fromNumber.slice(-4),
                    sessionId: result.sessionId,
                    scheduledTime: result.scheduledTime,
                    responseType: result.responseType,
                    userChoice: messageBody
                });
                
                // Track workflow step
                await this.authSystem.db.trackWorkflowStep(result.sessionId, 'schedule_set', 'completed', {
                    scheduledTime: result.scheduledTime,
                    responseType: result.responseType,
                    userResponse: messageBody,
                    twilioData: {
                        fromNumber: fromNumber,
                        toNumber: toNumber,
                        messageSid: messageSid,
                        accountSid: accountSid
                    }
                });
                
                // Get session details for N8N workflow
                const session = await this.authSystem.db.getBriefingSession(result.sessionId);
                
                // Trigger N8N workflow for content generation
                if (app.locals.services.n8nCoordinator && session) {
                    try {
                        this.logger.info('Triggering N8N workflow for content generation', {
                            sessionId: result.sessionId,
                            fromNumber: fromNumber.slice(-4),
                            scheduledTime: result.scheduledTime
                        });
                        
                        await app.locals.services.n8nCoordinator.triggerSMSBriefingWorkflow({
                            sessionId: result.sessionId,
                            phoneNumber: fromNumber,
                            scheduledTime: result.scheduledTime,
                            responseType: result.responseType,
                            imageUrl: session.image_url,
                            userId: session.user_id
                        });
                        
                        this.logger.info('N8N workflow triggered successfully', {
                            sessionId: result.sessionId,
                            fromNumber: fromNumber.slice(-4)
                        });
                        
                    } catch (n8nError) {
                        this.logger.error('N8N workflow trigger failed', n8nError, {
                            sessionId: result.sessionId,
                            fromNumber: fromNumber.slice(-4),
                            errorMessage: n8nError.message,
                            errorStack: n8nError.stack
                        });
                    }
                } else {
                    this.logger.warn('N8N coordinator or session not available', {
                        hasN8NCoordinator: !!app.locals.services.n8nCoordinator,
                        hasSession: !!session,
                        sessionId: result.sessionId
                    });
                }
                
            } else {
                this.logger.warn('Schedule response processing returned unsuccessful result', {
                    fromNumber: fromNumber.slice(-4),
                    messageBody,
                    result
                });
            }
            
        } catch (error) {
            this.logger.error('Schedule response processing failed', error, {
                fromNumber: fromNumber ? fromNumber.slice(-4) : 'unknown',
                messageSid: messageSid || 'unknown',
                response: messageBody ? messageBody.substring(0, 50) : 'empty',
                errorMessage: error.message,
                errorStack: error.stack,
                twilioData: {
                    accountSid: accountSid,
                    toNumber: toNumber
                }
            });
        }
        
        return twiml.toString();
    }

    async processTestWebhook(req, res) {
        // This endpoint simulates how Twilio webhooks should work
        this.logger.info('Webhook test called', {
            method: req.method,
            contentType: req.headers['content-type'],
            userAgent: req.headers['user-agent'],
            bodySize: req.body ? Buffer.byteLength(req.body) : 0,
            ip: req.ip,
            forwardedFor: req.headers['x-forwarded-for'],
            timestamp: new Date().toISOString()
        });

        // Parse test data
        const parsedBody = new URLSearchParams(req.body.toString());
        const testData = {
            From: parsedBody.get('From') || '+15551234567',
            To: parsedBody.get('To') || process.env.TWILIO_PHONE_NUMBER,
            MessageSid: parsedBody.get('MessageSid') || 'TEST_' + Date.now(),
            Body: parsedBody.get('Body') || 'Test webhook',
            MediaUrl0: parsedBody.get('MediaUrl0'),
            NumMedia: parsedBody.get('NumMedia') || '0',
            AccountSid: parsedBody.get('AccountSid') || 'ACtest123'
        };

        this.logger.info('Webhook test data parsed', testData);

        // Test response
        const testResult = {
            success: true,
            message: 'Webhook endpoint is working correctly',
            receivedData: testData,
            parsedCorrectly: true,
            timestamp: new Date().toISOString(),
            webhookUrls: {
                imageReceived: `${req.protocol}://${req.get('host')}/api/sms/webhook/image-received`,
                scheduleResponse: `${req.protocol}://${req.get('host')}/api/sms/webhook/schedule-response`
            }
        };

        // Return JSON for testing, TwiML for actual Twilio
        const isTestCall = req.headers['user-agent']?.includes('test') || 
                          req.query.format === 'json';
        
        if (isTestCall) {
            return testResult;
        } else {
            // Return valid TwiML for Twilio
            const twiml = new this.twilio.twiml.MessagingResponse();
            return twiml.toString();
        }
    }
}

module.exports = SMSWebhookService;