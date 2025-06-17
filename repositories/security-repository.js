// ChefSocial Security Repository
// Handles all security-related database operations
class SecurityRepository {
    constructor(dbConnection) {
        this.db = dbConnection;
    }

    // Token Blacklisting Operations
    async blacklistToken(tokenId, userId, tokenType, expiresAt, reason = null) {
        const result = await this.db.run(`
            INSERT INTO token_blacklist (token_id, user_id, token_type, expires_at, reason)
            VALUES (?, ?, ?, ?, ?)
        `, [tokenId, userId, tokenType, expiresAt, reason]);

        return { id: result.lastID };
    }

    async isTokenBlacklisted(tokenId) {
        const result = await this.db.get(`
            SELECT id, reason, blacklisted_at FROM token_blacklist 
            WHERE token_id = ? AND expires_at > datetime('now')
        `, [tokenId]);

        return result ? { blacklisted: true, ...result } : { blacklisted: false };
    }

    async getBlacklistedTokens(limit = 100, offset = 0) {
        return await this.db.all(`
            SELECT tb.*, u.email, u.name
            FROM token_blacklist tb
            LEFT JOIN users u ON tb.user_id = u.id
            WHERE tb.expires_at > datetime('now')
            ORDER BY tb.blacklisted_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);
    }

    async removeTokenFromBlacklist(tokenId) {
        const result = await this.db.run(`
            DELETE FROM token_blacklist WHERE token_id = ?
        `, [tokenId]);

        return { changes: result.changes };
    }

    async cleanupExpiredTokens() {
        const result = await this.db.run(`
            DELETE FROM token_blacklist WHERE expires_at <= datetime('now')
        `);

        return { changes: result.changes };
    }

    async blacklistAllUserTokens(userId, reason = 'Security measure') {
        // Get all active user sessions first
        const sessions = await this.db.all(`
            SELECT refresh_token_id FROM user_sessions 
            WHERE user_id = ? AND is_active = TRUE AND expires_at > datetime('now')
        `, [userId]);

        const results = [];
        for (const session of sessions) {
            const result = await this.blacklistToken(
                session.refresh_token_id, 
                userId, 
                'refresh_token', 
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                reason
            );
            results.push(result);
        }

        return { blacklisted_tokens: results.length, results };
    }

    // Failed Login Attempts Management
    async logFailedLogin(email, ipAddress, userAgent, reason, attemptData = {}) {
        const result = await this.db.run(`
            INSERT INTO failed_login_attempts (email, ip_address, user_agent, failure_reason)
            VALUES (?, ?, ?, ?)
        `, [email, ipAddress, userAgent, reason]);

        return { id: result.lastID };
    }

    async getFailedLoginAttempts(email, timeWindowMinutes = 15) {
        return await this.db.all(`
            SELECT * FROM failed_login_attempts 
            WHERE email = ? AND attempt_time > datetime('now', '-${timeWindowMinutes} minutes')
            ORDER BY attempt_time DESC
        `, [email]);
    }

    async getFailedLoginAttemptsByIP(ipAddress, timeWindowMinutes = 15) {
        return await this.db.all(`
            SELECT * FROM failed_login_attempts 
            WHERE ip_address = ? AND attempt_time > datetime('now', '-${timeWindowMinutes} minutes')
            ORDER BY attempt_time DESC
        `, [ipAddress]);
    }

    async getFailedLoginCount(email, timeWindowMinutes = 15) {
        const result = await this.db.get(`
            SELECT COUNT(*) as count FROM failed_login_attempts 
            WHERE email = ? AND attempt_time > datetime('now', '-${timeWindowMinutes} minutes')
        `, [email]);
        
        return result.count;
    }

    async getFailedLoginCountByIP(ipAddress, timeWindowMinutes = 15) {
        const result = await this.db.get(`
            SELECT COUNT(*) as count FROM failed_login_attempts 
            WHERE ip_address = ? AND attempt_time > datetime('now', '-${timeWindowMinutes} minutes')
        `, [ipAddress]);
        
        return result.count;
    }

    async blockIP(ipAddress, blockDurationMinutes = 60, reason = 'Too many failed attempts') {
        const blockedUntil = new Date(Date.now() + blockDurationMinutes * 60 * 1000);
        
        const result = await this.db.run(`
            UPDATE failed_login_attempts 
            SET blocked_until = ? 
            WHERE ip_address = ? AND blocked_until IS NULL
        `, [blockedUntil.toISOString(), ipAddress]);

        // Also log this as a failed attempt with the block reason
        await this.logFailedLogin('SYSTEM', ipAddress, 'SYSTEM_BLOCK', reason);

        return { changes: result.changes, blocked_until: blockedUntil.toISOString() };
    }

    async isIPBlocked(ipAddress) {
        const result = await this.db.get(`
            SELECT blocked_until FROM failed_login_attempts 
            WHERE ip_address = ? AND blocked_until > datetime('now')
            ORDER BY blocked_until DESC LIMIT 1
        `, [ipAddress]);

        return result ? { blocked: true, until: result.blocked_until } : { blocked: false };
    }

    async unblockIP(ipAddress) {
        const result = await this.db.run(`
            UPDATE failed_login_attempts 
            SET blocked_until = NULL 
            WHERE ip_address = ?
        `, [ipAddress]);

        return { changes: result.changes };
    }

    async getBlockedIPs() {
        return await this.db.all(`
            SELECT 
                ip_address,
                blocked_until,
                COUNT(*) as attempt_count,
                MAX(attempt_time) as last_attempt
            FROM failed_login_attempts 
            WHERE blocked_until > datetime('now')
            GROUP BY ip_address, blocked_until
            ORDER BY blocked_until DESC
        `);
    }

    async clearFailedLoginAttempts(email = null, ipAddress = null) {
        if (email && ipAddress) {
            const result = await this.db.run(`
                DELETE FROM failed_login_attempts 
                WHERE email = ? AND ip_address = ?
            `, [email, ipAddress]);
            return { changes: result.changes };
        } else if (email) {
            const result = await this.db.run(`
                DELETE FROM failed_login_attempts WHERE email = ?
            `, [email]);
            return { changes: result.changes };
        } else if (ipAddress) {
            const result = await this.db.run(`
                DELETE FROM failed_login_attempts WHERE ip_address = ?
            `, [ipAddress]);
            return { changes: result.changes };
        } else {
            throw new Error('Either email or ipAddress must be provided');
        }
    }

    // Security Restrictions Management
    async addSecurityRestriction(userId, restrictionType, restrictionValue, expiresAt = null, notes = null) {
        const result = await this.db.run(`
            INSERT INTO security_restrictions (user_id, restriction_type, restriction_value, expires_at, notes)
            VALUES (?, ?, ?, ?, ?)
        `, [userId, restrictionType, restrictionValue, expiresAt, notes]);

        return { id: result.lastID };
    }

    async getUserSecurityRestrictions(userId) {
        return await this.db.all(`
            SELECT * FROM security_restrictions 
            WHERE user_id = ? AND is_active = TRUE 
            AND (expires_at IS NULL OR expires_at > datetime('now'))
            ORDER BY created_at DESC
        `, [userId]);
    }

    async checkSecurityRestriction(userId, restrictionType, restrictionValue = null) {
        let sql = `
            SELECT * FROM security_restrictions 
            WHERE user_id = ? AND restriction_type = ?
            AND is_active = TRUE 
            AND (expires_at IS NULL OR expires_at > datetime('now'))
        `;
        const params = [userId, restrictionType];

        if (restrictionValue !== null) {
            sql += ' AND restriction_value = ?';
            params.push(restrictionValue);
        }

        const result = await this.db.get(sql, params);
        return !!result;
    }

    async removeSecurityRestriction(restrictionId) {
        const result = await this.db.run(`
            UPDATE security_restrictions 
            SET is_active = FALSE 
            WHERE id = ?
        `, [restrictionId]);

        return { changes: result.changes };
    }

    async removeUserSecurityRestrictions(userId, restrictionType = null) {
        let sql = 'UPDATE security_restrictions SET is_active = FALSE WHERE user_id = ?';
        const params = [userId];

        if (restrictionType) {
            sql += ' AND restriction_type = ?';
            params.push(restrictionType);
        }

        const result = await this.db.run(sql, params);
        return { changes: result.changes };
    }

    async extendSecurityRestriction(restrictionId, newExpiresAt) {
        const result = await this.db.run(`
            UPDATE security_restrictions 
            SET expires_at = ? 
            WHERE id = ?
        `, [newExpiresAt, restrictionId]);

        return { changes: result.changes };
    }

    async getAllSecurityRestrictions(limit = 100, offset = 0, filters = {}) {
        let whereClause = 'WHERE sr.is_active = TRUE';
        const params = [];

        if (filters.restrictionType) {
            whereClause += ' AND sr.restriction_type = ?';
            params.push(filters.restrictionType);
        }
        if (filters.userId) {
            whereClause += ' AND sr.user_id = ?';
            params.push(filters.userId);
        }
        if (filters.active !== undefined) {
            if (filters.active) {
                whereClause += ' AND (sr.expires_at IS NULL OR sr.expires_at > datetime(\'now\'))';
            } else {
                whereClause += ' AND sr.expires_at <= datetime(\'now\')';
            }
        }

        params.push(limit, offset);

        return await this.db.all(`
            SELECT 
                sr.*,
                u.email,
                u.name,
                u.restaurant_name
            FROM security_restrictions sr
            JOIN users u ON sr.user_id = u.id
            ${whereClause}
            ORDER BY sr.created_at DESC
            LIMIT ? OFFSET ?
        `, params);
    }

    async cleanupExpiredRestrictions() {
        const result = await this.db.run(`
            UPDATE security_restrictions 
            SET is_active = FALSE 
            WHERE expires_at <= datetime('now') AND is_active = TRUE
        `);

        return { changes: result.changes };
    }

    // Security Analytics and Monitoring
    async getSecurityStats(days = 30) {
        const stats = await this.db.get(`
            SELECT 
                COUNT(*) as total_failed_logins,
                COUNT(DISTINCT email) as unique_emails_failed,
                COUNT(DISTINCT ip_address) as unique_ips_failed,
                COUNT(CASE WHEN blocked_until IS NOT NULL THEN 1 END) as blocked_attempts,
                COUNT(CASE WHEN attempt_time >= datetime('now', '-1 day') THEN 1 END) as failed_24h,
                COUNT(CASE WHEN attempt_time >= datetime('now', '-7 days') THEN 1 END) as failed_7d
            FROM failed_login_attempts 
            WHERE attempt_time >= datetime('now', '-${days} days')
        `);

        const restrictionStats = await this.db.get(`
            SELECT 
                COUNT(*) as total_restrictions,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_restrictions,
                COUNT(DISTINCT user_id) as users_with_restrictions,
                COUNT(DISTINCT restriction_type) as restriction_types
            FROM security_restrictions
            WHERE created_at >= datetime('now', '-${days} days')
        `);

        const tokenStats = await this.db.get(`
            SELECT 
                COUNT(*) as blacklisted_tokens,
                COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as active_blacklisted_tokens,
                COUNT(DISTINCT user_id) as users_with_blacklisted_tokens
            FROM token_blacklist
            WHERE blacklisted_at >= datetime('now', '-${days} days')
        `);

        return {
            ...stats,
            ...restrictionStats,
            ...tokenStats
        };
    }

    async getSecurityTrends(days = 30) {
        return await this.db.all(`
            SELECT 
                date(attempt_time) as date,
                COUNT(*) as failed_logins,
                COUNT(DISTINCT email) as unique_emails,
                COUNT(DISTINCT ip_address) as unique_ips,
                COUNT(CASE WHEN blocked_until IS NOT NULL THEN 1 END) as blocked_attempts
            FROM failed_login_attempts 
            WHERE attempt_time >= datetime('now', '-${days} days')
            GROUP BY date(attempt_time)
            ORDER BY date DESC
        `);
    }

    async getTopFailedLoginEmails(days = 30, limit = 20) {
        return await this.db.all(`
            SELECT 
                email,
                COUNT(*) as attempt_count,
                COUNT(DISTINCT ip_address) as unique_ips,
                MAX(attempt_time) as last_attempt,
                COUNT(CASE WHEN blocked_until IS NOT NULL THEN 1 END) as blocked_count
            FROM failed_login_attempts 
            WHERE attempt_time >= datetime('now', '-${days} days')
            GROUP BY email
            ORDER BY attempt_count DESC
            LIMIT ?
        `, [limit]);
    }

    async getTopFailedLoginIPs(days = 30, limit = 20) {
        return await this.db.all(`
            SELECT 
                ip_address,
                COUNT(*) as attempt_count,
                COUNT(DISTINCT email) as unique_emails,
                MAX(attempt_time) as last_attempt,
                MAX(blocked_until) as blocked_until
            FROM failed_login_attempts 
            WHERE attempt_time >= datetime('now', '-${days} days')
            GROUP BY ip_address
            ORDER BY attempt_count DESC
            LIMIT ?
        `, [limit]);
    }

    async getSuspiciousActivity(limit = 50) {
        // Multiple failed logins from same IP with different emails
        const suspiciousIPs = await this.db.all(`
            SELECT 
                ip_address,
                COUNT(DISTINCT email) as unique_emails,
                COUNT(*) as attempt_count,
                MAX(attempt_time) as last_attempt
            FROM failed_login_attempts 
            WHERE attempt_time >= datetime('now', '-24 hours')
            GROUP BY ip_address
            HAVING unique_emails >= 3 AND attempt_count >= 5
            ORDER BY attempt_count DESC
            LIMIT ?
        `, [limit]);

        // Multiple failed logins for same email from different IPs
        const suspiciousEmails = await this.db.all(`
            SELECT 
                email,
                COUNT(DISTINCT ip_address) as unique_ips,
                COUNT(*) as attempt_count,
                MAX(attempt_time) as last_attempt
            FROM failed_login_attempts 
            WHERE attempt_time >= datetime('now', '-24 hours')
            GROUP BY email
            HAVING unique_ips >= 3 AND attempt_count >= 5
            ORDER BY attempt_count DESC
            LIMIT ?
        `, [limit]);

        return {
            suspicious_ips: suspiciousIPs,
            suspicious_emails: suspiciousEmails
        };
    }

    // Voice Session Security
    async createVoiceSession(sessionData) {
        const {
            sessionId, userId, roomName, sessionType, metadata,
            recordingUrls, performanceData
        } = sessionData;

        const result = await this.db.run(`
            INSERT INTO voice_sessions 
            (session_id, user_id, room_name, session_type, metadata, recording_urls, performance_data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [sessionId, userId, roomName, sessionType, metadata, recordingUrls, performanceData]);

        return { id: result.lastID };
    }

    async endVoiceSession(sessionId, endData = {}) {
        const fields = ['status = ?', 'ended_at = datetime(\'now\')'];
        const values = ['ended'];

        if (endData.duration !== undefined) {
            fields.push('duration = ?');
            values.push(endData.duration);
        }
        if (endData.recordingUrls !== undefined) {
            fields.push('recording_urls = ?');
            values.push(endData.recordingUrls);
        }
        if (endData.performanceData !== undefined) {
            fields.push('performance_data = ?');
            values.push(endData.performanceData);
        }

        values.push(sessionId);

        const result = await this.db.run(`
            UPDATE voice_sessions 
            SET ${fields.join(', ')}
            WHERE session_id = ?
        `, values);

        return { changes: result.changes };
    }

    async getVoiceSession(sessionId) {
        return await this.db.get(`
            SELECT vs.*, u.email, u.name, u.restaurant_name
            FROM voice_sessions vs
            JOIN users u ON vs.user_id = u.id
            WHERE vs.session_id = ?
        `, [sessionId]);
    }

    async getUserVoiceSessions(userId, limit = 50, offset = 0) {
        return await this.db.all(`
            SELECT * FROM voice_sessions 
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);
    }

    async getActiveVoiceSessions() {
        return await this.db.all(`
            SELECT vs.*, u.email, u.name
            FROM voice_sessions vs
            JOIN users u ON vs.user_id = u.id
            WHERE vs.status = 'created' OR vs.status = 'active'
            ORDER BY vs.created_at DESC
        `);
    }

    // Security Maintenance and Cleanup
    async cleanupOldFailedAttempts(daysToKeep = 90) {
        const result = await this.db.run(`
            DELETE FROM failed_login_attempts 
            WHERE attempt_time <= date('now', '-${daysToKeep} days')
        `);

        return { changes: result.changes };
    }

    async cleanupOldVoiceSessions(daysToKeep = 30) {
        const result = await this.db.run(`
            DELETE FROM voice_sessions 
            WHERE ended_at <= date('now', '-${daysToKeep} days')
            OR (status = 'created' AND created_at <= date('now', '-1 day'))
        `);

        return { changes: result.changes };
    }

    // Security Reporting
    async generateSecurityReport(startDate, endDate) {
        const report = {
            period: { start: startDate, end: endDate },
            generated_at: new Date().toISOString()
        };

        // Failed login statistics
        report.failed_logins = await this.db.get(`
            SELECT 
                COUNT(*) as total_attempts,
                COUNT(DISTINCT email) as unique_emails,
                COUNT(DISTINCT ip_address) as unique_ips,
                COUNT(CASE WHEN blocked_until IS NOT NULL THEN 1 END) as blocked_attempts
            FROM failed_login_attempts 
            WHERE attempt_time BETWEEN ? AND ?
        `, [startDate, endDate]);

        // Top threat sources
        report.top_threat_ips = await this.db.all(`
            SELECT 
                ip_address,
                COUNT(*) as attempts,
                COUNT(DISTINCT email) as emails_targeted
            FROM failed_login_attempts 
            WHERE attempt_time BETWEEN ? AND ?
            GROUP BY ip_address
            ORDER BY attempts DESC
            LIMIT 10
        `, [startDate, endDate]);

        // Security restrictions applied
        report.security_actions = await this.db.get(`
            SELECT 
                COUNT(*) as total_restrictions,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_restrictions,
                COUNT(DISTINCT user_id) as affected_users
            FROM security_restrictions 
            WHERE created_at BETWEEN ? AND ?
        `, [startDate, endDate]);

        // Token security
        report.token_security = await this.db.get(`
            SELECT 
                COUNT(*) as tokens_blacklisted,
                COUNT(DISTINCT user_id) as users_affected
            FROM token_blacklist 
            WHERE blacklisted_at BETWEEN ? AND ?
        `, [startDate, endDate]);

        return report;
    }

    async exportSecurityData(filters = {}, format = 'json') {
        const data = {
            export_date: new Date().toISOString(),
            filters: filters
        };

        // Export failed login attempts
        data.failed_logins = await this.getFailedLoginAttempts(filters.email, filters.timeWindow || 60);
        
        // Export security restrictions
        data.security_restrictions = await this.getAllSecurityRestrictions(1000, 0, filters);
        
        // Export blacklisted tokens
        data.blacklisted_tokens = await this.getBlacklistedTokens(1000, 0);

        if (format === 'csv') {
            // Simplified CSV export for failed logins
            const csvHeaders = 'timestamp,email,ip_address,user_agent,reason,blocked_until';
            const csvRows = data.failed_logins.map(attempt => 
                `"${attempt.attempt_time}","${attempt.email}","${attempt.ip_address}","${attempt.user_agent || ''}","${attempt.failure_reason}","${attempt.blocked_until || ''}"`
            );
            return [csvHeaders, ...csvRows].join('\n');
        }

        return data;
    }
}

module.exports = SecurityRepository;