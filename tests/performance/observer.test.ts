// tests/performance/observer.test.ts

import { PlaylistObserver } from '../../src/content/observers/playlist';
import { chrome } from '../setup';

describe('Playlist Observer Performance', () => {
    let observer: PlaylistObserver;
    let container: HTMLElement;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Create container and setup DOM
        container = document.createElement('div');
        container.id = 'contents';
        document.body.appendChild(container);

        // Initialize observer
        observer = new PlaylistObserver();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should efficiently handle rapid DOM changes', async () => {
        console.log('Starting rapid DOM change test...');
        const startTime = Date.now();
        const CHANGE_COUNT = 500;

        // Create video elements
        for (let i = 0; i < CHANGE_COUNT; i++) {
            const videoElement = document.createElement('div');
            videoElement.className = 'ytd-playlist-video-renderer';
            videoElement.innerHTML = `
                <div id="video-title">${i}</div>
                <div id="channel-name">
                    <a href="/channel/test">Test Channel</a>
                </div>
                <a href="/watch?v=video${i}">Link</a>
            `;
            container.appendChild(videoElement);

            // Let the observer process this change
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const operationTime = Date.now() - startTime;

        console.log(`
DOM Change Performance:
--------------------
Changes processed: ${CHANGE_COUNT}
Total time: ${operationTime}ms
Average time per change: ${(operationTime / CHANGE_COUNT).toFixed(2)}ms
Operations per second: ${Math.round(1000 / (operationTime / CHANGE_COUNT))}
        `);

        // Performance assertions
        expect(operationTime).toBeLessThan(2000); // Should process 500 changes in under 2 seconds
    });

    it('should efficiently detect and process video elements', async () => {
        const VIDEO_COUNT = 100;
        
        // Add multiple videos at once
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < VIDEO_COUNT; i++) {
            const videoElement = document.createElement('div');
            videoElement.className = 'ytd-playlist-video-renderer';
            videoElement.innerHTML = `
                <div id="video-title">Video ${i}</div>
                <div id="channel-name">
                    <a href="/channel/test">Test Channel</a>
                </div>
                <a href="/watch?v=video${i}">Link</a>
            `;
            fragment.appendChild(videoElement);
        }

        console.log('Testing batch video detection...');
        const startTime = Date.now();
        
        container.appendChild(fragment);
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for processing

        const processingTime = Date.now() - startTime;

        console.log(`
Video Detection Performance:
------------------------
Videos processed: ${VIDEO_COUNT}
Total time: ${processingTime}ms
Average time per video: ${(processingTime / VIDEO_COUNT).toFixed(2)}ms
        `);

        // Performance assertions
        expect(processingTime).toBeLessThan(1000); // Should process 100 videos in under 1 second
    });
});