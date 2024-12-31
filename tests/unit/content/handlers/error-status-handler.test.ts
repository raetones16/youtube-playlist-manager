// tests/unit/content/handlers/error-status-handler.test.ts

import { ErrorStatusHandler } from '../../../../src/content/handlers/error-status-handler';
import { NotificationManager } from '../../../../src/content/ui/notifications/notification-manager';
import { ErrorType } from '../../../../src/common/errors/types';

// Mock NotificationManager
jest.mock('../../../../src/content/ui/notifications/notification-manager', () => ({
    NotificationManager: {
        getInstance: jest.fn().mockReturnValue({
            error: jest.fn(),
            warning: jest.fn()
        })
    }
}));

describe('ErrorStatusHandler', () => {
    let handler: ErrorStatusHandler;
    let notificationManager: jest.Mocked<NotificationManager>;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new ErrorStatusHandler();
        notificationManager = NotificationManager.getInstance() as jest.Mocked<NotificationManager>;
    });

    it('shows error notification for critical storage', async () => {
        await handler['handleErrorStatus']({
            errorType: ErrorType.STORAGE_QUOTA,
            component: 'storage',
            details: {
                level: 'critical',
                usage: 95000000,
                quota: 100000000
            }
        });

        expect(notificationManager.error).toHaveBeenCalledWith(
            expect.stringContaining('95%'),
            expect.objectContaining({ duration: 7000 })
        );
    });

    it('shows warning notification for warning storage', async () => {
        await handler['handleErrorStatus']({
            errorType: ErrorType.STORAGE_QUOTA,
            component: 'storage',
            details: {
                level: 'warning',
                usage: 80000000,
                quota: 100000000
            }
        });

        expect(notificationManager.warning).toHaveBeenCalledWith(
            expect.stringContaining('80%'),
            expect.objectContaining({ duration: 5000 })
        );
    });
});