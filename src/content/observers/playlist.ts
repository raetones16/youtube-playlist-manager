// src/content/observers/playlist.ts

import { DeletedVideoComponent } from '../ui/components/deleted-video';
import { messageBus } from '../../background/message-bus';
import { MessageType } from '../../common/types/message-types';

export class PlaylistObserver {
    private observer: MutationObserver | null = null;
    private retryAttempts: number = 0;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 1000;
    private readonly SELECTORS = {
        PLAYLIST_CONTAINER: 'ytd-playlist-video-list-renderer',
        VIDEO_ITEM: 'ytd-playlist-video-renderer',
        VIDEO_TITLE: '#video-title',
        CHANNEL_NAME: '#channel-name',
        THUMBNAIL: 'img#img'
    };

    constructor() {
        this.initialize();
    }

    private async initialize() {
        try {
            await this.waitForPlaylistContainer();
            this.setupObserver();
            this.processExistingVideos();
        } catch (error) {
            console.error('Failed to initialize playlist observer:', error);
            this.handleInitializationError();
        }
    }

    private async waitForPlaylistContainer(): Promise<Element> {
        return new Promise((resolve, reject) => {
            const findContainer = () => {
                const container = document.querySelector(this.SELECTORS.PLAYLIST_CONTAINER);
                if (container) {
                    resolve(container);
                } else if (this.retryAttempts < this.MAX_RETRIES) {
                    this.retryAttempts++;
                    setTimeout(findContainer, this.RETRY_DELAY);
                } else {
                    reject(new Error('Playlist container not found'));
                }
            };
            findContainer();
        });
    }

    private setupObserver() {
        const config: MutationObserverInit = {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'href', 'data-video-id']
        };

        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                this.processMutation(mutation);
            }
        });

        const container = document.querySelector(this.SELECTORS.PLAYLIST_CONTAINER);
        if (container) {
            this.observer.observe(container, config);
        }
    }

    private async processMutation(mutation: MutationRecord) {
        if (mutation.type === 'childList') {
            for (const node of Array.from(mutation.addedNodes)) {
                if (node instanceof HTMLElement && this.isVideoElement(node)) {
                    await this.processVideoElement(node);
                }
            }

            for (const node of Array.from(mutation.removedNodes)) {
                if (node instanceof HTMLElement && this.isVideoElement(node)) {
                    await this.handleVideoRemoval(node);
                }
            }
        } else if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
            if (this.isVideoElement(mutation.target)) {
                await this.checkVideoAvailability(mutation.target);
            }
        }
    }

    private isVideoElement(element: HTMLElement): boolean {
        return element.tagName.toLowerCase() === this.SELECTORS.VIDEO_ITEM.toLowerCase();
    }

    private async processVideoElement(element: HTMLElement) {
        try {
            const videoData = this.extractVideoData(element);
            if (!videoData) return;

            // Verify video availability
            const response = await messageBus.send({
                type: MessageType.VERIFY_VIDEO_AVAILABILITY,
                payload: {
                    videoId: videoData.videoId,
                    initialCheck: {
                        timestamp: Date.now(),
                        reason: 'initial_check'
                    }
                }
            });

            if (!response.success || !response.data.available) {
                await this.replaceWithDeletedVideo(element, {
                    ...videoData,
                    reason: response.data?.reason || 'unknown'
                });
            }
        } catch (error) {
            console.error('Error processing video element:', error);
        }
    }

    private async processExistingVideos() {
        const videos = document.querySelectorAll(this.SELECTORS.VIDEO_ITEM);
        for (const video of Array.from(videos)) {
            if (video instanceof HTMLElement) {
                await this.processVideoElement(video);
            }
        }
    }

    private async handleVideoRemoval(element: HTMLElement) {
        const videoData = this.extractVideoData(element);
        if (!videoData) return;

        await messageBus.send({
            type: MessageType.VIDEO_REMOVED,
            payload: {
                videoId: videoData.videoId,
                playlistId: this.getPlaylistId(),
                userInitiated: true,
                timestamp: Date.now()
            }
        });
    }

    private async checkVideoAvailability(element: HTMLElement) {
        const videoData = this.extractVideoData(element);
        if (!videoData) return;

        // Check with background if this video is marked as unavailable
        const response = await messageBus.send({
            type: MessageType.VERIFY_VIDEO_AVAILABILITY,
            payload: {
                videoId: videoData.videoId,
                initialCheck: {
                    timestamp: Date.now(),
                    reason: 'availability_check'
                }
            }
        });

        if (!response.success || !response.data.available) {
            await this.replaceWithDeletedVideo(element, {
                ...videoData,
                reason: response.data?.reason || 'unknown'
            });
        }
    }

    private extractVideoData(element: HTMLElement) {
        const titleElement = element.querySelector(this.SELECTORS.VIDEO_TITLE);
        const channelElement = element.querySelector(this.SELECTORS.CHANNEL_NAME);
        const thumbnailElement = element.querySelector(this.SELECTORS.THUMBNAIL);

        if (!titleElement || !channelElement) return null;

        const videoId = this.extractVideoId(titleElement as HTMLAnchorElement);
        if (!videoId) return null;

        return {
            videoId,
            title: titleElement.textContent?.trim() || 'Unknown Title',
            channelTitle: channelElement.textContent?.trim() || 'Unknown Channel',
            thumbnailUrl: (thumbnailElement as HTMLImageElement)?.src
        };
    }

    private extractVideoId(anchor: HTMLAnchorElement): string | null {
        const href = anchor.href;
        const match = href.match(/[?&]v=([^&]+)/);
        return match ? match[1] : null;
    }

    private getPlaylistId(): string {
        const url = new URL(window.location.href);
        return url.searchParams.get('list') || '';
    }

    private async replaceWithDeletedVideo(
        element: HTMLElement,
        videoData: {
            videoId: string;
            title: string;
            channelTitle: string;
            thumbnailUrl?: string;
            reason: string;
        }
    ) {
        const deletedVideo = new DeletedVideoComponent(videoData);
        deletedVideo.mount(element);
    }

    private handleInitializationError() {
        if (this.retryAttempts < this.MAX_RETRIES) {
            this.retryAttempts++;
            setTimeout(() => this.initialize(), this.RETRY_DELAY);
        } else {
            // Could integrate with a notification system here
            console.error('Failed to initialize playlist observer after max retries');
        }
    }

    public cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.retryAttempts = 0;
    }
}