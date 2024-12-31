// src/background/error-handler.ts

import { ErrorType, ExtendedError, ErrorContext } from '../common/errors/types';
import { logger } from '../common/utils/debug-logger';
import { messageBus } from './message-bus';
import { MessageType } from '../common/types/message-types';

export class ErrorHandler {
    private static instance: ErrorHandler;
    private retryQueue: Map<string, RetryConfig> = new Map();

    private constructor() {}

    static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    handleError(error: ExtendedError): void {
        // Log the error
        logger.error(
            error.context.component,
            error.context.operation,
            error,
            error.context.details
        );

        // Handle based on error type
        switch (error.type) {
            case ErrorType.QUOTA:
                this.handleQuotaError(error);
                break;
            case ErrorType.NETWORK:
                this.handleNetworkError(error);
                break;
            case ErrorType.STORAGE_QUOTA:
                this.handleStorageQuotaError(error);
                break;
            case ErrorType.SYNC_ERROR:
                this.handleSyncError(error);
                break;
            default:
                this.handleGenericError(error);
        }

        // Notify about the error
        this.notifyError(error);
    }

    private handleQuotaError(error: ExtendedError): void {
        const retryAfter = this.calculateQuotaRetryTime();
        this.notifyError(error, { retryAfter });

        // Update sync status if it's a sync operation
        if (error.context.component === 'sync') {
            messageBus.send({
                type: MessageType.SYNC_STATUS,
                payload: {
                    playlistId: error.context.details?.playlistId || '',
                    status: 'error',
                    progress: 0,
                    error: 'API quota exceeded'
                }
            });
        }
    }

    private handleNetworkError(error: ExtendedError): void {
        const retryKey = this.getRetryKey(error.context);
        const retryConfig = this.retryQueue.get(retryKey) || {
            count: 0,
            lastAttempt: 0,
            operation: error.context.operation
        };

        if (this.shouldRetry(retryConfig)) {
            this.scheduleRetry(error, retryConfig);
        }
    }

    private handleStorageQuotaError(error: ExtendedError): void {
        this.notifyError(error, {
            requiresAction: true,
            storageDetails: error.context.details
        });
    }

    private handleSyncError(error: ExtendedError): void {
        const shouldRetry = error.context.details?.retryable !== false;
        
        if (shouldRetry) {
            this.scheduleRetry(error, {
                count: 0,
                lastAttempt: 0,
                operation: error.context.operation
            });
        }

        // Update sync status
        messageBus.send({
            type: MessageType.SYNC_STATUS,
            payload: {
                playlistId: error.context.details?.playlistId || '',
                status: 'error',
                progress: 0,
                error: error.message
            }
        });
    }

    private handleGenericError(error: ExtendedError): void {
        this.notifyError(error);
    }

    private notifyError(error: ExtendedError, additionalDetails?: Record<string, any>): void {
        messageBus.send({
            type: MessageType.ERROR_STATUS,
            payload: {
                errorType: error.type,
                component: error.context.component,
                timestamp: error.context.timestamp,
                details: {
                    ...error.context.details,
                    ...additionalDetails
                }
            }
        });
    }

    private scheduleRetry(error: ExtendedError, config: RetryConfig): void {
        const retryKey = this.getRetryKey(error.context);
        const delay = this.calculateRetryDelay(config.count);

        this.retryQueue.set(retryKey, {
            ...config,
            count: config.count + 1,
            lastAttempt: Date.now()
        });

        setTimeout(() => {
            messageBus.send({
                type: MessageType.ERROR_RETRY,
                payload: {
                    component: error.context.component,
                    operation: config.operation,
                    context: error.context.details || {}
                }
            });
        }, delay);
    }

    private shouldRetry(config: RetryConfig): boolean {
        const MAX_RETRIES = 3;
        const MIN_RETRY_INTERVAL = 1000; // 1 second

        return config.count < MAX_RETRIES &&
            Date.now() - config.lastAttempt >= MIN_RETRY_INTERVAL;
    }

    private calculateRetryDelay(retryCount: number): number {
        // Exponential backoff: 1s, 2s, 4s
        return Math.pow(2, retryCount) * 1000;
    }

    private calculateQuotaRetryTime(): number {
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);
        return tomorrow.getTime();
    }

    private getRetryKey(context: ErrorContext): string {
        return `${context.component}:${context.operation}`;
    }
}

interface RetryConfig {
    count: number;
    lastAttempt: number;
    operation: string;
}

export const errorHandler = ErrorHandler.getInstance();