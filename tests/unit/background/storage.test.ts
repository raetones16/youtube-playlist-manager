// tests/unit/background/storage.test.ts

// Import fake-indexeddb first
import 'fake-indexeddb/auto';

import { storageManager } from '../../../src/background/storage';
import { VideoData, VideoStatus, RemovalType } from '../../../src/background/storage/types';

const DB_NAME = 'YouTubePlaylistManager';

const deleteDatabase = () => {
    return new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve(); // Resolve even on error
        request.onblocked = () => resolve(); // Resolve if blocked
    });
};

describe('StorageManager', () => {
    beforeEach(async () => {
        // @ts-ignore - accessing private for testing
        if (storageManager.db) {
            // @ts-ignore
            storageManager.db.close();
        }
        
        // Reset instance and clear database
        await deleteDatabase();
        // @ts-ignore
        storageManager.db = null;
        
        // Initialize fresh database
        await storageManager.initialize();
    });

    it('successfully adds and retrieves a video', async () => {
        const videoId = 'test-video-id';
        const playlistId = 'test-playlist-id';
        
        const testVideo: VideoData = {
            videoId,
            title: 'Test Video',
            channelId: 'test-channel-id',
            channelTitle: 'Test Channel',
            addedAt: Date.now(),
            position: 0,
            status: {
                current: VideoStatus.AVAILABLE,
                lastChecked: Date.now(),
                history: []
            },
            metadata: {
                userRemoved: false
            }
        };

        await storageManager.addVideo(testVideo, playlistId);
        const videos = await storageManager.getPlaylistVideos(playlistId);

        expect(videos).toHaveLength(1);
        expect(videos[0]).toMatchObject({
            videoId: testVideo.videoId,
            title: testVideo.title,
            status: {
                current: VideoStatus.AVAILABLE
            }
        });
    });

    it('successfully updates video status', async () => {
        const videoId = 'test-video-id';
        const playlistId = 'test-playlist-id';

        const testVideo: VideoData = {
            videoId,
            title: 'Test Video',
            channelId: 'test-channel-id',
            channelTitle: 'Test Channel',
            addedAt: Date.now(),
            position: 0,
            status: {
                current: VideoStatus.AVAILABLE,
                lastChecked: Date.now(),
                history: []
            },
            metadata: {
                userRemoved: false
            }
        };

        await storageManager.addVideo(testVideo, playlistId);

        // Update status
        await storageManager.updateVideoStatus(
            videoId,
            playlistId,
            VideoStatus.UNAVAILABLE,
            RemovalType.PRIVATE
        );

        const videos = await storageManager.getPlaylistVideos(playlistId);
        expect(videos).toHaveLength(1);
        expect(videos[0].status.current).toBe(VideoStatus.UNAVAILABLE);
        expect(videos[0].status.history[0]).toMatchObject({
            status: VideoStatus.UNAVAILABLE,
            reason: RemovalType.PRIVATE
        });
    });
});