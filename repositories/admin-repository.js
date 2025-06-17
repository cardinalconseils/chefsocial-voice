// ChefSocial Admin Repository
// Handles all administrative operations and audit logging
class AdminRepository {
    constructor(dbConnection) {
        this.db = dbConnection;
    }

    // Admin User CRUD Operations
    async createAdminUser(adminData) {
        const { id, email, passwordHash, name, role, permissions } = adminData;
        
        const result = await this.db.run(`
            INSERT INTO admin_users (id, email, password_hash, name, role, permissions)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, email, passwordHash, name, role, JSON.stringify(permissions || [])]);

        return { id, email, name, role, changes: result.changes };
    }

    async getAdminByEmail(email) {
        const admin = await this.db.get(`
            SELECT * FROM admin_users WHERE email = ?
        `, [email]);

        if (admin && admin.permissions) {
            try {
                admin.permissions = JSON.parse(admin.permissions);
            } catch (error) {
                admin.permissions = [];
            }
        }

        return admin;
    }

    async getAdminById(adminId) {
        const admin = await this.db.get(`
            SELECT * FROM admin_users WHERE id = ?
        `, [adminId]);

        if (admin && admin.permissions) {
            try {
                admin.permissions = JSON.parse(admin.permissions);
            } catch (error) {
                admin.permissions = [];
            }
        }

        return admin;
    }

    async updateAdminUser(adminId, updateData) {
        const fields = [];
        const values = [];

        if (updateData.name !== undefined) {
            fields.push('name = ?');
            values.push(updateData.name);
        }
        if (updateData.email !== undefined) {
            fields.push('email = ?');
            values.push(updateData.email);
        }
        if (updateData.role !== undefined) {
            fields.push('role = ?');
            values.push(updateData.role);
        }
        if (updateData.permissions !== undefined) {
            fields.push('permissions = ?');
            values.push(JSON.stringify(updateData.permissions));
        }
        if (updateData.passwordHash !== undefined) {
            fields.push('password_hash = ?');
            values.push(updateData.passwordHash);
        }

        if (fields.length === 0) {
            throw new Error('No fields provided for update');
        }

        values.push(adminId);

        const result = await this.db.run(`
            UPDATE admin_users 
            SET ${fields.join(', ')}
            WHERE id = ?
        `, values);

        return { changes: result.changes };
    }

    async updateAdminLastLogin(adminId) {
        const result = await this.db.run(`
            UPDATE admin_users SET last_login = datetime('now') WHERE id = ?
        `, [adminId]);

        return { changes: result.changes };
    }

    async deleteAdminUser(adminId) {
        const result = await this.db.run(`
            DELETE FROM admin_users WHERE id = ?
        `, [adminId]);

        return { changes: result.changes };
    }

    // Admin User Query Operations
    async getAllAdmins(limit = 50, offset = 0) {
        const admins = await this.db.all(`
            SELECT id, email, name, role, last_login, created_at, permissions
            FROM admin_users 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        // Parse permissions for each admin
        return admins.map(admin => {
            if (admin.permissions) {
                try {
                    admin.permissions = JSON.parse(admin.permissions);
                } catch (error) {
                    admin.permissions = [];
                }
            }
            return admin;
        });
    }

    async getAdminsByRole(role, limit = 50) {
        const admins = await this.db.all(`
            SELECT id, email, name, role, last_login, created_at, permissions
            FROM admin_users 
            WHERE role = ?
            ORDER BY created_at DESC 
            LIMIT ?
        `, [role, limit]);

        return admins.map(admin => {
            if (admin.permissions) {
                try {
                    admin.permissions = JSON.parse(admin.permissions);
                } catch (error) {
                    admin.permissions = [];
                }
            }
            return admin;
        });
    }

    async searchAdmins(searchTerm, limit = 20) {
        const admins = await this.db.all(`
            SELECT id, email, name, role, last_login, created_at, permissions
            FROM admin_users 
            WHERE email LIKE ? OR name LIKE ?
            ORDER BY created_at DESC 
            LIMIT ?
        `, [`%${searchTerm}%`, `%${searchTerm}%`, limit]);

        return admins.map(admin => {
            if (admin.permissions) {
                try {
                    admin.permissions = JSON.parse(admin.permissions);
                } catch (error) {
                    admin.permissions = [];
                }
            }
            return admin;
        });
    }

    async getAdminsCount() {
        const result = await this.db.get(`
            SELECT COUNT(*) as count FROM admin_users
        `);
        
        return result.count;
    }

    // Permission Management
    async grantPermission(adminId, permission) {
        const admin = await this.getAdminById(adminId);
        if (!admin) {
            throw new Error('Admin user not found');
        }

        const permissions = admin.permissions || [];
        if (!permissions.includes(permission)) {
            permissions.push(permission);
            
            const result = await this.db.run(`
                UPDATE admin_users SET permissions = ? WHERE id = ?
            `, [JSON.stringify(permissions), adminId]);

            return { changes: result.changes, permissions };
        }

        return { changes: 0, permissions };
    }

    async revokePermission(adminId, permission) {
        const admin = await this.getAdminById(adminId);
        if (!admin) {
            throw new Error('Admin user not found');
        }

        const permissions = admin.permissions || [];
        const index = permissions.indexOf(permission);
        
        if (index > -1) {
            permissions.splice(index, 1);
            
            const result = await this.db.run(`
                UPDATE admin_users SET permissions = ? WHERE id = ?
            `, [JSON.stringify(permissions), adminId]);

            return { changes: result.changes, permissions };
        }

        return { changes: 0, permissions };
    }

    async hasPermission(adminId, permission) {
        const admin = await this.getAdminById(adminId);
        if (!admin) {
            return false;
        }

        const permissions = admin.permissions || [];
        return permissions.includes(permission) || admin.role === 'super_admin';
    }

    async setPermissions(adminId, permissions) {
        const result = await this.db.run(`
            UPDATE admin_users SET permissions = ? WHERE id = ?
        `, [JSON.stringify(permissions), adminId]);

        return { changes: result.changes, permissions };
    }

    // Audit Log Operations
    async logAuditEvent(eventData) {
        const { userId, adminId, action, entityType, entityId, details, ipAddress, userAgent } = eventData;
        
        const result = await this.db.run(`
            INSERT INTO audit_logs (user_id, admin_id, action, entity_type, entity_id, details, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, adminId, action, entityType, entityId, JSON.stringify(details), ipAddress, userAgent]);

        return { id: result.lastID };
    }

    async getAuditLogs(limit = 100, offset = 0, filters = {}) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (filters.adminId) {
            whereClause += ' AND al.admin_id = ?';
            params.push(filters.adminId);
        }
        if (filters.userId) {
            whereClause += ' AND al.user_id = ?';
            params.push(filters.userId);
        }
        if (filters.action) {
            whereClause += ' AND al.action = ?';
            params.push(filters.action);
        }
        if (filters.entityType) {
            whereClause += ' AND al.entity_type = ?';
            params.push(filters.entityType);
        }
        if (filters.entityId) {
            whereClause += ' AND al.entity_id = ?';
            params.push(filters.entityId);
        }
        if (filters.dateFrom) {
            whereClause += ' AND al.created_at >= ?';
            params.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            whereClause += ' AND al.created_at <= ?';
            params.push(filters.dateTo);
        }

        params.push(limit, offset);

        const logs = await this.db.all(`
            SELECT 
                al.*,
                au.name as admin_name,
                au.email as admin_email,
                u.name as user_name,
                u.email as user_email
            FROM audit_logs al
            LEFT JOIN admin_users au ON al.admin_id = au.id
            LEFT JOIN users u ON al.user_id = u.id
            ${whereClause}
            ORDER BY al.created_at DESC 
            LIMIT ? OFFSET ?
        `, params);

        return logs.map(log => {
            if (log.details) {
                try {
                    log.details = JSON.parse(log.details);
                } catch (error) {
                    // Keep as string if parsing fails
                }
            }
            return log;
        });
    }

    async getAuditLogById(logId) {
        const log = await this.db.get(`
            SELECT 
                al.*,
                au.name as admin_name,
                au.email as admin_email,
                u.name as user_name,
                u.email as user_email
            FROM audit_logs al
            LEFT JOIN admin_users au ON al.admin_id = au.id
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.id = ?
        `, [logId]);

        if (log && log.details) {
            try {
                log.details = JSON.parse(log.details);
            } catch (error) {
                // Keep as string if parsing fails
            }
        }

        return log;
    }

    async getAuditLogsByAdmin(adminId, limit = 50, offset = 0) {
        const logs = await this.db.all(`
            SELECT 
                al.*,
                u.name as user_name,
                u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.admin_id = ?
            ORDER BY al.created_at DESC 
            LIMIT ? OFFSET ?
        `, [adminId, limit, offset]);

        return logs.map(log => {
            if (log.details) {
                try {
                    log.details = JSON.parse(log.details);
                } catch (error) {
                    // Keep as string if parsing fails
                }
            }
            return log;
        });
    }

    async getAuditLogsByUser(userId, limit = 50, offset = 0) {
        const logs = await this.db.all(`
            SELECT 
                al.*,
                au.name as admin_name,
                au.email as admin_email
            FROM audit_logs al
            LEFT JOIN admin_users au ON al.admin_id = au.id
            WHERE al.user_id = ?
            ORDER BY al.created_at DESC 
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);

        return logs.map(log => {
            if (log.details) {
                try {
                    log.details = JSON.parse(log.details);
                } catch (error) {
                    // Keep as string if parsing fails
                }
            }
            return log;
        });
    }

    async getAuditLogsByAction(action, limit = 50, offset = 0) {
        const logs = await this.db.all(`
            SELECT 
                al.*,
                au.name as admin_name,
                au.email as admin_email,
                u.name as user_name,
                u.email as user_email
            FROM audit_logs al
            LEFT JOIN admin_users au ON al.admin_id = au.id
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.action = ?
            ORDER BY al.created_at DESC 
            LIMIT ? OFFSET ?
        `, [action, limit, offset]);

        return logs.map(log => {
            if (log.details) {
                try {
                    log.details = JSON.parse(log.details);
                } catch (error) {
                    // Keep as string if parsing fails
                }
            }
            return log;
        });
    }

    // Audit Analytics
    async getAuditStats(days = 30) {
        return await this.db.get(`
            SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT admin_id) as active_admins,
                COUNT(DISTINCT user_id) as affected_users,
                COUNT(DISTINCT action) as unique_actions,
                COUNT(CASE WHEN created_at >= datetime('now', '-1 day') THEN 1 END) as events_24h,
                COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as events_7d
            FROM audit_logs 
            WHERE created_at >= datetime('now', '-${days} days')
        `);
    }

    async getTopAdminActions(days = 30, limit = 10) {
        return await this.db.all(`
            SELECT 
                au.name as admin_name,
                au.email as admin_email,
                al.action,
                COUNT(*) as action_count
            FROM audit_logs al
            JOIN admin_users au ON al.admin_id = au.id
            WHERE al.created_at >= datetime('now', '-${days} days')
            GROUP BY al.admin_id, al.action
            ORDER BY action_count DESC
            LIMIT ?
        `, [limit]);
    }

    async getActionFrequency(days = 30) {
        return await this.db.all(`
            SELECT 
                action,
                COUNT(*) as frequency,
                COUNT(DISTINCT admin_id) as admin_count,
                COUNT(DISTINCT user_id) as user_count
            FROM audit_logs 
            WHERE created_at >= datetime('now', '-${days} days')
            GROUP BY action
            ORDER BY frequency DESC
        `);
    }

    async getDailyAuditActivity(days = 30) {
        return await this.db.all(`
            SELECT 
                date(created_at) as activity_date,
                COUNT(*) as total_events,
                COUNT(DISTINCT admin_id) as active_admins,
                COUNT(DISTINCT user_id) as affected_users
            FROM audit_logs 
            WHERE created_at >= datetime('now', '-${days} days')
            GROUP BY date(created_at)
            ORDER BY activity_date DESC
        `);
    }

    // Admin Session and Activity Tracking
    async getAdminActivity(adminId, days = 30) {
        return await this.db.all(`
            SELECT 
                action,
                entity_type,
                COUNT(*) as action_count,
                MAX(created_at) as last_action,
                MIN(created_at) as first_action
            FROM audit_logs 
            WHERE admin_id = ? 
            AND created_at >= datetime('now', '-${days} days')
            GROUP BY action, entity_type
            ORDER BY action_count DESC
        `, [adminId]);
    }

    async getRecentAdminLogins(limit = 50) {
        return await this.db.all(`
            SELECT 
                id, email, name, role, last_login
            FROM admin_users 
            WHERE last_login IS NOT NULL
            ORDER BY last_login DESC 
            LIMIT ?
        `, [limit]);
    }

    async getInactiveAdmins(days = 90) {
        return await this.db.all(`
            SELECT 
                id, email, name, role, last_login, created_at
            FROM admin_users 
            WHERE last_login IS NULL OR last_login <= datetime('now', '-${days} days')
            ORDER BY last_login ASC
        `);
    }

    // Data Management and Cleanup
    async cleanupOldAuditLogs(daysToKeep = 365) {
        const result = await this.db.run(`
            DELETE FROM audit_logs 
            WHERE created_at <= date('now', '-${daysToKeep} days')
        `);

        return { changes: result.changes };
    }

    async archiveAuditLogs(daysToKeep = 180) {
        // In a real implementation, you'd move data to an archive table
        const result = await this.db.get(`
            SELECT COUNT(*) as records_to_archive 
            FROM audit_logs 
            WHERE created_at <= date('now', '-${daysToKeep} days')
        `);

        return { records_to_archive: result.records_to_archive };
    }

    // Export and Reporting
    async exportAuditLogs(filters = {}, format = 'json') {
        const logs = await this.getAuditLogs(10000, 0, filters); // Large limit for export
        
        const exportData = {
            export_date: new Date().toISOString(),
            filters: filters,
            total_records: logs.length,
            logs: logs
        };

        if (format === 'csv') {
            const csvHeaders = 'id,created_at,admin_email,admin_name,action,entity_type,entity_id,user_email,ip_address,details';
            const csvRows = logs.map(log => 
                `${log.id},"${log.created_at}","${log.admin_email || ''}","${log.admin_name || ''}","${log.action}","${log.entity_type || ''}","${log.entity_id || ''}","${log.user_email || ''}","${log.ip_address || ''}","${JSON.stringify(log.details || {})}"`
            );
            return [csvHeaders, ...csvRows].join('\n');
        }

        return exportData;
    }

    async generateAdminReport(startDate, endDate) {
        const report = {
            period: { start: startDate, end: endDate },
            generated_at: new Date().toISOString()
        };

        // Basic stats
        report.stats = await this.db.get(`
            SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT admin_id) as active_admins,
                COUNT(DISTINCT user_id) as affected_users,
                COUNT(DISTINCT action) as unique_actions
            FROM audit_logs 
            WHERE created_at BETWEEN ? AND ?
        `, [startDate, endDate]);

        // Top actions
        report.top_actions = await this.db.all(`
            SELECT 
                action,
                COUNT(*) as frequency
            FROM audit_logs 
            WHERE created_at BETWEEN ? AND ?
            GROUP BY action
            ORDER BY frequency DESC
            LIMIT 10
        `, [startDate, endDate]);

        // Most active admins
        report.most_active_admins = await this.db.all(`
            SELECT 
                au.name,
                au.email,
                COUNT(*) as action_count
            FROM audit_logs al
            JOIN admin_users au ON al.admin_id = au.id
            WHERE al.created_at BETWEEN ? AND ?
            GROUP BY al.admin_id
            ORDER BY action_count DESC
            LIMIT 10
        `, [startDate, endDate]);

        return report;
    }

    // Compliance and Security
    async getSecurityEvents(days = 30) {
        const securityActions = [
            'admin_login_failed',
            'admin_account_locked',
            'permission_granted',
            'permission_revoked',
            'admin_created',
            'admin_deleted',
            'user_suspended',
            'user_deleted'
        ];

        const placeholders = securityActions.map(() => '?').join(',');

        return await this.db.all(`
            SELECT 
                al.*,
                au.name as admin_name,
                au.email as admin_email
            FROM audit_logs al
            LEFT JOIN admin_users au ON al.admin_id = au.id
            WHERE al.action IN (${placeholders})
            AND al.created_at >= datetime('now', '-${days} days')
            ORDER BY al.created_at DESC
        `, securityActions);
    }

    async getFailedLoginAttempts(hours = 24) {
        return await this.db.all(`
            SELECT 
                al.*,
                au.email as admin_email
            FROM audit_logs al
            LEFT JOIN admin_users au ON al.admin_id = au.id
            WHERE al.action = 'admin_login_failed'
            AND al.created_at >= datetime('now', '-${hours} hours')
            ORDER BY al.created_at DESC
        `);
    }

    async getSuspiciousActivity(adminId = null) {
        let whereClause = `WHERE al.action IN ('user_deleted', 'admin_deleted', 'bulk_operation', 'data_export')`;
        const params = [];

        if (adminId) {
            whereClause += ' AND al.admin_id = ?';
            params.push(adminId);
        }

        return await this.db.all(`
            SELECT 
                al.*,
                au.name as admin_name,
                au.email as admin_email
            FROM audit_logs al
            LEFT JOIN admin_users au ON al.admin_id = au.id
            ${whereClause}
            AND al.created_at >= datetime('now', '-30 days')
            ORDER BY al.created_at DESC
        `, params);
    }
}

module.exports = AdminRepository;