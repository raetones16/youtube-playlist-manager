// src/background/api/rate-limiter.ts

interface RateLimiterConfig {
    maxRequests: number;
    windowMs: number;
}

export class RateLimiter {
    private timestamps: number[] = [];
    private readonly maxRequests: number;
    private readonly windowMs: number;

    constructor(config: RateLimiterConfig) {
        this.maxRequests = config.maxRequests;
        this.windowMs = config.windowMs;
    }

    async waitForToken(): Promise<void> {
        const now = Date.now();
        this.timestamps = this.timestamps.filter(
            time => now - time < this.windowMs
        );

        if (this.timestamps.length >= this.maxRequests) {
            const oldestTimestamp = this.timestamps[0];
            const waitTime = this.windowMs - (now - oldestTimestamp);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.timestamps.push(now);
    }
}