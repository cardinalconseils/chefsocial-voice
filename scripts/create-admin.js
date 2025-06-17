#!/usr/bin/env node
// Create Admin User Script for ChefSocial
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const ChefSocialDatabase = require('./database');

async function createAdmin() {
    const db = new ChefSocialDatabase();
    
    // Admin user details
    const adminData = {
        id: uuidv4(),
        email: process.env.ADMIN_EMAIL || 'admin@chefsocial.io',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        name: process.env.ADMIN_NAME || 'ChefSocial Admin',
        role: 'admin'
    };

    try {
        // Hash the password
        const passwordHash = await bcrypt.hash(adminData.password, 12);

        // Create admin user in users table (for authentication)
        await new Promise((resolve, reject) => {
            db.db.run(`
                INSERT OR REPLACE INTO users (id, email, password_hash, name, role, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
            `, [adminData.id, adminData.email, passwordHash, adminData.name, adminData.role], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✅ Admin user created successfully!');
        console.log(`📧 Email: ${adminData.email}`);
        console.log(`🔑 Password: ${adminData.password}`);
        console.log(`\n🔗 Use these credentials to login at: POST /api/admin/auth/login`);
        console.log(`\n⚠️  IMPORTANT: Change the password after first login!`);

        // Log the creation
        await db.logAuditEvent({
            adminId: adminData.id,
            action: 'create_admin',
            entityType: 'admin',
            entityId: adminData.id,
            details: { created_by: 'setup_script' },
            ipAddress: '127.0.0.1',
            userAgent: 'setup-script'
        });

        console.log('✅ Admin creation logged in audit trail');

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        if (error.message.includes('UNIQUE constraint failed')) {
            console.log('ℹ️  Admin user with this email already exists. Use the existing credentials or update the database directly.');
        }
    } finally {
        db.close();
    }
}

// Run if called directly
if (require.main === module) {
    createAdmin();
}

module.exports = createAdmin;