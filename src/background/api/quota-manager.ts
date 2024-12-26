// src/background/api/quota-manager.ts

import { APIError, ErrorType } from '../../common/errors/types';

export class QuotaManager {
    private static instance: QuotaManager;
    private readonly DAILY_QUOTA = 10000;
    private readonly WARNING_THRESHOLD = 0.8;
    private readonly CRITICAL_THRESHOLD = 0.95;

    private constructor() {}

    static getInstance(): QuotaManager {
        if (!QuotaManager.instance) {
            QuotaManager.instance = new QuotaManager();
        }
        return QuotaManager.instance;
    }

    async checkQuota(required: number): Promise<void> {
        const { quotaUsed, resetTime } = await this.getQuotaState();

        // Reset quota if it's a new day
        if (Date.now() > resetTime) {
            await this.resetQuota();
            return;
        }

        if (quotaUsed + required > this.DAILY_QUOTA) {
            throw new APIError(
                ErrorType.QUOTA,
                'Daily quota would be exceeded'
            );
        }

        // Emit warning if approaching quota limit
        if (quotaUsed + required > this.DAILY_QUOTA * this.WARNING_THRESHOLD) {
            this.emitQuotaWarning(quotaUsed);
        }
    }

    async consumeQuota(points: number): Promise<void> {
        const { quotaUsed } = await this.getQuotaState();
        await chrome.storage.local.set({
            quotaUsed: quotaUsed + points
        });
    }

    private async getQuotaState(): Promise<{
        quotaUsed: number;
        resetTime: number;
    }> {
        const { quotaUsed = 0, resetTime = 0 } = await chrome.storage.local.get([
            'quotaUsed',
            'resetTime'
        ]);
        return { quotaUsed, resetTime };
    }

    private async resetQuota(): Promise<void> {
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);

        await chrome.storage.local.set({
            quotaUsed: 0,
            resetTime: tomorrow.getTime()
        });
    }

    private emitQuotaWarning(current: number): void {
        const percentUsed = (current / this.DAILY_QUOTA) * 100;
        chrome.runtime.sendMessage({
            type: 'QUOTA_WARNING',
            payload: {
                current,
                total: this.DAILY_QUOTA,
                percentUsed
            }
        });
    }
}