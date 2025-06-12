const axios = require('axios');

class BrowserlessManager {
    constructor(token, baseUrl = 'https://chrome.browserless.io') {
        this.token = token;
        this.baseUrl = baseUrl;
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            const config = {
                method,
                url: `${this.baseUrl}${endpoint}`,
                params: { token: this.token }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return { success: true, data: response.data };
        } catch (error) {
            console.error(`Browserless API error for ${endpoint}:`, error.response?.data || error.message);
            return { 
                success: false, 
                error: error.response?.data || error.message,
                status: error.response?.status
            };
        }
    }

    async getSessions() {
        return await this.makeRequest('/sessions');
    }

    async killAllSessions() {
        return await this.makeRequest('/sessions', 'DELETE');
    }

    async killSession(sessionId) {
        return await this.makeRequest(`/sessions/${sessionId}`, 'DELETE');
    }

    async getStats() {
        return await this.makeRequest('/stats');
    }

    async getHealthCheck() {
        return await this.makeRequest('/pressure');
    }

    async resetAndCleanup() {
        console.log('🔄 Starting browserless reset...');
        
        // Get current status
        const healthCheck = await this.getHealthCheck();
        const stats = await this.getStats();
        const sessions = await this.getSessions();

        console.log('Health check:', healthCheck.success ? '✅ OK' : '❌ Issues detected');
        
        if (stats.success) {
            const { concurrent, queued } = stats.data;
            console.log(`Current usage: ${concurrent} concurrent, ${queued} queued`);
        }

        if (sessions.success && sessions.data.length > 0) {
            console.log(`Found ${sessions.data.length} active sessions - cleaning up...`);
            const killResult = await this.killAllSessions();
            
            if (killResult.success) {
                console.log('✅ All sessions killed successfully');
                
                // Wait and verify
                await new Promise(resolve => setTimeout(resolve, 2000));
                const verification = await this.getSessions();
                
                if (verification.success) {
                    console.log(`Verification: ${verification.data.length} sessions remaining`);
                }
            } else {
                console.log('❌ Failed to kill sessions:', killResult.error);
            }
        } else {
            console.log('✅ No active sessions to clean up');
        }

        return {
            healthCheck,
            stats,
            sessions,
            cleanup: sessions.success && sessions.data.length > 0 ? await this.killAllSessions() : { success: true, message: 'No cleanup needed' }
        };
    }

    // Check if we're hitting rate limits
    async isRateLimited() {
        const health = await this.getHealthCheck();
        const stats = await this.getStats();
        
        if (!health.success && health.status === 429) {
            return true;
        }
        
        if (stats.success) {
            const { concurrent, maxConcurrent, queued, maxQueued } = stats.data;
            // Consider rate limited if we're at or near limits
            if (concurrent >= maxConcurrent || queued >= maxQueued) {
                return true;
            }
        }
        
        return false;
    }
}

module.exports = BrowserlessManager;