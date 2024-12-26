// tests/unit/content/observers/playlist.test.ts

import { PlaylistObserver } from '../../../../src/content/observers/playlist';
import { MessageType, Message } from '../../../../src/common/types/message-types';
import { chrome } from '../../../setup';

describe('PlaylistObserver', () => {
    let playlistObserver: PlaylistObserver;
    let sentMessages: any[] = [];
    
    beforeEach(() => {
        sentMessages = [];
        
        // Setup mock DOM
        document.body.innerHTML = `
            <div id="content">
                <ytd-playlist-video-list-renderer>
                    <div id="contents"></div>
                </ytd-playlist-video-list-renderer>
            </div>
        `;
        
        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: {
                href: 'https://www.youtube.com/playlist?list=test-playlist-id'
            }
        });

        // Mock message sending and track calls
        (chrome.runtime.sendMessage as jest.Mock).mockImplementation((message: unknown) => {
            sentMessages.push(message);
            return Promise.resolve({
                success: true,
                data: { available: true }
            });
        });

        jest.clearAllMocks();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        playlistObserver?.cleanup();
        sentMessages = [];
    });

    it('sends verification message when video is added', async () => {
        // Initialize observer
        playlistObserver = new PlaylistObserver();
        
        await new Promise(resolve => setTimeout(resolve, 50));

        // Get the container
        const container = document.querySelector('#contents');
        if (!container) {
            throw new Error('Container not found');
        }

        // Add video element
        container.insertAdjacentHTML('beforeend', `
            <ytd-playlist-video-renderer>
                <div class="metadata">
                    <a id="video-title" href="/watch?v=test123">Test Video</a>
                    <div id="channel-name">
                        <a href="/channel/123">Test Channel</a>
                    </div>
                </div>
            </ytd-playlist-video-renderer>
        `);
        
        // Allow time for mutation observer
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Verify that the verification message was sent
        const verifyMessage = sentMessages.find(msg => 
            msg.type === MessageType.VERIFY_VIDEO_AVAILABILITY
        );
        
        expect(verifyMessage).toBeDefined();
        expect(verifyMessage).toMatchObject({
            type: MessageType.VERIFY_VIDEO_AVAILABILITY,
            payload: expect.objectContaining({
                videoId: 'test123'
            })
        });
    });
});