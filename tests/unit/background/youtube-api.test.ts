// tests/unit/background/youtube-api.test.ts

import { youtubeAPI } from '../../../src/background/api/youtube';
import { chrome } from '../../setup';

describe('YouTubeAPI', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Mock storage to return API key
        chrome.storage.local.get.mockImplementation(() => 
            Promise.resolve({ apiKey: 'test-api-key' })
        );

        // Mock auth token
        chrome.identity.getAuthToken.mockImplementation(() =>
            Promise.resolve({ token: 'test-auth-token' })
        );

        // Mock global fetch
        global.fetch = jest.fn();
    });

    it('successfully fetches playlist details', async () => {
        // Mock successful API response
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    items: [{
                        id: 'test-playlist-id',
                        snippet: {
                            title: 'Test Playlist'
                        },
                        contentDetails: {
                            itemCount: 10
                        }
                    }]
                })
            })
        );

        const details = await youtubeAPI.getPlaylistDetails('test-playlist-id');

        expect(details).toEqual({
            id: 'test-playlist-id',
            title: 'Test Playlist',
            itemCount: 10
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('https://www.googleapis.com/youtube/v3/playlists'),
            expect.any(Object)
        );
    });

    it('successfully fetches video details', async () => {
        // Mock successful API response
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    items: [{
                        id: 'test-video-id',
                        snippet: {
                            title: 'Test Video',
                            channelId: 'test-channel',
                            channelTitle: 'Test Channel',
                            thumbnails: {
                                default: {
                                    url: 'http://example.com/thumb.jpg'
                                }
                            },
                            publishedAt: '2024-01-01T00:00:00Z'
                        },
                        contentDetails: {
                            duration: 'PT1H'
                        },
                        status: {
                            privacyStatus: 'public'
                        }
                    }]
                })
            })
        );

        const videos = await youtubeAPI.getVideoDetails(['test-video-id']);

        expect(videos).toHaveLength(1);
        expect(videos[0]).toEqual(expect.objectContaining({
            videoId: 'test-video-id',
            title: 'Test Video',
            channelId: 'test-channel',
            channelTitle: 'Test Channel'
        }));

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('https://www.googleapis.com/youtube/v3/videos'),
            expect.any(Object)
        );
    });

    it('handles video not found error', async () => {
        // Mock 404 response
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                status: 404,
                json: () => Promise.resolve({
                    error: {
                        code: 404,
                        message: 'Video not found'
                    }
                })
            })
        );

        await expect(youtubeAPI.getVideoDetails(['nonexistent-id']))
            .rejects
            .toThrow('Resource not found');
    });
});