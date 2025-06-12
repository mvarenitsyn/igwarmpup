const axios = require('axios');

// Configuration
const config = {
    apiBaseUrl: 'http://localhost:3002',
    browserlessToken: 'S8yf0Lo56GNr1m2a9c480cc39f66c2f90362fe9d01'
};

/**
 * Test browserless status endpoint
 */
async function testBrowserlessStatus() {
    try {
        console.log('🔍 Checking browserless status...');
        
        const response = await axios.get(`${config.apiBaseUrl}/api/instagram/browserless/status`, {
            params: {
                browserlessToken: config.browserlessToken
            }
        });

        console.log('✅ Status check successful!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        return response.data;
    } catch (error) {
        console.error('❌ Error checking browserless status:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
        return null;
    }
}

/**
 * Test browserless reset endpoint
 */
async function testBrowserlessReset() {
    try {
        console.log('🔄 Testing browserless reset...');
        
        const response = await axios.post(`${config.apiBaseUrl}/api/instagram/browserless/reset`, {
            browserlessToken: config.browserlessToken
        });

        console.log('✅ Reset successful!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        return response.data;
    } catch (error) {
        console.error('❌ Error resetting browserless:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
        return null;
    }
}

/**
 * Direct browserless API test (without going through our API)
 */
async function testDirectBrowserlessAPI() {
    try {
        console.log('🔗 Testing direct browserless API access...');
        
        // Test stats endpoint
        const statsResponse = await axios.get('https://chrome.browserless.io/stats', {
            params: { token: config.browserlessToken }
        });
        
        console.log('✅ Direct API access successful!');
        console.log('Stats:', JSON.stringify(statsResponse.data, null, 2));
        
        // Test sessions endpoint
        const sessionsResponse = await axios.get('https://chrome.browserless.io/sessions', {
            params: { token: config.browserlessToken }
        });
        
        console.log('Active sessions:', sessionsResponse.data.length);
        
        return {
            stats: statsResponse.data,
            sessions: sessionsResponse.data
        };
    } catch (error) {
        console.error('❌ Error with direct browserless API:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
        return null;
    }
}

/**
 * Full test workflow
 */
async function runFullTest() {
    console.log('🚀 Starting browserless management tests\n');
    
    // Test 1: Direct API access
    console.log('='.repeat(50));
    console.log('TEST 1: Direct Browserless API Access');
    console.log('='.repeat(50));
    const directResult = await testDirectBrowserlessAPI();
    
    // Test 2: Status check through our API
    console.log('\n' + '='.repeat(50));
    console.log('TEST 2: Status Check via Our API');
    console.log('='.repeat(50));
    const statusResult = await testBrowserlessStatus();
    
    // Test 3: Reset through our API
    console.log('\n' + '='.repeat(50));
    console.log('TEST 3: Reset via Our API');
    console.log('='.repeat(50));
    const resetResult = await testBrowserlessReset();
    
    // Test 4: Status check after reset
    console.log('\n' + '='.repeat(50));
    console.log('TEST 4: Status Check After Reset');
    console.log('='.repeat(50));
    const postResetStatus = await testBrowserlessStatus();
    
    console.log('\n🎉 All tests completed!');
    
    return {
        directAPI: directResult,
        initialStatus: statusResult,
        reset: resetResult,
        postResetStatus: postResetStatus
    };
}

// Export functions for individual use
module.exports = {
    testBrowserlessStatus,
    testBrowserlessReset,
    testDirectBrowserlessAPI,
    runFullTest
};

// Run if called directly
if (require.main === module) {
    runFullTest().catch(console.error);
}