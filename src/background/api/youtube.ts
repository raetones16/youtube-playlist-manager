// src/background/api/youtube.ts

import { QuotaManager } from './quota-manager';
import { RateLimiter } from './rate-limiter';
import { APIError, ErrorType } from '../../common/errors/types';
import { VideoData, VideoStatus } from '../storage/types';

export class YouTubeAPI {
    private static instance: YouTubeAPI;
    private quotaManager: QuotaManager;
    private rateLimiter: RateLimiter;

    private constructor() {
        this.quotaManager = QuotaManager.getInstance();
        this.rateLimiter = new RateLimiter({
            maxRequests: 5,
            windowMs: 1000
        });
    }

    static getInstance(): YouTubeAPI {
        if (!YouTubeAPI.instance) {
            YouTubeAPI.instance = new YouTubeAPI();
        }
        return YouTubeAPI.instance;
    }

    async getPlaylistDetails(playlistId: string): Promise<PlaylistDetails> {
        await this.rateLimiter.waitForToken();
        await this.quotaManager.checkQuota(1);

        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/playlists?` +
                `part=snippet,contentDetails&id=${playlistId}&key=${await this.getApiKey()}`,
                {
                    headers: await this.getAuthHeaders()
                }
            );

            if (!response.ok) {
                throw await this.handleErrorResponse(response);
            }

            const data = await response.json();
            await this.quotaManager.consumeQuota(1);

            if (!data.items || data.items.length === 0) {
                throw new APIError(ErrorType.NOT_FOUND, 'Playlist not found');
            }

            return {
                id: data.items[0].id,
                title: data.items[0].snippet.title,
                itemCount: data.items[0].contentDetails.itemCount
            };
        } catch (error) {
            if (error instanceof APIError) throw error;
            throw new APIError(ErrorType.NETWORK, 'Failed to fetch playlist details', error as Error);
        }
    }

    async getPlaylistItems(playlistId: string, pageToken?: string): Promise<{
        items: VideoData[];
        nextPageToken?: string;
    }> {
        await this.rateLimiter.waitForToken();
        await this.quotaManager.checkQuota(1);

        try {
            const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
            url.searchParams.append('part', 'snippet,contentDetails,status');
            url.searchParams.append('playlistId', playlistId);
            url.searchParams.append('maxResults', '50');
            url.searchParams.append('key', await this.getApiKey());
            if (pageToken) {
                url.searchParams.append('pageToken', pageToken);
            }

            const response = await fetch(url.toString(), {
                headers: await this.getAuthHeaders()
            });

            if (!response.ok) {
                throw await this.handleErrorResponse(response);
            }

            const data = await response.json();
            await this.quotaManager.consumeQuota(1);

            return {
                items: data.items.map(this.mapResponseToVideoData),
                nextPageToken: data.nextPageToken
            };
        } catch (error) {
            if (error instanceof APIError) throw error;
            throw new APIError(ErrorType.NETWORK, 'Failed to fetch playlist items', error as Error);
        }
    }

    async getVideoDetails(videoIds: string[]): Promise<VideoData[]> {
        await this.rateLimiter.waitForToken();
        await this.quotaManager.checkQuota(1);

        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?` +
                `part=snippet,contentDetails,status&id=${videoIds.join(',')}&key=${await this.getApiKey()}`,
                {
                    headers: await this.getAuthHeaders()
                }
            );

            if (!response.ok) {
                throw await this.handleErrorResponse(response);
            }

            const data = await response.json();
            await this.quotaManager.consumeQuota(1);

            return data.items.map(this.mapResponseToVideoData);
        } catch (error) {
            if (error instanceof APIError) throw error;
            throw new APIError(ErrorType.NETWORK, 'Failed to fetch video details', error as Error);
        }
    }

    private async getAuthHeaders(): Promise<Headers> {
        const token = await this.getAccessToken();
        return new Headers({
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        });
    }

    private async getApiKey(): Promise<string> {
        const { apiKey } = await chrome.storage.local.get('apiKey');
        if (!apiKey) throw new APIError(ErrorType.AUTH, 'API key not found');
        return apiKey;
    }

    private async getAccessToken(): Promise<string> {
        try {
            const result = await chrome.identity.getAuthToken({ interactive: true });
            if (!result || !result.token) {
                throw new APIError(ErrorType.AUTH, 'Failed to get access token');
            }
            return result.token;
        } catch (error) {
            throw new APIError(ErrorType.AUTH, 'Failed to get access token', error as Error);
        }
    }

    private async handleErrorResponse(response: Response): Promise<never> {
        const data = await response.json();
        const error = data.error || {};

        switch (response.status) {
            case 401:
                throw new APIError(ErrorType.AUTH, 'Unauthorized: Invalid credentials');
            case 403:
                if (error.reason === 'quotaExceeded') {
                    throw new APIError(ErrorType.QUOTA, 'Quota exceeded');
                }
                throw new APIError(ErrorType.FORBIDDEN, 'Access forbidden');
            case 404:
                throw new APIError(ErrorType.NOT_FOUND, 'Resource not found');
            case 429:
                throw new APIError(ErrorType.RATE_LIMIT, 'Rate limit exceeded');
            default:
                throw new APIError(
                    ErrorType.UNKNOWN,
                    `API Error: ${error.message || response.statusText}`
                );
        }
    }

    private mapResponseToVideoData(item: any): VideoData {
        return {
            videoId: item.id || item.contentDetails?.videoId,
            title: item.snippet.title,
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails?.default?.url,
            duration: item.contentDetails?.duration,
            addedAt: new Date(item.snippet.publishedAt).getTime(),
            position: item.snippet.position || 0,
            status: {
                current: VideoStatus.AVAILABLE,  // Fix the enum reference
                lastChecked: Date.now(),
                history: []
            },
            metadata: {
                userRemoved: false
            }
        };
    }
}

export interface PlaylistDetails {
    id: string;
    title: string;
    itemCount: number;
}

export const youtubeAPI = YouTubeAPI.getInstance();