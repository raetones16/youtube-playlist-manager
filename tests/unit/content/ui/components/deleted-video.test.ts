// tests/unit/content/ui/components/deleted-video.test.ts

import { DeletedVideoComponent } from '../../../../../src/content/ui/components/deleted-video';

describe('DeletedVideoComponent', () => {
    let targetElement: HTMLElement;

    beforeEach(() => {
        // Create a target element to mount our component
        targetElement = document.createElement('div');
        document.body.appendChild(targetElement);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders with video data correctly', () => {
        const testVideo = {
            videoId: 'test123',
            title: 'Test Video Title',
            channelTitle: 'Test Channel',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            reason: 'private',
            lastAvailable: Date.now()
        };

        const component = new DeletedVideoComponent(testVideo);
        component.mount(targetElement);

        // Verify basic structure
        const container = document.querySelector('.deleted-video-container');
        expect(container).toBeTruthy();

        // Check title
        const titleElement = container?.querySelector('.deleted-video-title');
        expect(titleElement?.textContent).toBe(testVideo.title);

        // Check channel name
        const channelElement = container?.querySelector('.channel-name');
        expect(channelElement?.textContent).toBe(testVideo.channelTitle);

        // Check status badge
        const badgeElement = container?.querySelector('.status-badge-text');
        expect(badgeElement?.textContent).toBe('Private video');
    });

    it('handles missing thumbnail gracefully', () => {
        const testVideo = {
            videoId: 'test123',
            title: 'Test Video Title',
            channelTitle: 'Test Channel',
            reason: 'deleted',
            lastAvailable: Date.now()
        };

        const component = new DeletedVideoComponent(testVideo);
        component.mount(targetElement);

        // Should show placeholder thumbnail
        const placeholder = document.querySelector('.placeholder-thumbnail');
        expect(placeholder).toBeTruthy();
    });

    it('updates component when data changes', () => {
        const initialVideo = {
            videoId: 'test123',
            title: 'Initial Title',
            channelTitle: 'Test Channel',
            reason: 'private',
            lastAvailable: Date.now()
        };

        const component = new DeletedVideoComponent(initialVideo);
        component.mount(targetElement);

        // Update the data
        const updatedVideo = {
            ...initialVideo,
            title: 'Updated Title',
            reason: 'deleted'
        };

        component.update(updatedVideo);

        // Verify title updated
        const titleElement = document.querySelector('.deleted-video-title');
        expect(titleElement?.textContent).toBe('Updated Title');

        // Verify status badge updated
        const badgeElement = document.querySelector('.status-badge-text');
        expect(badgeElement?.textContent).toBe('Video removed');
    });
});