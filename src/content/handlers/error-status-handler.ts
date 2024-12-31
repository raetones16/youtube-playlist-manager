// src/content/handlers/error-status-handler.ts

import { messageBus } from '../../background/message-bus';
import { MessageType } from '../../common/types/message-types';
import { NotificationManager } from '../ui/notifications/notification-manager';
import { ErrorType } from '../../common/errors/types';

export class ErrorStatusHandler {
    private notificationManager = NotificationManager.getInstance();

    initialize(): void {
        messageBus.register(MessageType.ERROR_STATUS, this.handleErrorStatus.bind(this));
    }

    private async handleErrorStatus(payload: {
        errorType: ErrorType;
        component: string;
        details?: Record<string, any>;
    }): Promise<void> {
        switch (payload.errorType) {
            case ErrorType.STORAGE_QUOTA:
                await this.handleStorageQuota(payload);
                break;
            // Handle other error types as needed
            default:
                this.notificationManager.error('An error occurred. Please try again.');
        }
    }

    private async handleStorageQuota(payload: {
        errorType: ErrorType;
        component: string;
        details?: Record<string, any>;
    }): Promise<void> {
        const { details } = payload;
        const level = details?.level;
        const usagePercent = details?.quota 
            ? Math.round((details.usage / details.quota) * 100) 
            : null;

        if (level === 'critical') {
            this.notificationManager.error(
                `Storage space critical (${usagePercent}%). Automatic cleanup in progress.`,
                { duration: 7000 }
            );
        } else if (level === 'warning') {
            this.notificationManager.warning(
                `Storage space running low (${usagePercent}%). Old data will be cleaned up automatically.`,
                { duration: 5000 }
            );
        }
    }
}

export const errorStatusHandler = new ErrorStatusHandler();