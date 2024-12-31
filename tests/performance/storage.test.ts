// tests/performance/storage.test.ts

import 'fake-indexeddb/auto';
import { storageManager } from '../../src/background/storage';
import { VideoData, VideoStatus } from '../../src/background/storage/types';

const DB_NAME = 'YouTubePlaylistManager';

const deleteDatabase = () => {
    return new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
    });
};

describe('Storage Performance', () => {
    beforeEach(async () => {
        // @ts-ignore - accessing private for testing
        if (storageManager.db) {
            // @ts-ignore
            storageManager.db.close();
        }
        await deleteDatabase();
        // @ts-ignore
        storageManager.db = null;
        await storageManager.initialize();
    });

    it('should efficiently handle batch video storage operations', async () => {
        const BATCH_SIZE = 1000;
        const PLAYLIST_ID = 'performance-test-playlist';

        // Create test videos
        const testVideos: VideoData[] = Array(BATCH_SIZE).fill(null).map((_, index) => ({
            videoId: `video-${index}`,
            title: `Test Video ${index}`,
            channelId: 'test-channel',
            channelTitle: 'Test Channel',
            thumbnailUrl: 'http://example.com/thumb.jpg',
            duration: 'PT1H',
            addedAt: Date.now(),
            position: index,
            status: {
                current: VideoStatus.AVAILABLE,
                lastChecked: Date.now(),
                history: []
            },
            metadata: {
                userRemoved: false
            }
        }));

        console.log(`Starting batch operation with ${BATCH_SIZE} videos...`);
        const startTime = Date.now();

        // Store all videos
        await Promise.all(testVideos.map(video => 
            storageManager.addVideo(video, PLAYLIST_ID)
        ));

        const operationTime = Date.now() - startTime;

        // Log performance metrics
        console.log(`
Performance Results:
------------------
Total videos processed: ${BATCH_SIZE}
Total time: ${operationTime}ms
Average time per video: ${(operationTime / BATCH_SIZE).toFixed(2)}ms
Operations per second: ${Math.round(1000 / (operationTime / BATCH_SIZE))}
        `);

        // Performance assertions
        expect(operationTime).toBeLessThan(5000); // Should process 1000 videos in under 5 seconds

        // Verify data integrity
        const storedVideos = await storageManager.getPlaylistVideos(PLAYLIST_ID);
        expect(storedVideos).toHaveLength(BATCH_SIZE);
        expect(storedVideos[0]).toMatchObject({
            videoId: 'video-0',
            title: 'Test Video 0',
            status: {
                current: VideoStatus.AVAILABLE
            }
        });
    });

    it('should efficiently retrieve large playlists', async () => {
        const BATCH_SIZE = 1000;
        const PLAYLIST_ID = 'large-playlist-test';

        // First populate the database
        const testVideos: VideoData[] = Array(BATCH_SIZE).fill(null).map((_, index) => ({
            videoId: `video-${index}`,
            title: `Test Video ${index}`,
            channelId: 'test-channel',
            channelTitle: 'Test Channel',
            thumbnailUrl: 'http://example.com/thumb.jpg',
            duration: 'PT1H',
            addedAt: Date.now(),
            position: index,
            status: {
                current: VideoStatus.AVAILABLE,
                lastChecked: Date.now(),
                history: []
            },
            metadata: {
                userRemoved: false
            }
        }));

        await Promise.all(testVideos.map(video => 
            storageManager.addVideo(video, PLAYLIST_ID)
        ));

        // Test retrieval performance
        console.log('Testing retrieval performance...');
        const startTime = Date.now();
        
        const storedVideos = await storageManager.getPlaylistVideos(PLAYLIST_ID);
        
        const retrievalTime = Date.now() - startTime;

        console.log(`
Retrieval Performance:
--------------------
Videos retrieved: ${storedVideos.length}
Total time: ${retrievalTime}ms
Average time per video: ${(retrievalTime / storedVideos.length).toFixed(2)}ms
        `);

        // Performance assertions
        expect(retrievalTime).toBeLessThan(1000); // Should retrieve 1000 videos in under 1 second
        expect(storedVideos).toHaveLength(BATCH_SIZE);
    });
});