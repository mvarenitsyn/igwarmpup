const axios = require('axios');

// Configuration
const BROWSERLESS_TOKEN = 'S8yf0Lo56GNr1m2a9c480cc39f66c2f90362fe9d01';
const BROWSERLESS_BASE_URL = 'https://chrome.browserless.io';

/**
 * Get current session information
 */
async function getSessions() {
    try {
        const response = await axios.get(`${BROWSERLESS_BASE_URL}/sessions`, {
            params: { token: BROWSERLESS_TOKEN }
        });
        
        console.log('Current sessions:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error getting sessions:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Kill all active sessions
 */
async function killAllSessions() {
    try {
        const response = await axios.delete(`${BROWSERLESS_BASE_URL}/sessions`, {
            params: { token: BROWSERLESS_TOKEN }
        });
        
        console.log('All sessions killed:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error killing sessions:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Kill a specific session by ID
 */
async function killSession(sessionId) {
    try {
        const response = await axios.delete(`${BROWSERLESS_BASE_URL}/sessions/${sessionId}`, {
            params: { token: BROWSERLESS_TOKEN }
        });
        
        console.log(`Session ${sessionId} killed:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Error killing session ${sessionId}:`, error.response?.data || error.message);
        return null;
    }
}

/**
 * Get account stats and limits
 */
async function getStats() {
    try {
        const response = await axios.get(`${BROWSERLESS_BASE_URL}/stats`, {
            params: { token: BROWSERLESS_TOKEN }
        });
        
        console.log('Account stats:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error getting stats:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Check if service is available
 */
async function healthCheck() {
    try {
        const response = await axios.get(`${BROWSERLESS_BASE_URL}/pressure`, {
            params: { token: BROWSERLESS_TOKEN }
        });
        
        console.log('Service pressure:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error checking health:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Main function to reset and check browserless
 */
async function resetBrowserless() {
    console.log('🔍 Checking current browserless status...\n');
    
    // Check health
    await healthCheck();
    
    // Get current stats
    await getStats();
    
    // Get active sessions
    const sessions = await getSessions();
    
    if (sessions && sessions.length > 0) {
        console.log(`\n⚠️  Found ${sessions.length} active sessions`);
        console.log('🧹 Killing all active sessions...');
        await killAllSessions();
        
        // Wait a moment and check again
        await new Promise(resolve => setTimeout(resolve, 2000));
        await getSessions();
    } else {
        console.log('\n✅ No active sessions found');
    }
    
    console.log('\n🎉 Browserless reset complete!');
}

// Export functions for use in other scripts
module.exports = {
    getSessions,
    killAllSessions,
    killSession,
    getStats,
    healthCheck,
    resetBrowserless
};

// Run if called directly
if (require.main === module) {
    resetBrowserless().catch(console.error);
}