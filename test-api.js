#!/usr/bin/env node
/**
 * ChefSocial Voice - Phase 1 API Test Script
 * Tests the core authentication and user management APIs
 */

const BASE_URL = 'http://localhost:3004/api';
let accessToken = '';
let refreshToken = '';

// Helper function to make HTTP requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    console.log(`\n🔗 ${method} ${endpoint}`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📝 Response:`, JSON.stringify(result, null, 2));
    
    return { response, result, status: response.status };
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    return { error: error.message };
  }
}

// Test registration flow
async function testRegistration() {
  console.log('\n🧪 Testing User Registration...');
  
  const testUser = {
    action: 'register',
    email: `test-${Date.now()}@chefsocial.io`,
    password: 'TestPassword123',
    name: 'Test User',
    restaurantName: 'Test Restaurant',
    cuisineType: 'Italian',
    location: 'New York, NY',
    phone: '+1-555-0123',
    marketingConsent: true
  };

  const { result, status } = await makeRequest('POST', '/auth', testUser);
  
  if (status === 201 && result.success) {
    console.log('✅ Registration successful');
    accessToken = result.accessToken;
    refreshToken = result.refreshToken;
    return { success: true, user: result.user };
  } else {
    console.log('❌ Registration failed');
    return { success: false, error: result.error };
  }
}

// Test login flow
async function testLogin() {
  console.log('\n🧪 Testing User Login...');
  
  const loginData = {
    action: 'login',
    email: 'test@chefsocial.io',
    password: 'TestPassword123'
  };

  const { result, status } = await makeRequest('POST', '/auth', loginData);
  
  if (status === 200 && result.success) {
    console.log('✅ Login successful');
    accessToken = result.accessToken;
    refreshToken = result.refreshToken;
    return { success: true };
  } else {
    console.log('❌ Login failed');
    return { success: false };
  }
}

// Test protected route access
async function testProtectedRoute() {
  console.log('\n🧪 Testing Protected Route Access...');
  
  if (!accessToken) {
    console.log('❌ No access token available');
    return { success: false };
  }

  const { result, status } = await makeRequest('GET', '/user', null, {
    'Authorization': `Bearer ${accessToken}`
  });
  
  if (status === 200 && result.success) {
    console.log('✅ Protected route access successful');
    return { success: true, user: result.data };
  } else {
    console.log('❌ Protected route access failed');
    return { success: false };
  }
}

// Test token refresh
async function testTokenRefresh() {
  console.log('\n🧪 Testing Token Refresh...');
  
  if (!refreshToken) {
    console.log('❌ No refresh token available');
    return { success: false };
  }

  const refreshData = {
    action: 'refresh',
    refreshToken: refreshToken
  };

  const { result, status } = await makeRequest('POST', '/auth', refreshData);
  
  if (status === 200 && result.success) {
    console.log('✅ Token refresh successful');
    accessToken = result.accessToken;
    refreshToken = result.refreshToken;
    return { success: true };
  } else {
    console.log('❌ Token refresh failed');
    return { success: false };
  }
}

// Test profile update
async function testProfileUpdate() {
  console.log('\n🧪 Testing Profile Update...');
  
  if (!accessToken) {
    console.log('❌ No access token available');
    return { success: false };
  }

  const updateData = {
    name: 'Updated Test User',
    restaurantName: 'Updated Restaurant Name',
    cuisineType: 'French',
    location: 'Paris, France'
  };

  const { result, status } = await makeRequest('PUT', '/user', updateData, {
    'Authorization': `Bearer ${accessToken}`
  });
  
  if (status === 200 && result.success) {
    console.log('✅ Profile update successful');
    return { success: true };
  } else {
    console.log('❌ Profile update failed');
    return { success: false };
  }
}

// Test rate limiting
async function testRateLimiting() {
  console.log('\n🧪 Testing Rate Limiting...');
  
  let rateLimitHit = false;
  
  for (let i = 1; i <= 25; i++) {
    const { response, status } = await makeRequest('GET', '/auth/me');
    
    if (status === 429) {
      console.log(`✅ Rate limit triggered after ${i} requests`);
      rateLimitHit = true;
      break;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  if (!rateLimitHit) {
    console.log('⚠️  Rate limit not triggered (may need adjustment)');
  }
  
  return { success: rateLimitHit };
}

// Test error handling
async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling...');
  
  // Test invalid login
  const invalidLogin = {
    action: 'login',
    email: 'nonexistent@example.com',
    password: 'wrongpassword'
  };

  const { result, status } = await makeRequest('POST', '/auth', invalidLogin);
  
  if (status === 401 && !result.success) {
    console.log('✅ Error handling working correctly');
    return { success: true };
  } else {
    console.log('❌ Error handling not working properly');
    return { success: false };
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 ChefSocial Voice - Phase 1 API Tests');
  console.log('=====================================');
  
  const results = {
    registration: await testRegistration(),
    login: await testLogin(),
    protectedRoute: await testProtectedRoute(),
    tokenRefresh: await testTokenRefresh(),
    profileUpdate: await testProfileUpdate(),
    rateLimiting: await testRateLimiting(),
    errorHandling: await testErrorHandling()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  let passed = 0;
  let total = 0;
  
  Object.entries(results).forEach(([test, result]) => {
    total++;
    if (result.success) {
      passed++;
      console.log(`✅ ${test}: PASSED`);
    } else {
      console.log(`❌ ${test}: FAILED`);
    }
  });
  
  console.log(`\n📈 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Phase 1 implementation is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
  
  return { passed, total, success: passed === total };
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL.replace('/api', '')}`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Entry point
(async () => {
  console.log('🔍 Checking if development server is running...');
  
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Development server is not running!');
    console.log('Please run: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Development server is running');
  
  // Wait a moment for server to be fully ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const results = await runTests();
  
  process.exit(results.success ? 0 : 1);
})(); 