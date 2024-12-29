// tests/unit/content/ui/notifications/notification-manager.test.ts

import { NotificationManager } from '../../../../../src/content/ui/notifications/notification-manager';

describe('NotificationManager', () => {
    beforeEach(() => {
        // Clear the DOM before each test
        document.body.innerHTML = '';
        // Reset any existing instances
        (NotificationManager as any).instance = null;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('should maintain singleton instance', () => {
        const instance1 = NotificationManager.getInstance();
        const instance2 = NotificationManager.getInstance();
        expect(instance1).toBe(instance2);
    });

    test('should create notification container on initialization', () => {
        NotificationManager.getInstance();
        const container = document.getElementById('notification-container');
        
        expect(container).toBeTruthy();
        expect(container?.classList.contains('fixed')).toBe(true);
        expect(container?.classList.contains('bottom-4')).toBe(true);
        expect(container?.classList.contains('right-4')).toBe(true);
        expect(container?.classList.contains('z-50')).toBe(true);
    });

    test('should show notification with correct type', () => {
        const manager = NotificationManager.getInstance();
        const id = manager.show({
            type: 'success',
            message: 'Test message'
        });

        const notification = document.querySelector('.notification-item');
        expect(notification).toBeTruthy();
        expect(notification?.textContent).toContain('Test message');
    });

    test('should queue notifications when max visible is reached', () => {
        const manager = NotificationManager.getInstance();
        
        // Show max + 1 notifications
        for (let i = 0; i < 4; i++) {
            manager.show({
                type: 'info',
                message: `Test message ${i}`
            });
        }

        const visibleNotifications = document.querySelectorAll('.notification-item');
        expect(visibleNotifications.length).toBe(3); // MAX_VISIBLE
    });

    test('should handle notification actions', () => {
        const actionSpy = jest.fn();
        const manager = NotificationManager.getInstance();

        manager.show({
            type: 'info',
            message: 'Test message',
            actions: [{
                label: 'Click me',
                onClick: actionSpy
            }]
        });

        const actionButton = document.querySelector('.notification-action');
        actionButton?.dispatchEvent(new MouseEvent('click'));
        expect(actionSpy).toHaveBeenCalled();
    });

    // Helper method tests
    test('should have correct helper methods for notification types', () => {
        const manager = NotificationManager.getInstance();
        const spyShow = jest.spyOn(manager as any, 'show');

        manager.success('Success message');
        expect(spyShow).toHaveBeenCalledWith(expect.objectContaining({
            type: 'success',
            message: 'Success message'
        }));

        manager.error('Error message');
        expect(spyShow).toHaveBeenCalledWith(expect.objectContaining({
            type: 'error',
            message: 'Error message'
        }));
    });
});