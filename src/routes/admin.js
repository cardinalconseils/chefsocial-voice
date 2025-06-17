// ChefSocial Voice AI - Admin Routes
const express = require('express');
const router = express.Router();
const { asyncHandler, validateRequest } = require('../middleware/validation');
const { body, query, param } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Admin routes module - receives services from app.js
module.exports = (app) => {
    const { authSystem, logger, rateLimitService } = app.locals.services;
    
    // Admin authentication middleware
    const adminAuthMiddleware = async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Admin authentication required' });
            }

            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, authSystem.jwtSecret);
            
            // Get user and verify admin role
            const user = await authSystem.db.getUserById(decoded.userId);
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            req.adminId = decoded.userId;
            req.adminUser = user;
            next();
        } catch (error) {
            logger.error('Admin auth error', error);
            res.status(401).json({ error: 'Invalid admin token' });
        }
    };
    
    // Validation schemas
    const adminLoginValidation = validateRequest([
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 })
    ]);
    
    const userUpdateValidation = validateRequest([
        body('name').optional().trim().isLength({ min: 2, max: 100 }),
        body('email').optional().isEmail().normalizeEmail(),
        body('status').optional().isIn(['active', 'inactive', 'suspended']),
        body('role').optional().isIn(['user', 'admin'])
    ]);
    
    const auditLogValidation = validateRequest([
        body('action').notEmpty(),
        body('entityType').notEmpty(),
        body('entityId').optional().isString(),
        body('details').optional().isObject()
    ]);

    // POST /api/admin/auth/login
    router.post('/auth/login', 
        adminLoginValidation,
        asyncHandler(async (req, res) => {
            const { email, password } = req.body;
            const user = await authSystem.db.getUserByEmail(email);
            
            if (!user || user.role !== 'admin') {
                // Log failed admin login attempt
                await logger.logSecurityEvent(
                    'admin_login_failed',
                    `Failed admin login attempt for ${email}`,
                    'high',
                    {
                        email,
                        reason: 'invalid_credentials',
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent')
                    }
                );
                return res.status(401).json({ error: 'Invalid admin credentials' });
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                await logger.logSecurityEvent(
                    'admin_login_failed',
                    `Failed admin login attempt for ${email} - invalid password`,
                    'high',
                    {
                        email,
                        reason: 'invalid_password',
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent')
                    }
                );
                return res.status(401).json({ error: 'Invalid admin credentials' });
            }

            const adminToken = jwt.sign(
                { userId: user.id, email: user.email, role: 'admin' },
                authSystem.jwtSecret,
                { expiresIn: '8h' }
            );

            // Log successful admin login
            await authSystem.db.logAuditEvent({
                userId: null,
                adminId: user.id,
                action: 'admin_login',
                entityType: 'admin',
                entityId: user.id,
                details: { timestamp: new Date().toISOString() },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            logger.info('Admin login successful', {
                adminId: user.id,
                email: user.email,
                ipAddress: req.ip
            });

            res.json({
                success: true,
                token: adminToken,
                admin: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            });
        })
    );

    // GET /api/admin/users
    router.get('/users', 
        adminAuthMiddleware,
        validateRequest([
            query('page').optional().isInt({ min: 1 }),
            query('limit').optional().isInt({ min: 1, max: 100 }),
            query('search').optional().isString(),
            query('status').optional().isIn(['all', 'active', 'inactive', 'suspended'])
        ]),
        asyncHandler(async (req, res) => {
            const { page = 1, limit = 50, search = '', status = 'all' } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = '1=1';
            let params = [];

            if (search) {
                whereClause += ' AND (email LIKE ? OR name LIKE ? OR restaurant_name LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            if (status !== 'all') {
                whereClause += ' AND status = ?';
                params.push(status);
            }

            const users = await authSystem.db.db.all(`
                SELECT id, email, name, restaurant_name, cuisine_type, status, role,
                       created_at, last_login, trial_ends_at, preferred_language
                FROM users 
                WHERE ${whereClause}
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), parseInt(offset)]);

            // Get total count
            const totalResult = await authSystem.db.db.get(`
                SELECT COUNT(*) as total FROM users WHERE ${whereClause}
            `, params);

            // Log admin user access
            await authSystem.db.logAuditEvent({
                userId: null,
                adminId: req.adminId,
                action: 'admin_users_list',
                entityType: 'user',
                entityId: null,
                details: { 
                    search: search || null,
                    status,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    resultCount: users.length
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            logger.info('Admin accessed users list', {
                adminId: req.adminId,
                resultCount: users.length,
                search: search || 'none',
                status
            });

            res.json({
                success: true,
                users: users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalResult.total,
                    pages: Math.ceil(totalResult.total / limit)
                }
            });
        })
    );

    // PUT /api/admin/users/:id
    router.put('/users/:id',
        adminAuthMiddleware,
        param('id').isString(),
        userUpdateValidation,
        asyncHandler(async (req, res) => {
            const userId = req.params.id;
            const { name, email, status, role } = req.body;

            // Get existing user
            const existingUser = await authSystem.db.getUserById(userId);
            if (!existingUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Prevent admin from demoting themselves
            if (userId === req.adminId && role && role !== 'admin') {
                return res.status(400).json({ error: 'Cannot change your own admin role' });
            }

            // Update user
            const updateFields = [];
            const updateValues = [];

            if (name !== undefined) {
                updateFields.push('name = ?');
                updateValues.push(name);
            }
            if (email !== undefined) {
                updateFields.push('email = ?');
                updateValues.push(email);
            }
            if (status !== undefined) {
                updateFields.push('status = ?');
                updateValues.push(status);
            }
            if (role !== undefined) {
                updateFields.push('role = ?');
                updateValues.push(role);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({ error: 'No valid fields to update' });
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(userId);

            await authSystem.db.db.run(`
                UPDATE users 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateValues);

            // Log admin user update
            await authSystem.db.logAuditEvent({
                userId: userId,
                adminId: req.adminId,
                action: 'admin_user_update',
                entityType: 'user',
                entityId: userId,
                details: {
                    changes: { name, email, status, role },
                    previousData: {
                        name: existingUser.name,
                        email: existingUser.email,
                        status: existingUser.status,
                        role: existingUser.role
                    }
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            logger.info('Admin updated user', {
                adminId: req.adminId,
                targetUserId: userId,
                changes: Object.keys({ name, email, status, role }).filter(key => req.body[key] !== undefined)
            });

            res.json({
                success: true,
                message: 'User updated successfully',
                user: {
                    id: userId,
                    name: name || existingUser.name,
                    email: email || existingUser.email,
                    status: status || existingUser.status,
                    role: role || existingUser.role
                }
            });
        })
    );

    // GET /api/admin/analytics
    router.get('/analytics',
        adminAuthMiddleware,
        asyncHandler(async (req, res) => {
            const { timeframe = '30' } = req.query;
            const days = parseInt(timeframe);

            // Get user stats
            const userStats = await authSystem.db.db.get(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                    COUNT(CASE WHEN created_at >= datetime('now', '-${days} days') THEN 1 END) as new_users,
                    COUNT(CASE WHEN last_login >= datetime('now', '-7 days') THEN 1 END) as weekly_active
                FROM users
            `);

            // Get content stats
            const contentStats = await authSystem.db.db.all(`
                SELECT 
                    platform,
                    COUNT(*) as content_count,
                    AVG(viral_score) as avg_viral_score,
                    COUNT(CASE WHEN platform = 'instagram' THEN 1 END) as instagram_posts,
                    COUNT(CASE WHEN platform = 'tiktok' THEN 1 END) as tiktok_posts,
                    COUNT(CASE WHEN platform = 'facebook' THEN 1 END) as facebook_posts,
                    date(created_at) as creation_date
                FROM generated_content 
                WHERE created_at >= datetime('now', '-${days} days')
                GROUP BY platform, date(created_at)
                ORDER BY creation_date DESC
            `);

            // Get usage stats
            const usageStats = await authSystem.db.db.get(`
                SELECT 
                    SUM(voice_minutes_used) as total_voice_minutes,
                    SUM(images_generated) as total_images,
                    SUM(videos_created) as total_videos,
                    AVG(voice_minutes_used) as avg_voice_minutes,
                    COUNT(DISTINCT user_id) as active_users_with_usage
                FROM usage_tracking 
                WHERE month_year >= date('now', '-${Math.ceil(days/30)} months')
            `);

            // Get subscription stats
            const subscriptionStats = await authSystem.db.db.get(`
                SELECT 
                    COUNT(*) as total_subscriptions,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
                    COUNT(CASE WHEN cancel_at_period_end = 1 THEN 1 END) as canceling_subscriptions,
                    plan_name,
                    COUNT(*) as plan_count
                FROM subscriptions 
                GROUP BY plan_name
            `);

            // Log admin analytics access
            await authSystem.db.logAuditEvent({
                userId: null,
                adminId: req.adminId,
                action: 'admin_analytics_access',
                entityType: 'analytics',
                entityId: null,
                details: { timeframe: days },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            logger.info('Admin accessed analytics', {
                adminId: req.adminId,
                timeframe: days
            });

            res.json({
                success: true,
                analytics: {
                    timeframe: days,
                    users: userStats,
                    content: contentStats,
                    usage: usageStats,
                    subscriptions: subscriptionStats,
                    generatedAt: new Date().toISOString()
                }
            });
        })
    );

    // GET /api/admin/usage-reports
    router.get('/usage-reports',
        adminAuthMiddleware,
        asyncHandler(async (req, res) => {
            const { month = new Date().toISOString().substring(0, 7) } = req.query;

            // Get detailed usage report
            const usageReport = await authSystem.db.db.all(`
                SELECT 
                    u.id as user_id,
                    u.email,
                    u.name,
                    u.restaurant_name,
                    ut.voice_minutes_used,
                    ut.images_generated,
                    ut.videos_created,
                    ut.api_calls_made,
                    ut.extra_users,
                    ut.extra_locations,
                    ut.month_year
                FROM usage_tracking ut
                JOIN users u ON ut.user_id = u.id
                WHERE ut.month_year = ?
                ORDER BY ut.voice_minutes_used DESC
            `, [month]);

            // Get summary stats
            const summary = await authSystem.db.db.get(`
                SELECT 
                    COUNT(DISTINCT user_id) as active_users,
                    SUM(voice_minutes_used) as total_voice_minutes,
                    SUM(images_generated) as total_images,
                    SUM(videos_created) as total_videos,
                    AVG(voice_minutes_used) as avg_voice_minutes
                FROM usage_tracking 
                WHERE month_year = ?
            `, [month]);

            logger.info('Admin accessed usage reports', {
                adminId: req.adminId,
                month,
                userCount: usageReport.length
            });

            res.json({
                success: true,
                report: {
                    month,
                    summary,
                    users: usageReport,
                    generatedAt: new Date().toISOString()
                }
            });
        })
    );

    // GET /api/admin/audit-log
    router.get('/audit-log',
        adminAuthMiddleware,
        validateRequest([
            query('page').optional().isInt({ min: 1 }),
            query('limit').optional().isInt({ min: 1, max: 100 }),
            query('action').optional().isString(),
            query('entityType').optional().isString(),
            query('userId').optional().isString()
        ]),
        asyncHandler(async (req, res) => {
            const { page = 1, limit = 50, action, entityType, userId } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = '1=1';
            let params = [];

            if (action) {
                whereClause += ' AND action = ?';
                params.push(action);
            }
            if (entityType) {
                whereClause += ' AND entity_type = ?';
                params.push(entityType);
            }
            if (userId) {
                whereClause += ' AND user_id = ?';
                params.push(userId);
            }

            const auditLogs = await authSystem.db.db.all(`
                SELECT * FROM audit_logs 
                WHERE ${whereClause}
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), parseInt(offset)]);

            // Get total count
            const totalResult = await authSystem.db.db.get(`
                SELECT COUNT(*) as total FROM audit_logs WHERE ${whereClause}
            `, params);

            logger.info('Admin accessed audit log', {
                adminId: req.adminId,
                filters: { action, entityType, userId },
                resultCount: auditLogs.length
            });

            res.json({
                success: true,
                auditLogs: auditLogs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalResult.total,
                    pages: Math.ceil(totalResult.total / limit)
                }
            });
        })
    );

    // POST /api/admin/audit-log
    router.post('/audit-log',
        adminAuthMiddleware,
        auditLogValidation,
        asyncHandler(async (req, res) => {
            const { action, entityType, entityId, details } = req.body;

            await authSystem.db.logAuditEvent({
                userId: entityId && entityType === 'user' ? entityId : null,
                adminId: req.adminId,
                action,
                entityType,
                entityId,
                details,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            logger.info('Admin created audit log entry', {
                adminId: req.adminId,
                action,
                entityType,
                entityId
            });

            res.json({
                success: true,
                message: 'Audit log entry created'
            });
        })
    );

    // POST /api/admin/sync-stripe-products
    router.post('/sync-stripe-products',
        asyncHandler(async (req, res) => {
            // Add basic auth check or admin token validation here
            const adminToken = req.headers['x-admin-token'];
            if (adminToken !== process.env.ADMIN_TOKEN) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            await authSystem.syncStripeProducts();
            
            logger.info('Stripe products synced', {
                triggeredBy: 'admin_endpoint'
            });

            res.json({
                success: true,
                message: 'Stripe products synchronized successfully',
                timestamp: new Date().toISOString()
            });
        })
    );

    // Error handling middleware for admin routes
    router.use((error, req, res, next) => {
        // Log admin errors with high priority
        logger.logSecurityEvent(
            'admin_error',
            `Admin operation failed: ${error.message}`,
            'high',
            {
                adminId: req.adminId,
                path: req.path,
                method: req.method,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                error: error.message
            }
        );

        // Handle admin-specific errors
        if (error.message && error.message.includes('admin')) {
            return res.status(403).json({
                success: false,
                error: 'Admin access error',
                message: 'You do not have sufficient admin privileges'
            });
        }

        if (error.message && error.message.includes('authentication')) {
            return res.status(401).json({
                success: false,
                error: 'Admin authentication error',
                message: 'Invalid or expired admin token'
            });
        }

        // Default error response
        res.status(500).json({
            success: false,
            error: 'Admin operation error',
            message: error.message || 'An admin operation error occurred'
        });
    });

    return router;
};