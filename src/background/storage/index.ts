// src/background/storage/index.ts

import { 
    VideoStatus, 
    RemovalType, 
    VideoData,
    SyncMetadata } from './types';

export class StorageManager {
    private db: IDBDatabase | null = null;
    private readonly DB_NAME = 'YouTubePlaylistManager';
    private readonly VERSION = 1;

    private static instance: StorageManager;

    private constructor() {}

    static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.VERSION);

            request.onerror = () => {
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                this.createStores(db);
            };
        });
    }

    private createStores(db: IDBDatabase): void {
        // Playlists store
        if (!db.objectStoreNames.contains('playlists')) {
            const playlistStore = db.createObjectStore('playlists', { keyPath: 'playlistId' });
            playlistStore.createIndex('title', 'title', { unique: false });
            playlistStore.createIndex('lastSynced', 'lastSynced', { unique: false });
            playlistStore.createIndex('status', 'status', { unique: false });
        }

        // Videos store
        if (!db.objectStoreNames.contains('videos')) {
            const videoStore = db.createObjectStore('videos', { keyPath: ['videoId', 'playlistId'] });
            videoStore.createIndex('playlistId', 'playlistId', { unique: false });
            videoStore.createIndex('status', 'status.current', { unique: false });
            videoStore.createIndex('addedAt', 'addedAt', { unique: false });
            videoStore.createIndex('lastChecked', 'status.lastChecked', { unique: false });
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains('syncMetadata')) {
            const syncStore = db.createObjectStore('syncMetadata', { keyPath: 'id' });
            syncStore.createIndex('playlistId', 'playlistId', { unique: false });
            syncStore.createIndex('timestamp', 'timestamp', { unique: false });
            syncStore.createIndex('status', 'status', { unique: false });
        }

        // User settings store
        if (!db.objectStoreNames.contains('userSettings')) {
            db.createObjectStore('userSettings', { keyPath: 'id' });
        }

        // Audit log store
        if (!db.objectStoreNames.contains('auditLog')) {
            const auditStore = db.createObjectStore('auditLog', { keyPath: 'id' });
            auditStore.createIndex('timestamp', 'timestamp', { unique: false });
            auditStore.createIndex('type', 'type', { unique: false });
            auditStore.createIndex('playlistId', 'playlistId', { unique: false });
        }
    }

    async addVideo(video: VideoData, playlistId: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const transaction = this.db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');

        return new Promise((resolve, reject) => {
            const request = store.add({
                ...video,
                playlistId,
                status: {
                    current: VideoStatus.AVAILABLE,
                    lastChecked: Date.now(),
                    history: []
                },
                metadata: {
                    lastAvailable: Date.now(),
                    userRemoved: false
                }
            });

            request.onerror = () => reject(new Error('Failed to add video'));
            request.onsuccess = () => resolve();
        });
    }

    async updateVideoStatus(
        videoId: string,
        playlistId: string,
        status: VideoStatus,
        reason?: RemovalType
    ): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const transaction = this.db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');

        return new Promise((resolve, reject) => {
            const getRequest = store.get([videoId, playlistId]);

            getRequest.onerror = () => reject(new Error('Failed to fetch video'));
            getRequest.onsuccess = () => {
                const video = getRequest.result;
                if (!video) {
                    reject(new Error('Video not found'));
                    return;
                }

                // Update status
                video.status.current = status;
                video.status.lastChecked = Date.now();
                video.status.history.push({
                    status,
                    timestamp: Date.now(),
                    reason
                });

                // Update metadata
                if (status === VideoStatus.UNAVAILABLE) {
                    video.metadata.removedAt = Date.now();
                    video.metadata.removalType = reason;
                }

                const updateRequest = store.put(video);
                updateRequest.onerror = () => reject(new Error('Failed to update video'));
                updateRequest.onsuccess = () => resolve();
            };
        });
    }

    async removeVideo(videoId: string, playlistId: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
    
        const transaction = this.db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');
    
        return new Promise((resolve, reject) => {
            const request = store.delete([videoId, playlistId]);
            request.onerror = () => reject(new Error('Failed to remove video'));
            request.onsuccess = () => resolve();
        });
    }

    async getPlaylistVideos(playlistId: string): Promise<VideoData[]> {
        if (!this.db) throw new Error('Database not initialized');

        const transaction = this.db.transaction(['videos'], 'readonly');
        const store = transaction.objectStore('videos');
        const index = store.index('playlistId');

        return new Promise((resolve, reject) => {
            const request = index.getAll(playlistId);
            request.onerror = () => reject(new Error('Failed to fetch playlist videos'));
            request.onsuccess = () => resolve(request.result);
        });
    }

    async addSyncMetadata(metadata: SyncMetadata): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const transaction = this.db.transaction(['syncMetadata'], 'readwrite');
        const store = transaction.objectStore('syncMetadata');

        return new Promise((resolve, reject) => {
            const request = store.add(metadata);
            request.onerror = () => reject(new Error('Failed to add sync metadata'));
            request.onsuccess = () => resolve();
        });
    }
}

export const storageManager = StorageManager.getInstance();