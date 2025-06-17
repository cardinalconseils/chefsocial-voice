// ChefSocial N8N Workflow Coordinator
// Manages communication between ChefSocial backend and N8N automation workflows

const axios = require('axios');

class N8NCoordinator {
    constructor(logger = null, database = null) {
        this.logger = logger;
        this.db = database;
        
        // N8N Configuration
        this.n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';
        this.n8nApiKey = process.env.N8N_API_KEY;
        this.chefSocialApiUrl = process.env.CHEFSOCIAL_API_URL || 'https://api.chefsocial.io';
        this.chefSocialApiToken = process.env.CHEFSOCIAL_API_TOKEN;
        
        // Workflow endpoints
        this.webhooks = {
            smsBriefing: `${this.n8nUrl}/webhook/sms-schedule`,
            contentApproval: `${this.n8nUrl}/webhook/content-approval`,
            postingComplete: `${this.n8nUrl}/webhook/posting-complete`
        };
        
        // Active workflow tracking
        this.activeWorkflows = new Map(); // sessionId -> workflowData
        
        // Create axios instance for N8N requests
        this.n8nClient = axios.create({
            baseURL: this.n8nUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                ...(this.n8nApiKey && { 'Authorization': `Bearer ${this.n8nApiKey}` })
            }
        });
        
