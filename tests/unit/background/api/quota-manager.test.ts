// tests/unit/background/api/quota-manager.test.ts

import { QuotaManager } from '../../../../src/background/api/quota-manager';
import { APIError, ErrorType } from '../../../../src/common/errors/types';
import { chrome } from '../../../setup';

describe('QuotaManager', () => {
    let quotaManager: QuotaManager;
    
    beforeEach(() => {
        // Get singleton instance
        quotaManager = QuotaManager.getInstance();
        // Reset mock states
        jest.clearAllMocks();
        // Setup default storage state
        chrome.storage.local.get.mockImplementation(() => 
            Promise.resolve({ quotaUsed: 0, resetTime: 0 })
        );
    });

    test('should prevent quota exceeded operations', async () => {
        // Setup storage mock to return current quota state
        chrome.storage.local.get.mockImplementation(() => 
            Promise.resolve({ quotaUsed: 0, resetTime: Date.now() + 86400000 }) // resetTime set to tomorrow
        );

        // Attempt to use more quota than allowed
        const excessiveQuota = 11000; // Over 10000 daily limit
        
        await expect(quotaManager.checkQuota(excessiveQuota))
            .rejects
            .toThrow(APIError);
    });

    test('should emit warning when approaching quota limit', async () => {
        // Setup storage mock with existing quota usage
        chrome.storage.local.get.mockImplementation(() => 
            Promise.resolve({
                quotaUsed: 7000, // 70% used
                resetTime: Date.now() + 86400000
            })
        );

        // Request quota that will push us over 80% (but under 100%)
        await quotaManager.checkQuota(1500); // Will push to 85%

        // Verify warning message was sent
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
            type: 'QUOTA_WARNING',
            payload: {
                current: 7000,
                total: 10000,
                percentUsed: 70
            }
        });
    });

    test('should track consumed quota in storage', async () => {
        // Setup initial storage state
        chrome.storage.local.get.mockImplementation(() => 
            Promise.resolve({
                quotaUsed: 100,
                resetTime: Date.now() + 86400000
            })
        );

        // Consume some quota
        await quotaManager.consumeQuota(50);

        // Verify storage was updated with new total
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
            quotaUsed: 150
        });
    });

    test('should reset quota when reset time has passed', async () => {
        // Setup storage with expired reset time (yesterday)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        chrome.storage.local.get.mockImplementation(() => 
            Promise.resolve({
                quotaUsed: 5000,
                resetTime: yesterday.getTime()
            })
        );

        // Attempt to check quota
        await quotaManager.checkQuota(100);

        // Should have reset quota and set new reset time
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
            quotaUsed: 0,
            resetTime: expect.any(Number)
        });

        // Verify the new reset time is set to next midnight
        const setCall = chrome.storage.local.set.mock.calls[0][0] as {
            quotaUsed: number;
            resetTime: number;
        };
        const resetDate = new Date(setCall.resetTime);
        expect(resetDate.getHours()).toBe(0);
        expect(resetDate.getMinutes()).toBe(0);
        expect(resetDate.getSeconds()).toBe(0);
    });
});