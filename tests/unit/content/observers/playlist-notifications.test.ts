// tests/unit/content/observers/playlist-notifications.test.ts

import { PlaylistObserver } from '../../../../src/content/observers/playlist';
import { NotificationManager } from '../../../../src/content/ui/notifications/notification-manager';
import { MessageType } from '../../../../src/common/types/message-types';

// Mock Dependencies
jest.mock('../../../../src/content/ui/notifications/notification-manager');
jest.mock('../../../../src/background/message-bus', () => ({
    messageBus: {
        send: jest.fn().mockResolvedValue({ 
            success: true,
            data: { available: false, reason: 'deleted' }
        })
    }
}));
jest.mock('../../../../src/common/utils/sync-storage', () => ({
    syncStorage: {
        setupSyncListener: jest.fn(),
        updateVideoStatus: jest.fn().mockResolvedValue(undefined)
    }
}));


describe('PlaylistObserver Notifications', () => {
    let observer: PlaylistObserver;
    let notificationManager: jest.Mocked<ReturnType<typeof NotificationManager.getInstance>>;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Setup notification manager mock
        notificationManager = {
            success: jest.fn(),
            error: jest.fn(),
            warning: jest.fn(),
            info: jest.fn()
        } as any;
        (NotificationManager.getInstance as jest.Mock).mockReturnValue(notificationManager);
        
        // Create test container
        document.body.innerHTML = '<div id="test-container"></div>';
        jest.spyOn(document, 'querySelector')
            .mockReturnValueOnce(document.getElementById('test-container')); // For container lookup
        
        // Initialize observer
        observer = new PlaylistObserver();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

    test('should show notification when going offline', async () => {
        // We need to wait for initialization
        await new Promise(resolve => setTimeout(resolve, 0));
        
        window.dispatchEvent(new Event('offline'));
        
        expect(notificationManager.warning).toHaveBeenCalledWith(
            'You are offline. Changes will be queued until connection is restored.',
            expect.any(Object)
        );
    });

    test('should show notification when coming back online', async () => {
        // We need to wait for initialization
        await new Promise(resolve => setTimeout(resolve, 0));
        
        window.dispatchEvent(new Event('online'));
        
        expect(notificationManager.success).toHaveBeenCalledWith(
            'Connection restored'
        );
    });

    test('should notify when video becomes unavailable', async () => {
        const mockElement = document.createElement('div');
        const videoData = {
            videoId: 'test-id',
            title: 'Test Video',
            channelTitle: 'Test Channel',
            reason: 'private'
        };

        // Using the replaceWithDeletedVideo method directly
        await (observer as any).replaceWithDeletedVideo(mockElement, videoData);

        expect(notificationManager.info).toHaveBeenCalledWith(
            'Video "Test Video" is no longer available: Video is now private'
        );
    });

    test('should show correct notification for different video removal reasons', async () => {
        const mockElement = document.createElement('div');
        const testCases = [
            { reason: 'private', expectedText: 'Video is now private' },
            { reason: 'deleted', expectedText: 'Video has been removed' },
            { reason: 'copyright', expectedText: 'Video removed due to copyright' },
            { reason: 'unknown', expectedText: 'Video is unavailable' }
        ];

        for (const { reason, expectedText } of testCases) {
            const videoData = {
                videoId: `test-id-${reason}`,
                title: 'Test Video',
                channelTitle: 'Test Channel',
                reason
            };

            await (observer as any).replaceWithDeletedVideo(mockElement, videoData);

            expect(notificationManager.info).toHaveBeenCalledWith(
                expect.stringContaining(expectedText)
            );
        }
    });

    test('should queue operations when offline', async () => {
        // Setup mock data
        const mockElement = document.createElement('div');
        const mockVideoData = {
            videoId: 'test-id',
            title: 'Test Video',
            channelTitle: 'Test Channel'
        };
        
        // Mock video data extraction
        jest.spyOn(observer as any, 'extractVideoData')
            .mockReturnValue(mockVideoData);

        // Force offline state
        (observer as any).isOffline = true;

        // Process video while offline
        await (observer as any).processVideoElement(mockElement);

        // Should be queued
        expect((observer as any).operationQueue).toHaveLength(1);
        expect((observer as any).operationQueue[0].type).toBe('process');
        expect((observer as any).operationQueue[0].data).toBe(mockElement);
    });

    test('should process queued operations when coming back online', async () => {
        // Setup mock data
        const mockElement = document.createElement('div');
        const mockVideoData = {
            videoId: 'test-id',
            title: 'Test Video',
            channelTitle: 'Test Channel'
        };
        
        // Mock video data extraction
        jest.spyOn(observer as any, 'extractVideoData')
            .mockReturnValue(mockVideoData);

        // Force offline state and queue an operation
        (observer as any).isOffline = true;
        await (observer as any).processVideoElement(mockElement);
        expect((observer as any).operationQueue).toHaveLength(1);

        // Process queue
        (observer as any).isOffline = false;
        await (observer as any).processQueue();

        expect((observer as any).operationQueue).toHaveLength(0);
        expect(notificationManager.info).toHaveBeenCalledWith(
            expect.stringContaining('Video "Test Video" is no longer available')
        );
    });

    test('should maintain queue order for offline operations', async () => {
        // Setup mock data
        const mockElement1 = document.createElement('div');
        const mockElement2 = document.createElement('div');
        const mockVideoData = {
            videoId: 'test-id',
            title: 'Test Video',
            channelTitle: 'Test Channel'
        };
        
        // Mock video data extraction
        jest.spyOn(observer as any, 'extractVideoData')
            .mockReturnValue(mockVideoData);

        // Force offline state
        (observer as any).isOffline = true;

        // Queue multiple operations
        await (observer as any).processVideoElement(mockElement1);
        await (observer as any).handleVideoRemoval(mockElement2);

        // Check queue
        expect((observer as any).operationQueue).toHaveLength(2);
        expect((observer as any).operationQueue[0].type).toBe('process');
        expect((observer as any).operationQueue[1].type).toBe('removal');
    });
});