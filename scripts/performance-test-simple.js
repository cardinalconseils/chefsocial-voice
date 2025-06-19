#!/usr/bin/env node

/**
 * Simple Performance Testing Script for ChefSocial Voice
 * Tests basic endpoints without authentication for quick performance validation
 */

const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3004',
  targets: {
    apiResponse: 200,   // ms
  },
  iterations: {
    warmup: 3,
    test: 10
  }
};

class SimplePerformanceTester {
  constructor() {
    this.results = {};
  }

  async run() {
    console.log('🚀 Starting Simple ChefSocial Performance Tests');
    console.log(`Target: API responses <${CONFIG.targets.apiResponse}ms`);
    console.log('');

    try {
      // Check server health
      await this.checkServerHealth();
      
      // Warm up
      console.log('🔥 Warming up...');
      await this.warmup();
      
      // Run tests
      console.log('⚡ Running performance tests...');
      await this.testPublicEndpoints();
      await this.testConcurrentRequests();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Performance test failed:', error.message);
      process.exit(1);
    }
  }

  async checkServerHealth() {
    console.log('🔍 Checking server health...');
    
    try {
      const response = await fetch(`${CONFIG.baseUrl}/`);
      
      if (response.ok || response.status === 404) {
        console.log('✅ Server is running');
        return;
      }
      
      throw new Error(`Server returned status: ${response.status}`);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Server not accessible at ${CONFIG.baseUrl}. Please ensure the server is running with: npm run dev`);
      }
      throw error;
    }
  }

  async warmup() {
    // Warm up with basic requests
    for (let i = 0; i < CONFIG.iterations.warmup; i++) {
      await this.makeRequest('/');
      await this.makeRequest('/api/auth', 'GET');
    }
    console.log('✅ Warmup complete');
  }

  async testPublicEndpoints() {
    console.log('\n🌐 Testing Public API Endpoints...');
    
    const endpoints = [
      { path: '/', name: 'Home Page' },
      { path: '/api/auth', name: 'Auth Endpoint (GET)', method: 'GET' },
      { path: '/demo', name: 'Demo Page' },
      { path: '/auth/login', name: 'Login Page' },
      { path: '/auth/register', name: 'Register Page' }
    ];

    for (const endpoint of endpoints) {
      const times = [];
      
      for (let i = 0; i < CONFIG.iterations.test; i++) {
        const start = performance.now();
        await this.makeRequest(endpoint.path, endpoint.method);
        const duration = performance.now() - start;
        times.push(duration);
      }

      const stats = this.calculateStats(times);
      this.results[endpoint.name] = stats;
      
      const status = stats.average <= CONFIG.targets.apiResponse ? '✅' : '❌';
      console.log(`${status} ${endpoint.name}: ${stats.average.toFixed(1)}ms avg (${stats.min.toFixed(1)}-${stats.max.toFixed(1)}ms)`);
    }
  }

  async testConcurrentRequests() {
    console.log('\n⚡ Testing Concurrent Request Performance...');
    
    const concurrencyLevels = [5, 10];
    
    for (const concurrency of concurrencyLevels) {
      const start = performance.now();
      
      // Create concurrent requests to home page
      const promises = Array(concurrency).fill(null).map(() => 
        this.makeRequest('/')
      );
      
      await Promise.all(promises);
      const totalTime = performance.now() - start;
      const avgTime = totalTime / concurrency;
      
      const testName = `Concurrent ${concurrency} requests`;
      this.results[testName] = {
        average: avgTime,
        total: totalTime,
        concurrency
      };
      
      const status = avgTime <= CONFIG.targets.apiResponse ? '✅' : '❌';
      console.log(`${status} ${concurrency} concurrent: ${avgTime.toFixed(1)}ms avg, ${totalTime.toFixed(1)}ms total`);
    }
  }

  async makeRequest(endpoint, method = 'GET') {
    const response = await fetch(`${CONFIG.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Don't throw for expected 404s, 405s, etc.
    return response;
  }

  calculateStats(times) {
    const sorted = times.sort((a, b) => a - b);
    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      count: times.length
    };
  }

  generateReport() {
    console.log('\n📈 Simple Performance Test Results');
    console.log('='.repeat(50));
    
    let allPassed = true;
    const failedTests = [];
    
    Object.entries(this.results).forEach(([name, stats]) => {
      const target = CONFIG.targets.apiResponse;
      const passed = stats.average <= target;
      
      if (!passed) {
        allPassed = false;
        failedTests.push({ name, stats, target });
      }
      
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${name}`);
      console.log(`  Average: ${stats.average.toFixed(1)}ms (target: <${target}ms)`);
      if (stats.p95) console.log(`  95th percentile: ${stats.p95.toFixed(1)}ms`);
      console.log('');
    });

    // Summary
    console.log('📋 Summary');
    console.log('-'.repeat(30));
    
    if (allPassed) {
      console.log('🎉 All basic performance tests PASSED!');
      console.log('✅ API responses < 200ms target met');
      console.log('');
      console.log('💡 Next steps:');
      console.log('1. Set up admin user to run full performance tests');
      console.log('2. Run: npm run test:performance');
      console.log('3. Visit /admin/performance for detailed monitoring');
    } else {
      console.log('⚠️  Some performance tests FAILED:');
      failedTests.forEach(({ name, stats, target }) => {
        console.log(`❌ ${name}: ${stats.average.toFixed(1)}ms (target: <${target}ms)`);
      });
    }

    process.exit(allPassed ? 0 : 1);
  }
}

// Run the simple performance tests
if (require.main === module) {
  const tester = new SimplePerformanceTester();
  tester.run().catch(error => {
    console.error('Performance test error:', error);
    process.exit(1);
  });
}

module.exports = SimplePerformanceTester; 