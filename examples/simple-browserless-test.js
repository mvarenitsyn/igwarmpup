const axios = require('axios');

// Configuration
const BROWSERLESS_TOKEN = 'S8yf0Lo56GNr1m2a9c480cc39f66c2f90362fe9d01';

/**
 * Test basic browserless connection
 */
async function testBasicConnection() {
    try {
        console.log('🔗 Testing basic browserless connection...');
        
        // Simple HTTP request to create a basic session
        const response = await axios.post('https://chrome.browserless.io/content', {
            url: 'https://httpbin.org/json'
        }, {
            params: { token: BROWSERLESS_TOKEN },
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('✅ Basic connection successful!');
        console.log('Response status:', response.status);
        console.log('Content received:', response.data ? 'Yes' : 'No');
        
        return true;
    } catch (error) {
        console.error('❌ Basic connection failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data);
            
            if (error.response.status === 429) {
                console.error('🚨 RATE LIMITED - This confirms the 429 issue!');
                return 'rate_limited';
            }
        } else {
            console.error('Error:', error.message);
        }
        return false;
    }
}

/**
 * Test WebSocket connection (this is what our app actually uses)
 */
async function testWebSocketEndpoint() {
    try {
        console.log('🔌 Testing WebSocket endpoint availability...');
        
        // Just test if the endpoint responds (not actually connecting via WS)
        const wsUrl = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}&proxyCountry=us&proxy=residential&proxySticky=true&stealth=true&headless=true`;
        
        console.log('WebSocket URL that would be used:', wsUrl);
        
        // Test if we can at least reach the endpoint with HTTP
        const response = await axios.get('https://chrome.browserless.io', {
            params: { token: BROWSERLESS_TOKEN },
            timeout: 5000
        });
        
        console.log('✅ Endpoint is reachable');
        console.log('Response status:', response.status);
        
        return true;
    } catch (error) {
        console.error('❌ WebSocket endpoint test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            if (error.response.status === 429) {
                console.error('🚨 RATE LIMITED on WebSocket endpoint!');
                return 'rate_limited';
            }
        } else {
            console.error('Error:', error.message);
        }
        return false;
    }
}

/**
 * Simplified "reset" - just wait and test again
 */
async function simpleReset() {
    console.log('⏳ Waiting 30 seconds for any rate limits to clear...');
    
    // Show countdown
    for (let i = 30; i > 0; i--) {
        process.stdout.write(`\r⏱️  ${i} seconds remaining...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n✅ Wait complete!');
    
    // Test connection again
    console.log('🔄 Testing connection after wait...');
    return await testBasicConnection();
}

/**
 * Main test function
 */
async function runBrowserlessTest() {
    console.log('🚀 Starting browserless connectivity test\n');
    console.log('Account type: Usage-based (limited API access)');
    console.log('Token:', BROWSERLESS_TOKEN.substring(0, 10) + '...\n');
    
    // Test 1: Basic connection
    console.log('='.repeat(50));
    console.log('TEST 1: Basic HTTP Connection');
    console.log('='.repeat(50));
    const basicResult = await testBasicConnection();
    
    if (basicResult === 'rate_limited') {
        console.log('\n🚨 Rate limit detected! Attempting reset...');
        console.log('='.repeat(50));
        console.log('RESET: Wait for Rate Limit to Clear');
        console.log('='.repeat(50));
        const resetResult = await simpleReset();
        
        if (resetResult === true) {
            console.log('✅ Connection restored after reset!');
        } else {
            console.log('❌ Still rate limited after reset');
        }
    }
    
    // Test 2: WebSocket endpoint
    console.log('\n' + '='.repeat(50));
    console.log('TEST 2: WebSocket Endpoint Check');
    console.log('='.repeat(50));
    const wsResult = await testWebSocketEndpoint();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    console.log('Basic connection:', basicResult === true ? '✅ Working' : basicResult === 'rate_limited' ? '🚨 Rate Limited' : '❌ Failed');
    console.log('WebSocket endpoint:', wsResult === true ? '✅ Working' : wsResult === 'rate_limited' ? '🚨 Rate Limited' : '❌ Failed');
    
    if (basicResult === 'rate_limited' || wsResult === 'rate_limited') {
        console.log('\n💡 RECOMMENDATIONS:');
        console.log('1. The browser memory leak fixes should prevent future rate limits');
        console.log('2. Wait 30-60 seconds between requests when rate limited');
        console.log('3. Consider upgrading to a dedicated browserless account for better limits');
        console.log('4. Monitor active connections in your application logs');
    }
    
    return {
        basicConnection: basicResult,
        webSocketEndpoint: wsResult,
        rateLimitDetected: basicResult === 'rate_limited' || wsResult === 'rate_limited'
    };
}

// Run the test
if (require.main === module) {
    runBrowserlessTest().catch(console.error);
}

module.exports = { runBrowserlessTest, testBasicConnection, simpleReset };