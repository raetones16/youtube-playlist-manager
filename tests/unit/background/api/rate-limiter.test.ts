// tests/unit/background/api/rate-limiter.test.ts

import { RateLimiter } from '../../../../src/background/api/rate-limiter';

describe('RateLimiter', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('should allow requests within rate limit', async () => {
        const limiter = new RateLimiter({
            maxRequests: 2,
            windowMs: 1000
        });

        // First request should be immediate
        const firstRequest = limiter.waitForToken();
        await expect(firstRequest).resolves.toBeUndefined();

        // Second request should also be immediate
        const secondRequest = limiter.waitForToken();
        await expect(secondRequest).resolves.toBeUndefined();
    });

    test('should delay requests when rate limit exceeded', async () => {
        const limiter = new RateLimiter({
            maxRequests: 2,
            windowMs: 1000
        });

        // Make 2 immediate requests to hit the limit
        await limiter.waitForToken();
        await limiter.waitForToken();

        // Start third request - should be delayed
        const thirdRequestPromise = limiter.waitForToken();
        
        // Verify no immediate resolution
        jest.advanceTimersByTime(500);
        expect(jest.getTimerCount()).toBe(1); // Should have an active timer

        // Advance past the window
        jest.advanceTimersByTime(500);
        await thirdRequestPromise; // Should now resolve
    });

    test('should handle sliding window correctly', async () => {
        const limiter = new RateLimiter({
            maxRequests: 2,
            windowMs: 1000
        });

        // Make 2 requests to hit limit
        await limiter.waitForToken();
        await limiter.waitForToken();

        // Advance time partially through window
        jest.advanceTimersByTime(600);

        // Make another request - should be delayed
        const thirdRequest = limiter.waitForToken();
        
        // Advance past first request's timestamp
        jest.advanceTimersByTime(400);
        await thirdRequest; // Should resolve as oldest timestamp is now outside window

        // Fourth request should be immediate as we're within limits again
        const fourthRequest = limiter.waitForToken();
        await expect(fourthRequest).resolves.toBeUndefined();
    });
});