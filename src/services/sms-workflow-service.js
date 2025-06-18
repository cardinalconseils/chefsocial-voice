// SMS Workflow Service - Core SMS workflow functionality
class SMSWorkflowService {
    constructor(services) {
        this.authSystem = services.authSystem;
        this.logger = services.logger;
        this.smsService = services.smsService;
    }

    async sendContentForApproval(userId, contentId, req) {
        // Get the content
        const content = await this.authSystem.db.db.get(`
            SELECT * FROM generated_content 
            WHERE id = ? AND user_id = ?
        `, [contentId, userId]);
        
        if (!content) {
            throw new Error('Content not found');
        }

        // Check if user has phone number
        const user = await this.authSystem.db.getUserById(userId);
        if (!user.phone) {
            throw new Error('Phone number required for SMS approval');
        }
        
        // Send SMS for approval
        const result = await this.smsService.sendContentForApproval(userId, contentId, content);
        
        // Audit log SMS approval request
        await this.logger.auditUserAction(
            userId,
            'sms_approval_sent',
            'content',
            contentId,
            {
                platform: content.platform,
                contentType: content.content_type,
                workflowId: result.workflowId,
                phoneNumber: user.phone.slice(-4)
            },
            req
        );

        this.logger.info('SMS approval sent', {
            userId,
            contentId,
            workflowId: result.workflowId,
            platform: content.platform
        });
        
        return {
            message: 'SMS sent for approval',
            workflowId: result.workflowId,
            content: {
                id: contentId,
                platform: content.platform,
                preview: content.caption.substring(0, 100) + '...'
            }
        };
    }

    async sendDailySuggestions(userId, req) {
        // Check if user has phone number
        const user = await this.authSystem.db.getUserById(userId);
        if (!user.phone) {
            throw new Error('Phone number required for SMS suggestions');
        }

        const result = await this.smsService.sendDailyContentSuggestions(userId);
        
        // Audit log daily suggestions request
        await this.logger.auditUserAction(
            userId,
            'sms_daily_suggestions_sent',
            'sms',
            null,
            {
                suggestionsCount: result.suggestions?.length || 0,
                phoneNumber: user.phone.slice(-4)
            },
            req
        );

        this.logger.info('Daily SMS suggestions sent', {
            userId,
            suggestionsCount: result.suggestions?.length || 0
        });
        
        return {
            message: 'Daily suggestions sent via SMS',
            suggestions: result.suggestions,
            sentAt: new Date().toISOString()
        };
    }

    async getUserWorkflows(userId, status = 'all', limit = 50) {
        const userWorkflows = [];
        
        if (this.smsService && this.smsService.workflows) {
            for (const [id, workflow] of this.smsService.workflows.entries()) {
                if (workflow.userId === userId) {
                    if (status === 'all' || workflow.status === status) {
                        userWorkflows.push({
                            id: id,
                            type: workflow.type,
                            status: workflow.status,
                            createdAt: workflow.createdAt,
                            expiresAt: workflow.expiresAt,
                            contentId: workflow.contentId,
                            platform: workflow.platform
                        });
                    }
                }
            }
        }
        
        // Sort by creation date (newest first) and limit results
        const sortedWorkflows = userWorkflows
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, parseInt(limit));

        this.logger.info('SMS workflows retrieved', {
            userId,
            workflowCount: sortedWorkflows.length,
            status
        });
        
        return {
            workflows: sortedWorkflows,
            total: sortedWorkflows.length,
            status: status
        };
    }

    async getWorkflow(workflowId, userId) {
        if (!this.smsService || !this.smsService.workflows) {
            throw new Error('SMS service not available');
        }
        
        const workflow = this.smsService.workflows.get(workflowId);
        
        if (!workflow) {
            throw new Error('Workflow not found');
        }
        
        // Check if workflow belongs to user
        if (workflow.userId !== userId) {
            throw new Error('Access denied');
        }

        this.logger.info('SMS workflow accessed', {
            userId,
            workflowId,
            status: workflow.status
        });
        
        return {
            id: workflowId,
            type: workflow.type,
            status: workflow.status,
            createdAt: workflow.createdAt,
            expiresAt: workflow.expiresAt,
            contentId: workflow.contentId,
            platform: workflow.platform,
            responses: workflow.responses || [],
            lastActivity: workflow.lastActivity
        };
    }

    async getUserStats(userId, timeframe = '30') {
        const days = parseInt(timeframe);
        
        // Get SMS usage stats for the user
        let sentCount = 0;
        let receivedCount = 0;
        let activeWorkflows = 0;
        
        if (this.smsService && this.smsService.workflows) {
            // Count workflows in the timeframe
            const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            
            for (const workflow of this.smsService.workflows.values()) {
                if (workflow.userId === userId && new Date(workflow.createdAt) > cutoffDate) {
                    activeWorkflows++;
                    if (workflow.status === 'active') sentCount++;
                    if (workflow.responses && workflow.responses.length > 0) receivedCount++;
                }
            }
        }

        const stats = {
            timeframe: days,
            sms: {
                sent: sentCount,
                received: receivedCount,
                activeWorkflows: activeWorkflows
            },
            features: {
                contentApproval: sentCount > 0,
                dailySuggestions: false,
                workflowAutomation: activeWorkflows > 0
            },
            generatedAt: new Date().toISOString()
        };

        this.logger.info('SMS stats accessed', {
            userId,
            timeframe: days,
            stats
        });
        
        return { stats };
    }

    async sendTestSMS(userId, req) {
        const user = await this.authSystem.db.getUserById(userId);
        
        if (!user.phone) {
            throw new Error('Phone number required for SMS testing');
        }
        
        try {
            // Send test SMS
            const testMessage = `Hello from ChefSocial! This is a test message to confirm your SMS setup is working. Reply STOP to opt out.`;
            
            const result = await this.smsService.sendSMS(user.phone, testMessage);
            
            // Audit log test SMS
            await this.logger.auditUserAction(
                userId,
                'sms_test_sent',
                'sms',
                null,
                {
                    phoneNumber: user.phone.slice(-4),
                    messageSid: result.sid
                },
                req
            );

            this.logger.info('Test SMS sent', {
                userId,
                phoneNumber: user.phone.slice(-4),
                messageSid: result.sid
            });
            
            return {
                message: 'Test SMS sent successfully',
                sentTo: user.phone.slice(-4),
                messageSid: result.sid
            };
            
        } catch (error) {
            this.logger.error('Test SMS failed', error, {
                userId,
                phoneNumber: user.phone.slice(-4)
            });
            
            throw new Error(`Failed to send test SMS: ${error.message}`);
        }
    }
}

module.exports = SMSWorkflowService;