// Simple test script for multilingual functionality
const http = require('http');

// Test function
function testAPI(path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port: 3001,
            path: path,
            method: data ? 'POST' : 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve(result);
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing ChefSocial Multilingual API...\n');

    try {
        // Test 1: Health check
        console.log('1. Testing health endpoint...');
        const health = await testAPI('/api/health');
        console.log('✅ Health:', health);

        // Test 2: Languages API
        console.log('\n2. Testing languages endpoint...');
        const languages = await testAPI('/api/languages');
        console.log('✅ Languages:', languages);

        // Test 3: French voice demo
        console.log('\n3. Testing French voice processing...');
        const frenchDemo = await testAPI('/api/process-voice-demo', {
            audio: 'VGVzdCBhdWRpbyBkYXRh',
            language: 'fr'
        });
        console.log('✅ French Demo:', frenchDemo);

        // Test 4: English voice demo
        console.log('\n4. Testing English voice processing...');
        const englishDemo = await testAPI('/api/process-voice-demo', {
            audio: 'VGVzdCBhdWRpbyBkYXRh',
            language: 'en'
        });
        console.log('✅ English Demo:', englishDemo);

        console.log('\n🎉 All tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run tests
runTests();