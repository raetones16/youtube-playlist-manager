// src/background/background.ts

import { storageManager } from './storage';
import { youtubeAPI } from './api/youtube';
import { messageBus } from './message-bus';
import { MessageType } from '../common/types/message-types';
import { VideoStatus, RemovalType } from './storage/types';

class BackgroundWorker {
    private initialized = false;

    constructor() {
        this.initialize();
    }

    private async initialize() {
        try {
            // Initialize core services
            await storageManager.initialize();
            await this.setupMessageHandlers();
            this.setupAlarms();
            
            // Mark as initialized
            this.initialized = true;
            console.log('Background worker initialized successfully');
        } catch (error) {
            console.error('Failed to initialize background worker:', error);
            // We'll implement proper error reporting later
        }
    }

    private async setupMessageHandlers() {
        // Handle sync requests
        messageBus.register(
            MessageType.SYNC_REQUEST,
            async (payload) => {
                try {
                    const { playlistId, force } = payload;
                    // Get playlist details from YouTube
                    const details = await youtubeAPI.getPlaylistDetails(playlistId);
                    
                    // Start sync process
                    await this.syncPlaylist(playlistId, details.itemCount, force);
                    
                    return { success: true };
                } catch (error) {
                    console.error('Sync request failed:', error);
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : 'Sync failed'
                    };
                }
            }
        );

        // Handle video added events
        messageBus.register(
            MessageType.VIDEO_ADDED,
            async (payload) => {
                try {
                    const { videoId, playlistId } = payload;
                    const [videoDetails] = await youtubeAPI.getVideoDetails([videoId]);
                    await storageManager.addVideo(videoDetails, playlistId);
                    return { success: true };
                } catch (error) {
                    console.error('Failed to handle added video:', error);
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : 'Failed to add video'
                    };
                }
            }
        );

        // Handle video removed events
        messageBus.register(
            MessageType.VIDEO_REMOVED,
            async (payload) => {
                try {
                    const { videoId, playlistId, userInitiated } = payload;
                    await storageManager.updateVideoStatus(
                        videoId,
                        playlistId,
                        userInitiated ? VideoStatus.REMOVED : VideoStatus.UNAVAILABLE,
                        userInitiated ? RemovalType.USER : RemovalType.UNKNOWN
                    );
                    return { success: true };
                } catch (error) {
                    console.error('Failed to handle removed video:', error);
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : 'Failed to update video status'
                    };
                }
            }
        );

        // Handle video availability verification
        messageBus.register(
            MessageType.VERIFY_VIDEO_AVAILABILITY,
            async (payload) => {
                try {
                    const { videoId } = payload;
                    const [videoDetails] = await youtubeAPI.getVideoDetails([videoId]);
                    return { 
                        success: true,
                        data: { available: !!videoDetails }
                    };
                } catch (error) {
                    return {
                        success: true,
                        data: { available: false }
                    };
                }
            }
        );
    }

    private setupAlarms() {
        // Set up periodic sync
        chrome.alarms.create('periodicSync', {
            periodInMinutes: 60 // Sync every hour
        });

        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'periodicSync') {
                this.handlePeriodicSync();
            }
        });
    }

    private async syncPlaylist(
        playlistId: string,
        totalItems: number,
        force: boolean
    ) {
        let pageToken: string | undefined;
        const processedItems = new Set<string>();

        do {
            const response = await youtubeAPI.getPlaylistItems(playlistId, pageToken);
            
            for (const video of response.items) {
                processedItems.add(video.videoId);
                // Store or update video information
                await storageManager.addVideo(video, playlistId);
            }

            pageToken = response.nextPageToken;

            // Update sync progress
            await messageBus.send({
                type: MessageType.SYNC_STATUS,
                payload: {
                    playlistId,
                    status: 'syncing',
                    progress: (processedItems.size / totalItems) * 100
                }
            });

        } while (pageToken);

        // Final status update
        await messageBus.send({
            type: MessageType.SYNC_STATUS,
            payload: {
                playlistId,
                status: 'success',
                progress: 100
            }
        });
    }

    private async handlePeriodicSync() {
        // Get all monitored playlists and sync them
        const { monitoredPlaylists = [] } = await chrome.storage.local.get('monitoredPlaylists');
        
        for (const playlistId of monitoredPlaylists) {
            try {
                const details = await youtubeAPI.getPlaylistDetails(playlistId);
                await this.syncPlaylist(playlistId, details.itemCount, false);
            } catch (error) {
                console.error(`Failed to sync playlist ${playlistId}:`, error);
            }
        }
    }
}

// Initialize the background worker
const worker = new BackgroundWorker();