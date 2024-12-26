// src/common/types/message-types.ts

export enum MessageType {
    // Content Script -> Background
    VIDEO_ADDED = 'VIDEO_ADDED',
    VIDEO_REMOVED = 'VIDEO_REMOVED',
    SYNC_REQUEST = 'SYNC_REQUEST',

    // Background -> Content Script
    UPDATE_UI = 'UPDATE_UI',
    SYNC_STATUS = 'SYNC_STATUS',
    SHOW_VIDEO_DETAILS = 'SHOW_VIDEO_DETAILS',

    // Video Status Messages
    VERIFY_VIDEO_AVAILABILITY = 'VERIFY_VIDEO_AVAILABILITY',
    VIDEO_UNAVAILABLE = 'VIDEO_UNAVAILABLE',
    VIDEO_STATUS_UPDATED = 'VIDEO_STATUS_UPDATED'
}

export interface MessagePayload {
    [MessageType.VIDEO_ADDED]: {
        videoId: string;
        playlistId: string;
        timestamp: number;
    };
    [MessageType.VIDEO_REMOVED]: {
        videoId: string;
        playlistId: string;
        userInitiated: boolean;
        timestamp: number;
    };
    [MessageType.SYNC_REQUEST]: {
        playlistId: string;
        force: boolean;
    };
    [MessageType.UPDATE_UI]: {
        updates: Array<{
            videoId: string;
            status: string;
            metadata: Record<string, any>;
        }>;
    };
    [MessageType.SYNC_STATUS]: {
        playlistId: string;
        status: string;
        progress: number;
        error?: string;
    };
    [MessageType.SHOW_VIDEO_DETAILS]: {
        videoId: string;
    };
    [MessageType.VERIFY_VIDEO_AVAILABILITY]: {
        videoId: string;
        initialCheck: VideoUnavailabilityData;
    };
    [MessageType.VIDEO_UNAVAILABLE]: {
        videoId: string;
        reason: string;
    };
    [MessageType.VIDEO_STATUS_UPDATED]: {
        videoId: string;
        status: string;
        reason: string;
    };
}

export interface Message<T extends MessageType> {
    type: T;
    payload: MessagePayload[T];
}

export interface VideoUnavailabilityData {
    timestamp: number;
    reason: string;
    metadata?: Record<string, any>;
}

export type MessageHandler<T extends MessageType> = (
    message: Message<T>['payload'],
    sender: chrome.runtime.MessageSender
) => Promise<any>;

export type MessageResponse<T extends MessageType> = {
    success: boolean;
    error?: string;
    data?: any;
};