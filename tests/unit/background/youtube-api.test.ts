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

    it('respects rate limiting between requests', async () => {
        // Enable fake timers
        jest.useFakeTimers();

        (global.fetch as jest.Mock)
            .mockImplementation(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    items: [{
                        id: 'test-playlist-id',
                        snippet: { title: 'Test Playlist' },
                        contentDetails: { itemCount: 10 }
                    }]
                })
            }));

        // Start 6 requests (rate limit is 5 per second)
        const requests = Array(6).fill(null).map(() => 
            youtubeAPI.getPlaylistDetails('test-playlist-id')
        );
        
        // Advance timers to handle the rate limiting delay
        jest.advanceTimersByTime(1000);
        
        // Resolve all requests
        await Promise.all(requests);

        // Verify fetch was called 6 times
        expect(fetch).toHaveBeenCalledTimes(6);

        // Restore real timers
        jest.useRealTimers();
    });

    it('tracks quota usage across requests', async () => {
        (global.fetch as jest.Mock)
            .mockImplementation(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    items: [{
                        id: 'test-playlist-id',
                        snippet: { title: 'Test Playlist' },
                        contentDetails: { itemCount: 10 }
                    }]
                })
            }));

        // Set up storage mock to track quota usage
        let quotaUsed = 0;
        
        // Mock storage gets for quota and API key
        chrome.storage.local.get.mockImplementation((args: unknown) => {
            const keys = args as string[];
            if (keys.includes('quotaUsed')) {
                return Promise.resolve({ 
                    quotaUsed,
                    resetTime: Date.now() + 86400000,
                    apiKey: 'test-api-key'
                });
            }
            return Promise.resolve({ apiKey: 'test-api-key' });
        });

        // Mock storage sets for quota updates
        chrome.storage.local.set.mockImplementation((args: unknown) => {
            const data = args as { quotaUsed?: number };
            if (data.quotaUsed !== undefined) {
                quotaUsed = data.quotaUsed;
            }
            return Promise.resolve();
        });

        // Make multiple requests
        await Promise.all([
            youtubeAPI.getPlaylistDetails('playlist1'),
            youtubeAPI.getPlaylistDetails('playlist2')
        ]);

        // Each request should consume 1 quota point
        expect(quotaUsed).toBe(2);
    });

    it('handles large playlists with pagination correctly', async () => {
        // Mock responses for multiple pages
        const createMockPage = (pageToken: string | undefined) => ({
            items: Array(50).fill(null).map((_, index) => ({
                id: `video-${pageToken ? pageToken + '-' : ''}${index}`,
                snippet: {
                    title: `Video ${index}`,
                    channelId: 'test-channel',
                    channelTitle: 'Test Channel',
                    publishedAt: '2024-01-01T00:00:00Z',
                    position: pageToken ? parseInt(pageToken) * 50 + index : index,
                    thumbnails: {
                        default: { url: 'http://example.com/thumb.jpg' }
                    }
                },
                contentDetails: {
                    videoId: `video-${pageToken ? pageToken + '-' : ''}${index}`,
                    duration: 'PT1H'
                }
            })),
            nextPageToken: pageToken ? (pageToken === '2' ? undefined : String(Number(pageToken) + 1)) : '1'
        });
 
        (global.fetch as jest.Mock).mockImplementation((url) => {
            const urlParams = new URL(url).searchParams;
            const pageToken = urlParams.get('pageToken') || undefined;
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(createMockPage(pageToken))
            });
        });
 
        // Track running quota total
        let currentQuota = 0;
        
        // Mock storage to maintain running quota total
        chrome.storage.local.get.mockImplementation((keys: unknown) => {
            const keysArray = keys as string[];
            if (keysArray.includes('quotaUsed')) {
                return Promise.resolve({
                    quotaUsed: currentQuota,
                    resetTime: Date.now() + 86400000,
                    apiKey: 'test-api-key'
                });
            }
            return Promise.resolve({ apiKey: 'test-api-key' });
        });
 
        chrome.storage.local.set.mockImplementation((data: unknown) => {
            const updateData = data as { quotaUsed?: number };
            if (updateData.quotaUsed !== undefined) {
                currentQuota = updateData.quotaUsed;
            }
            return Promise.resolve();
        });
 
        // Fetch first page (page 0)
        const firstPage = await youtubeAPI.getPlaylistItems('test-playlist');
        expect(firstPage.items).toHaveLength(50);
        expect(firstPage.nextPageToken).toBe('1');
        expect(currentQuota).toBe(1);
 
        // Fetch second page (page 1)
        const secondPage = await youtubeAPI.getPlaylistItems('test-playlist', firstPage.nextPageToken);
        expect(secondPage.items).toHaveLength(50);
        expect(secondPage.nextPageToken).toBe('2');
        expect(currentQuota).toBe(2);
 
        // Fetch final page (page 2)
        const finalPage = await youtubeAPI.getPlaylistItems('test-playlist', secondPage.nextPageToken);
        expect(finalPage.items).toHaveLength(50);
        expect(finalPage.nextPageToken).toBeUndefined();
        expect(currentQuota).toBe(3);
 
        // Verify API calls were made
        expect(fetch).toHaveBeenCalledTimes(3);
        
        // Verify all videos have expected structure
        const allVideos = [...firstPage.items, ...secondPage.items, ...finalPage.items];
        expect(allVideos).toHaveLength(150);
        allVideos.forEach(video => {
            expect(video).toEqual(expect.objectContaining({
                videoId: expect.any(String),
                title: expect.any(String),
                channelId: 'test-channel',
                channelTitle: 'Test Channel'
            }));
        });
    });
});