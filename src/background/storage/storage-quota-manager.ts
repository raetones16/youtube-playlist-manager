// src/background/storage/storage-quota-manager.ts

import { ErrorType, ExtendedError } from '../../common/errors/types';
import { logger } from '../../common/utils/debug-logger';
import { messageBus } from '../message-bus';
import { MessageType } from '../../common/types/message-types';
import { storageManager } from './index';
import { cleanupManager } from './cleanup-manager';

interface LocalStorageEstimate {
    usage: number;
    quota: number;
}

export class StorageQuotaManager {
    private static instance: StorageQuotaManager;
    
    private readonly STORAGE_WARNING_THRESHOLD = 0.8;  // 80%
    private readonly STORAGE_CRITICAL_THRESHOLD = 0.95; // 95%
    private readonly STORAGE_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
    private readonly ESTIMATED_QUOTA = 100 * 1024 * 1024; // 100MB estimated quota

    private checkInterval: number | null = null;

    private constructor() {}

    static getInstance(): StorageQuotaManager {
        if (!StorageQuotaManager.instance) {
            StorageQuotaManager.instance = new StorageQuotaManager();
        }
        return StorageQuotaManager.instance;
    }

    async initialize(): Promise<void> {
        // Start periodic checks
        this.startPeriodicChecks();
        
        // Do initial check
        await this.checkStorageUsage();
    }

    async checkStorageUsage(): Promise<void> {
        try {
            const estimate = await this.getStorageEstimate();
            const usageRatio = estimate.usage / estimate.quota;

            logger.debug('StorageQuotaManager', 'storage check', {
                usage: estimate.usage,
                quota: estimate.quota,
                ratio: usageRatio
            });

            if (usageRatio >= this.STORAGE_CRITICAL_THRESHOLD) {
                await this.handleCriticalStorage(estimate);
            } else if (usageRatio >= this.STORAGE_WARNING_THRESHOLD) {
                await this.handleStorageWarning(estimate);
            }
        } catch (error) {
            logger.error('StorageQuotaManager', 'check failed', error as Error);
            this.notifyError(error as Error);
        }
    }

    private async handleCriticalStorage(estimate: LocalStorageEstimate): Promise<void> {
        logger.warn('StorageQuotaManager', 'critical storage level', {
            usage: estimate.usage,
            quota: estimate.quota
        });

        // Notify about critical storage
        await messageBus.send({
            type: MessageType.ERROR_STATUS,
            payload: {
                errorType: ErrorType.STORAGE_QUOTA,
                component: 'storage',
                timestamp: Date.now(),
                details: {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    level: 'critical'
                }
            }
        });

        // Attempt automatic cleanup
        await this.performAutoCleanup();
    }

    private async handleStorageWarning(estimate: LocalStorageEstimate): Promise<void> {
        logger.info('StorageQuotaManager', 'storage warning', {
            usage: estimate.usage,
            quota: estimate.quota
        });

        await messageBus.send({
            type: MessageType.ERROR_STATUS,
            payload: {
                errorType: ErrorType.STORAGE_QUOTA,
                component: 'storage',
                timestamp: Date.now(),
                details: {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    level: 'warning'
                }
            }
        });
    }

    private async performAutoCleanup(): Promise<void> {
        try {
            // Clean up old audit logs first
            const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
            const cleanupOperations = [
                this.cleanAuditLogs(threeDaysAgo),
                this.cleanOldSyncMetadata(threeDaysAgo)
            ];

            await Promise.all(cleanupOperations);
            
            // Check if cleanup was sufficient
            await this.checkStorageUsage();
        } catch (error) {
            logger.error('StorageQuotaManager', 'cleanup failed', error as Error);
            this.notifyError(error as Error);
        }
    }

    private async cleanAuditLogs(before: number): Promise<void> {
        const cleaned = await cleanupManager.cleanAuditLogs(before);
        logger.info('StorageQuotaManager', 'cleaned audit logs', { count: cleaned });
    }
    
    private async cleanOldSyncMetadata(before: number): Promise<void> {
        const cleaned = await cleanupManager.cleanSyncMetadata(before);
        logger.info('StorageQuotaManager', 'cleaned sync metadata', { count: cleaned });
    }

    private startPeriodicChecks(): void {
        if (this.checkInterval !== null) {
            window.clearInterval(this.checkInterval);
        }

        this.checkInterval = window.setInterval(
            () => this.checkStorageUsage(),
            this.STORAGE_CHECK_INTERVAL
        );
    }

    private async getStorageEstimate(): Promise<LocalStorageEstimate> {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            // Ensure we have numbers, not undefined
            return {
                usage: estimate.usage || 0,
                quota: estimate.quota || this.ESTIMATED_QUOTA
            };
        }

        // Fallback: manually estimate using IndexedDB
        try {
            const usage = await this.estimateStorageUsage();
            return {
                usage,
                quota: this.ESTIMATED_QUOTA
            };
        } catch (error) {
            throw new ExtendedError(
                ErrorType.STORAGE_ERROR,
                'Failed to estimate storage usage',
                {
                    component: 'storage',
                    operation: 'estimate',
                    timestamp: Date.now()
                },
                error as Error
            );
        }
    }

    private async estimateStorageUsage(): Promise<number> {
        const estimates = await Promise.all([
            cleanupManager.estimateStoreSize('auditLog'),
            cleanupManager.estimateStoreSize('syncMetadata'),
            cleanupManager.estimateStoreSize('videos'),
            cleanupManager.estimateStoreSize('playlists')
        ]);
        
        // Rough estimate: assume each record is about 1KB
        return estimates.reduce((total, count) => total + count * 1024, 0);
    }

    private notifyError(error: Error): void {
        const extError = new ExtendedError(
            ErrorType.STORAGE_ERROR,
            'Storage quota check failed',
            {
                component: 'storage',
                operation: 'quotaCheck',
                timestamp: Date.now()
            },
            error
        );
        // Use our error handler
        throw extError;
    }

    stopPeriodicChecks(): void {
        if (this.checkInterval !== null) {
            window.clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

export const storageQuotaManager = StorageQuotaManager.getInstance();