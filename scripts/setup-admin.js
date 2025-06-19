#!/usr/bin/env node

/**
 * Setup Admin User Script for ChefSocial Voice
 * Creates an admin user for testing and performance monitoring
 */

const bcrypt = require('bcryptjs');

// Configuration
const ADMIN_CONFIG = {
  email: process.env.ADMIN_EMAIL || 'admin@chefsocial.com',
  password: process.env.ADMIN_PASSWORD || 'Admin123!',
  name: 'Admin User',
  restaurantName: 'ChefSocial Admin'
};

async function setupAdmin() {
  console.log('🔧 Setting up admin user for ChefSocial Voice...');
  
  try {
    // Import database - handle both .js and .ts versions
    let db;
    try {
      // Try importing the compiled version first
      const dbModule = require('../src/lib/database-postgres');
      db = dbModule.db || dbModule.default || dbModule;
    } catch (importError) {
      // If that fails, try requiring with ts-node or suggest alternatives
      console.log('⚠️ Could not import database module directly');
      console.log('💡 This script requires the database to be accessible');
      console.log('');
      console.log('🔧 Alternative setup methods:');
      console.log('1. Use the Next.js API: POST /api/auth with action: register');
      console.log('2. Manually create admin user through registration form');
      console.log('3. Use database client to insert admin user directly');
      throw new Error('Database module not accessible from Node.js script');
    }
    
    // Check if admin user already exists
    console.log(`👤 Checking for existing admin user: ${ADMIN_CONFIG.email}`);
    const existingUser = await db.getUserByEmail(ADMIN_CONFIG.email);
    
    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log('✅ Admin user already exists with admin role');
        return;
      } else {
        // Update existing user to admin role
        console.log('📝 Updating existing user to admin role...');
        await db.updateUser(existingUser.id, { role: 'admin' });
        console.log('✅ User role updated to admin');
        return;
      }
    }

    // Create new admin user
    console.log('👤 Creating new admin user...');
    
    const passwordHash = await bcrypt.hash(ADMIN_CONFIG.password, 12);
    const trialStartDate = new Date().toISOString();
    const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const userData = {
      email: ADMIN_CONFIG.email,
      passwordHash,
      name: ADMIN_CONFIG.name,
      restaurantName: ADMIN_CONFIG.restaurantName,
      role: 'admin',
      subscriptionStatus: 'active',
      trialStartDate,
      trialEndDate,
      emailVerified: true,
      onboardingCompleted: true,
      marketingConsent: false
    };

    const newUser = await db.createUser(userData);
    console.log('✅ Admin user created successfully');
    
    // Verify the user was created with admin role
    const verifyUser = await db.getUserByEmail(ADMIN_CONFIG.email);
    if (verifyUser && verifyUser.role === 'admin') {
      console.log('✅ Admin user verified with admin role');
    } else {
      console.log('⚠️ Warning: User created but role verification failed');
    }

    console.log('');
    console.log('📋 Admin User Details:');
    console.log(`Email: ${ADMIN_CONFIG.email}`);
    console.log(`Password: ${ADMIN_CONFIG.password}`);
    console.log(`Role: admin`);
    console.log('');
    console.log('🚀 You can now run performance tests with:');
    console.log('npm run test:performance');
    console.log('');
    console.log('🌐 Or access the admin panel at:');
    console.log('http://localhost:3004/admin');

  } catch (error) {
    console.error('❌ Failed to setup admin user:', error.message);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('database')) {
      console.log('');
      console.log('💡 Troubleshooting:');
      console.log('1. Ensure PostgreSQL database is running');
      console.log('2. Check DATABASE_URL environment variable');
      console.log('3. Run: npm run db:setup');
      console.log('4. Then retry: npm run setup:admin');
    }
    
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupAdmin().catch(error => {
    console.error('Setup error:', error);
    process.exit(1);
  });
}

module.exports = { setupAdmin, ADMIN_CONFIG }; 