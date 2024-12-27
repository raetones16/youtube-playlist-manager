// src/common/utils/sync-storage.ts

export interface VideoSyncData {
    videoId: string;
    status: string;
    timestamp: number;
    metadata: {
        title: string;
        channelTitle: string;
        reason?: string;
        lastAvailable?: number;
    };
}

export const syncStorage = {
    async updateVideoStatus(videoId: string, data: VideoSyncData): Promise<void> {
        try {
            // Store in chrome.storage.sync with videoId as key
            await chrome.storage.sync.set({
                [videoId]: data
            });
        } catch (error) {
            console.error('Failed to sync video status:', error);
        }
    },

    // Listen for changes from other devices
    setupSyncListener(callback: (videoId: string, data: VideoSyncData) => void) {
        chrome.storage.sync.onChanged.addListener((changes) => {
            for (const [videoId, change] of Object.entries(changes)) {
                callback(videoId, change.newValue);
            }
        });
    }
};