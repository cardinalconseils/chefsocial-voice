// Test script for pricing API and Stripe integration
require('dotenv').config();

async function testPricingAPI() {
    const baseUrl = 'http://localhost:3001';
    
    console.log('🧪 Testing ChefSocial Pricing API\n');
    
    try {
        // Test basic pricing endpoint
        console.log('1. Testing /api/pricing endpoint...');
        const response1 = await fetch(`${baseUrl}/api/pricing`);
        const data1 = await response1.json();
        console.log('✅ Basic pricing plans:');
        console.log(JSON.stringify(data1, null, 2));
        console.log('');
        
        // Test Stripe pricing endpoint
        console.log('2. Testing /api/pricing/stripe endpoint...');
        try {
            const response2 = await fetch(`${baseUrl}/api/pricing/stripe`);
            const data2 = await response2.json();
            console.log('✅ Stripe products:');
            console.log(JSON.stringify(data2, null, 2));
        } catch (error) {
            console.log('⚠️  Stripe endpoint error (expected if no products created yet):');
            console.log(error.message);
        }
        console.log('');
        
        // Test admin sync endpoint
        console.log('3. Testing admin sync endpoint...');
        try {
            const response3 = await fetch(`${baseUrl}/api/admin/sync-stripe-products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': process.env.ADMIN_TOKEN
                }
            });
            const data3 = await response3.json();
            console.log('✅ Stripe sync result:');
            console.log(JSON.stringify(data3, null, 2));
        } catch (error) {
            console.log('❌ Sync failed:');
            console.log(error.message);
        }
        console.log('');
        
        // Test Stripe pricing endpoint again after sync
        console.log('4. Testing /api/pricing/stripe endpoint after sync...');
        try {
            const response4 = await fetch(`${baseUrl}/api/pricing/stripe`);
            const data4 = await response4.json();
            console.log('✅ Stripe products after sync:');
            console.log(JSON.stringify(data4, null, 2));
        } catch (error) {
            console.log('❌ Stripe endpoint error:');
            console.log(error.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testPricingAPI();