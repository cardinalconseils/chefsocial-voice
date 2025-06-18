// SMS Session Service - Briefing session management
class SMSSessionService {
    constructor(services) {
        this.authSystem = services.authSystem;
        this.logger = services.logger;
        this.smsService = services.smsService;
    }

    async getBriefingSessions(userId, status = 'all', limit = 50) {
        // Get user's briefing sessions from database
        const sessions = await new Promise((resolve, reject) => {
            let query = `
                SELECT sbs.*, sr.response_text, sr.parsed_schedule, sr.response_type
                FROM sms_briefing_sessions sbs
                LEFT JOIN sms_scheduling_responses sr ON sbs.id = sr.session_id
                WHERE sbs.user_id = ? OR sbs.phone_number IN (
                    SELECT phone FROM users WHERE id = ?
                )
            `;
            
            const params = [userId, userId];
            
            if (status !== 'all') {
                query += ' AND sbs.status = ?';
                params.push(status);
            }
            
            query += ' ORDER BY sbs.created_at DESC LIMIT ?';
            params.push(parseInt(limit));
            
            this.authSystem.db.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        this.logger.info('Briefing sessions retrieved', {
            userId,
            sessionCount: sessions.length,
            status
        });
        
        return {
            sessions: sessions,
            total: sessions.length
        };
    }

    async getBriefingSession(sessionId, userId) {
        // Get session details
        const session = await this.authSystem.db.getBriefingSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        // Check if user owns this session
        const user = await this.authSystem.db.getUserById(userId);
        if (session.user_id !== userId && session.phone_number !== user.phone) {
            throw new Error('Access denied');
        }
        
        // Get workflow status
        const workflowSteps = await new Promise((resolve, reject) => {
            this.authSystem.db.db.all(`
                SELECT * FROM sms_workflow_status 
                WHERE session_id = ? 
                ORDER BY started_at ASC
            `, [sessionId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        // Get briefing context if available
        const briefingContext = await new Promise((resolve, reject) => {
            this.authSystem.db.db.get(`
                SELECT * FROM briefing_context 
                WHERE session_id = ?
            `, [sessionId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        return {
            session: session,
            workflowSteps: workflowSteps,
            briefingContext: briefingContext
        };
    }

    async rescheduleSession(sessionId, userId, scheduledTime, req) {
        // Get session
        const session = await this.authSystem.db.getBriefingSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        // Check ownership
        const user = await this.authSystem.db.getUserById(userId);
        if (session.user_id !== userId && session.phone_number !== user.phone) {
            throw new Error('Access denied');
        }
        
        // Update schedule
        await this.authSystem.db.updateBriefingSessionSchedule(sessionId, scheduledTime, 'rescheduled');
        
        // Send confirmation SMS
        await this.smsService.sendResponse(session.phone_number, 
            `✅ Your briefing has been rescheduled to ${new Date(scheduledTime).toLocaleString()}. Session: ${sessionId.slice(-6)}`);
        
        // Track workflow step
        await this.authSystem.db.trackWorkflowStep(sessionId, 'session_rescheduled', 'completed', {
            newScheduledTime: scheduledTime,
            rescheduledBy: 'user'
        });
        
        this.logger.info('Session rescheduled', {
            userId,
            sessionId,
            newScheduledTime: scheduledTime
        });
        
        return {
            message: 'Session rescheduled successfully',
            scheduledTime: scheduledTime
        };
    }

    async getWebhookLogs(userId, limit = 50, hours = 24) {
        const sinceTime = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
        
        // Get recent webhook logs from audit logs
        const webhookLogs = await new Promise((resolve, reject) => {
            this.authSystem.db.db.all(`
                SELECT * FROM audit_logs 
                WHERE action IN ('webhook_image_received', 'webhook_schedule_response', 'sms_sent', 'sms_error')
                AND created_at >= ?
                ORDER BY created_at DESC 
                LIMIT ?
            `, [sinceTime.toISOString(), parseInt(limit)], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        // Get workflow steps for SMS workflows
        const workflowSteps = await new Promise((resolve, reject) => {
            this.authSystem.db.db.all(`
                SELECT * FROM sms_workflow_status 
                WHERE started_at >= ?
                ORDER BY started_at DESC 
                LIMIT ?
            `, [sinceTime.toISOString(), parseInt(limit)], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        this.logger.info('Webhook logs accessed', {
            userId,
            logsCount: webhookLogs.length,
            workflowStepsCount: workflowSteps.length,
            timeframe: `${hours} hours`
        });
        
        return {
            webhookLogs: webhookLogs,
            workflowSteps: workflowSteps,
            timeframe: `Last ${hours} hours`,
            total: webhookLogs.length + workflowSteps.length
        };
    }
}

module.exports = SMSSessionService;