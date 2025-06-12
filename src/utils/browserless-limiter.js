// Simple rate limiter for browserless.io requests
class BrowserlessLimiter {
    constructor(maxConcurrent = 2, delayBetweenRequests = 1000) {
        this.maxConcurrent = maxConcurrent;
        this.delayBetweenRequests = delayBetweenRequests;
        this.activeConnections = 0;
        this.lastRequestTime = 0;
        this.queue = [];
    }

    async acquire() {
        return new Promise((resolve) => {
            const request = { resolve };
            this.queue.push(request);
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.queue.length === 0 || this.activeConnections >= this.maxConcurrent) {
            return;
        }

        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.delayBetweenRequests) {
            setTimeout(() => this.processQueue(), this.delayBetweenRequests - timeSinceLastRequest);
            return;
        }

        const request = this.queue.shift();
        this.activeConnections++;
        this.lastRequestTime = now;

        request.resolve(() => {
            this.activeConnections--;
            // Process next request after a delay
            setTimeout(() => this.processQueue(), this.delayBetweenRequests);
        });
    }

    async withLimit(fn) {
        const release = await this.acquire();
        try {
            const result = await fn();
            return result;
        } finally {
            release();
        }
    }
}

// Global instance
const browserlessLimiter = new BrowserlessLimiter(2, 2000); // Max 2 concurrent, 2 second delay

module.exports = browserlessLimiter;