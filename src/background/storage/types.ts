// src/background/storage/types.ts

export enum VideoStatus {
    AVAILABLE = 'available',
    UNAVAILABLE = 'unavailable',
    REMOVED = 'removed'
}

export enum RemovalType {
    USER = 'user',
    UPLOADER = 'uploader',
    PRIVATE = 'private',
    UNKNOWN = 'unknown'
}

export enum SyncStatus {
    SUCCESS = 'success',
    FAILURE = 'failure',
    IN_PROGRESS = 'in_progress'
}

export interface VideoData {
    videoId: string;
    title: string;
    channelId: string;
    channelTitle: string;
    thumbnailUrl?: string;
    duration?: string;
    addedAt: number;
    position: number;
    status: {
        current: VideoStatus;
        lastChecked: number;
        history: Array<{
            status: VideoStatus;
            timestamp: number;
            reason?: RemovalType;
        }>;
    };
    metadata: {
        lastAvailable?: number;
        removalType?: RemovalType;
        userRemoved: boolean;
        removedAt?: number;
    };
}

export interface SyncMetadata {
    id: string;
    playlistId: string;
    timestamp: number;
    status: SyncStatus;
    type: 'SCHEDULED' | 'MANUAL' | 'RECOVERY';
    changes: {
        added: number;
        removed: number;
        statusChanged: number;
    };
    error?: string;
    duration: number;
    quotaUsed: number;
}