// src/content/observers/playlist.ts

import { DeletedVideoComponent } from '../ui/components/deleted-video';
import { messageBus } from '../../background/message-bus';
import { MessageType } from '../../common/types/message-types';
import { syncStorage, VideoSyncData } from '../../common/utils/sync-storage';
import { NotificationManager } from '../ui/notifications/notification-manager';

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
        THUMBNAIL: 'img#img',
        DURATION: 'span.ytd-thumbnail-overlay-time-status-renderer',
        INDEX: '#index'
    };
    private isOffline: boolean = false;
    private operationQueue: Array<{
        type: 'process' | 'removal';
        data: any;
    }> = [];

    private notifications = NotificationManager.getInstance();

    constructor() {
        this.initializeAll();
    }
    
    private async initializeAll() {
        await this.initialize();
        this.setupConnectionListener();
        this.setupSyncListener();
    }

    private setupConnectionListener() {
        window.addEventListener('online', () => this.handleConnectionChange(true));
        window.addEventListener('offline', () => this.handleConnectionChange(false));
        // Check initial state
        this.handleConnectionChange(navigator.onLine);
    }

    private setupSyncListener() {
        syncStorage.setupSyncListener((videoId, data) => {
            this.handleSyncedStatusUpdate(videoId, data);
        });
    }

    private async handleSyncedStatusUpdate(videoId: string, data: VideoSyncData) {
        console.log('handleSyncedStatusUpdate called with videoId:', videoId);
        if (this.isOffline) {
            console.log('Offline, skipping update');
            return;
        }
        
        const videoElement = document.querySelector(
            `${this.SELECTORS.VIDEO_ITEM}[data-video-id="${videoId}"]`
        );
        console.log('Found video element:', videoElement !== null);
    
        if (videoElement instanceof HTMLElement) {
            console.log('About to replace video element');
            await this.replaceWithDeletedVideo(videoElement, {
                videoId: data.videoId,
                title: data.metadata.title,
                channelTitle: data.metadata.channelTitle,
                reason: data.metadata.reason || 'unknown',
                lastAvailable: data.metadata.lastAvailable
            });
            console.log('Replacement complete');
        }
    }

    private async handleConnectionChange(online: boolean) {
        // Only update if we haven't manually set the state
        if (!(this as any).manualStateSet) {
            this.isOffline = !online;
            
            if (!online) {
                this.notifications.warning(
                    'You are offline. Changes will be queued until connection is restored.',
                    { duration: 0 }  // Persist until back online
                );
            } else if (this.operationQueue.length > 0) {
                this.notifications.info(
                    `Processing ${this.operationQueue.length} pending changes...`
                );
                await this.processQueue();
                this.notifications.success('All pending changes have been processed');
            } else {
                this.notifications.success('Connection restored');
            }
        }
    }
    
    public setOfflineState(offline: boolean) {
        this.isOffline = offline;
        (this as any).manualStateSet = true;
    }

    private async processQueue() {
        while (this.operationQueue.length > 0) {
            const operation = this.operationQueue.shift();
            if (!operation) continue;

            try {
                if (operation.type === 'process') {
                    await this.processVideoElement(operation.data);
                } else if (operation.type === 'removal') {
                    await this.handleVideoRemoval(operation.data);
                }
            } catch (error) {
                console.error('Error processing queued operation:', error);
            }
        }
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

            if (this.isOffline) {
                this.operationQueue.push({ type: 'process', data: element });
                return;
            }

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
                // Update sync storage before updating UI
                await syncStorage.updateVideoStatus(videoData.videoId, {
                    videoId: videoData.videoId,
                    status: 'unavailable',
                    timestamp: Date.now(),
                    metadata: {
                        title: videoData.title,
                        channelTitle: videoData.channelTitle,
                        reason: response.data?.reason || 'unknown',
                        lastAvailable: Date.now()
                    }
                });

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
        if (this.isOffline) {
            this.operationQueue.push({ type: 'removal', data: element });
            return;
        }
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
        const durationElement = element.querySelector(this.SELECTORS.DURATION);
        const indexElement = element.querySelector(this.SELECTORS.INDEX);

        if (!titleElement || !channelElement) return null;

        const videoId = this.extractVideoId(titleElement as HTMLAnchorElement);
        if (!videoId) return null;

        return {
            videoId,
            title: titleElement.textContent?.trim() || 'Unknown Title',
            channelTitle: channelElement.textContent?.trim() || 'Unknown Channel',
            thumbnailUrl: (thumbnailElement as HTMLImageElement)?.src,
            duration: durationElement?.textContent?.trim(),
            position: parseInt(indexElement?.textContent?.trim() || '0', 10),
            addedAt: Date.now()
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
            lastAvailable?: number;
        }
    ) {
        const deletedVideo = new DeletedVideoComponent(videoData);
        deletedVideo.mount(element);
    
        const reasonText = this.getReasonText(videoData.reason);
        this.notifications.info(
            `Video "${videoData.title}" is no longer available: ${reasonText}`
        );
    }

    private getReasonText(reason: string): string {
        switch (reason) {
            case 'private':
                return 'Video is now private';
            case 'deleted':
                return 'Video has been removed';
            case 'copyright':
                return 'Video removed due to copyright';
            default:
                return 'Video is unavailable';
        }
    }

    private handleInitializationError() {
        if (this.retryAttempts < this.MAX_RETRIES) {
            this.retryAttempts++;
            if (this.retryAttempts === 1) {
                this.notifications.warning(
                    'Having trouble loading playlist. Retrying...'
                );
            }
            setTimeout(() => this.initialize(), this.RETRY_DELAY);
        } else {
            this.notifications.error(
                'Failed to initialize playlist monitoring. Please refresh the page.',
                {
                    duration: 0,
                    actions: [{
                        label: 'Refresh',
                        onClick: () => window.location.reload()
                    }]
                }
            );
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