        if (this.logger) {
            this.logger.info('N8N Coordinator initialized', {
                n8nUrl: this.n8nUrl,
                webhooksConfigured: Object.keys(this.webhooks).length
            });
        }
    }

    // Trigger SMS briefing workflow
    async triggerSMSBriefingWorkflow(sessionData) {
        try {
            const workflowPayload = {
                sessionId: sessionData.sessionId,
                phoneNumber: sessionData.phoneNumber,
                imageUrl: sessionData.imageUrl,
                scheduledTime: sessionData.scheduledTime,
                responseType: sessionData.responseType,
                userId: sessionData.userId,
                timestamp: new Date().toISOString(),
                source: 'sms_briefing'
            };

            const response = await this.n8nClient.post('/webhook/sms-schedule', workflowPayload);

            // Track active workflow
            this.activeWorkflows.set(sessionData.sessionId, {
                workflowId: sessionData.sessionId,
                type: 'sms_briefing',
                status: 'triggered',
                payload: workflowPayload,
                n8nResponse: response.data,
                startedAt: new Date(),
                lastUpdate: new Date()
            });

            // Update database workflow tracking
            if (this.db) {
                await this.db.trackWorkflowStep(
                    sessionData.sessionId, 
                    'n8n_workflow_triggered', 
                    'completed',
                    {
                        workflowType: 'sms_briefing',
                        n8nResponse: response.data,
                        webhookUrl: this.webhooks.smsBriefing
                    }
                );
            }

            if (this.logger) {
                this.logger.info('SMS briefing workflow triggered', {
                    sessionId: sessionData.sessionId,
                    responseType: sessionData.responseType,
                    n8nStatus: response.status,
                    workflowUrl: this.webhooks.smsBriefing
                });
            }

            return {
                success: true,
                workflowId: sessionData.sessionId,
                n8nResponse: response.data,
                status: 'triggered'
            };

        } catch (error) {
            if (this.logger) {
                this.logger.error('Failed to trigger SMS briefing workflow', error, {
                    sessionId: sessionData.sessionId,
                    webhookUrl: this.webhooks.smsBriefing
                });
            }

            // Track error in database
            if (this.db) {
                await this.db.trackWorkflowStep(
                    sessionData.sessionId,
                    'n8n_workflow_error',
                    'failed',
                    { error: error.message, step: 'trigger_workflow' }
                );
            }

            throw error;
        }
    }

    // Trigger content approval workflow
    async triggerContentApprovalWorkflow(approvalData) {
        try {
            const workflowPayload = {
                sessionId: approvalData.sessionId,
                phoneNumber: approvalData.phoneNumber,
                action: approvalData.action, // 'approve', 'reject', 'edit'
                contentId: approvalData.contentId,
                platforms: approvalData.platforms,
                timestamp: new Date().toISOString(),
                source: 'content_approval'
            };

            const response = await this.n8nClient.post('/webhook/content-approval', workflowPayload);

            // Update workflow tracking
            const workflowData = this.activeWorkflows.get(approvalData.sessionId);
            if (workflowData) {
                workflowData.status = 'content_approval';
                workflowData.lastUpdate = new Date();
                workflowData.approvalData = approvalData;
            }

            if (this.logger) {
                this.logger.info('Content approval workflow triggered', {
                    sessionId: approvalData.sessionId,
                    action: approvalData.action,
                    contentId: approvalData.contentId,
                    n8nStatus: response.status
                });
            }

            return {
                success: true,
                workflowId: approvalData.sessionId,
                action: approvalData.action,
                n8nResponse: response.data
            };

        } catch (error) {
            if (this.logger) {
                this.logger.error('Failed to trigger content approval workflow', error, {
                    sessionId: approvalData.sessionId,
                    action: approvalData.action
                });
            }
            throw error;
        }
    }

    // Handle workflow completion
    async handleWorkflowCompletion(sessionId, completionData) {
        try {
            const workflowData = this.activeWorkflows.get(sessionId);
            if (!workflowData) {
                throw new Error('Workflow not found');
            }

            // Update workflow status
            workflowData.status = 'completed';
            workflowData.completedAt = new Date();
            workflowData.completionData = completionData;

            // Track completion in database
            if (this.db) {
                await this.db.trackWorkflowStep(
                    sessionId,
                    'n8n_workflow_completed',
                    'completed',
                    completionData
                );
            }

            // Clean up completed workflow
            this.activeWorkflows.delete(sessionId);

            if (this.logger) {
                this.logger.info('Workflow completed', {
                    sessionId,
                    workflowType: workflowData.type,
                    duration: workflowData.completedAt - workflowData.startedAt,
                    success: completionData.success
                });
            }

            return {
                success: true,
                sessionId,
                completionData
            };

        } catch (error) {
            if (this.logger) {
                this.logger.error('Failed to handle workflow completion', error, {
                    sessionId
                });
            }
            throw error;
        }
    }

    // Get workflow status
    getWorkflowStatus(sessionId) {
        const workflowData = this.activeWorkflows.get(sessionId);
        if (!workflowData) {
            return { status: 'not_found' };
        }

        return {
            status: workflowData.status,
            workflowId: workflowData.workflowId,
            type: workflowData.type,
            startedAt: workflowData.startedAt,
            lastUpdate: workflowData.lastUpdate,
            completedAt: workflowData.completedAt,
            duration: workflowData.completedAt ? 
                workflowData.completedAt - workflowData.startedAt :
                new Date() - workflowData.startedAt
        };
    }

    // Create API endpoints for N8N to call back
    createN8NEndpoints(app) {
        // Endpoint for N8N to send pre-call notifications
        app.post('/api/n8n/pre-call-notification', async (req, res) => {
            try {
                const { phoneNumber, sessionId } = req.body;
                
                // Use SMS service to send pre-call notification
                const smsService = app.locals.services.smsService;
                await smsService.sendPreCallNotification(phoneNumber, sessionId);
                
                res.json({ success: true, message: 'Pre-call notification sent' });
            } catch (error) {
                if (this.logger) {
                    this.logger.error('N8N pre-call notification failed', error);
                }
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Endpoint for N8N to start voice briefing
        app.post('/api/n8n/start-briefing', async (req, res) => {
            try {
                const { sessionId, phoneNumber, imageUrl } = req.body;
                
                // Get services
                const liveKitService = app.locals.services.liveKitService;
                const smsService = app.locals.services.smsService;
                
                // Create LiveKit briefing room
                const briefingRoom = await liveKitService.createBriefingRoom(
                    sessionId, 
                    phoneNumber, 
                    imageUrl
                );
                
                // Connect phone to room
                const phoneConnection = await liveKitService.connectPhoneToRoom(
                    phoneNumber, 
                    briefingRoom.roomName
                );
                
                res.json({ 
                    success: true, 
                    briefingRoom,
                    phoneConnection,
                    message: 'Briefing started'
                });
                
            } catch (error) {
                if (this.logger) {
                    this.logger.error('N8N start briefing failed', error);
                }
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Endpoint for N8N to send content ready notifications
        app.post('/api/n8n/content-ready', async (req, res) => {
            try {
                const { phoneNumber, sessionId, preview } = req.body;
                
                const smsService = app.locals.services.smsService;
                await smsService.sendContentReadyNotification(phoneNumber, sessionId, preview);
                
                res.json({ success: true, message: 'Content ready notification sent' });
            } catch (error) {
                if (this.logger) {
                    this.logger.error('N8N content ready notification failed', error);
                }
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Endpoint for N8N to send posting completion notifications
        app.post('/api/n8n/posting-complete', async (req, res) => {
            try {
                const { phoneNumber, sessionId, results } = req.body;
                
                const smsService = app.locals.services.smsService;
                
                // Format success message
                const successMessage = `🚀 Your content is now live!\n\n` +
                    `Posted to: ${results.map(r => r.platform).join(', ')}\n` +
                    `Total posts: ${results.length}\n\n` +
                    `Session: ${sessionId.slice(-6)}`;
                
                await smsService.sendResponse(phoneNumber, successMessage);
                
                res.json({ success: true, message: 'Posting complete notification sent' });
            } catch (error) {
                if (this.logger) {
                    this.logger.error('N8N posting complete notification failed', error);
                }
                res.status(500).json({ success: false, error: error.message });
            }
        });

        if (this.logger) {
            this.logger.info('N8N callback endpoints created', {
                endpoints: [
                    '/api/n8n/pre-call-notification',
                    '/api/n8n/start-briefing', 
                    '/api/n8n/content-ready',
                    '/api/n8n/posting-complete'
                ]
            });
        }
    }

    // Health check for N8N connection
    async healthCheck() {
        try {
            const response = await this.n8nClient.get('/healthz');
            return {
                status: 'healthy',
                n8nUrl: this.n8nUrl,
                responseTime: response.headers['x-response-time'],
                activeWorkflows: this.activeWorkflows.size
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                n8nUrl: this.n8nUrl,
                error: error.message,
                activeWorkflows: this.activeWorkflows.size
            };
        }
    }

    // Cleanup expired workflows
    cleanupExpiredWorkflows() {
        const now = new Date();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        for (const [sessionId, workflowData] of this.activeWorkflows.entries()) {
            if (now - workflowData.startedAt > maxAge) {
                this.activeWorkflows.delete(sessionId);
                
                if (this.logger) {
                    this.logger.info('Expired workflow cleaned up', {
                        sessionId,
                        workflowType: workflowData.type,
                        age: now - workflowData.startedAt
                    });
                }
            }
        }
    }
}

module.exports = N8NCoordinator;