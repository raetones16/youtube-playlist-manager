// src/background/storage/cleanup-manager.ts

import { logger } from '../../common/utils/debug-logger';
import { storageManager } from './index';

export class CleanupManager {
    private static instance: CleanupManager;

    private constructor() {}

    static getInstance(): CleanupManager {
        if (!CleanupManager.instance) {
            CleanupManager.instance = new CleanupManager();
        }
        return CleanupManager.instance;
    }

    async cleanAuditLogs(before: number): Promise<number> {
        const db = await this.getDatabase();
        const transaction = db.transaction(['auditLog'], 'readwrite');
        const store = transaction.objectStore('auditLog');
        const index = store.index('timestamp');

        return new Promise((resolve, reject) => {
            const range = IDBKeyRange.upperBound(before);
            const request = index.count(range);
            
            request.onsuccess = async () => {
                const count = request.result;
                if (count > 0) {
                    try {
                        await this.deleteRecords(store, index, range);
                        logger.info('CleanupManager', 'audit logs cleaned', { count });
                        resolve(count);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    resolve(0);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    async cleanSyncMetadata(before: number): Promise<number> {
        const db = await this.getDatabase();
        const transaction = db.transaction(['syncMetadata'], 'readwrite');
        const store = transaction.objectStore('syncMetadata');
        const index = store.index('timestamp');

        return new Promise((resolve, reject) => {
            const range = IDBKeyRange.upperBound(before);
            const request = index.count(range);
            
            request.onsuccess = async () => {
                const count = request.result;
                if (count > 0) {
                    try {
                        await this.deleteRecords(store, index, range);
                        logger.info('CleanupManager', 'sync metadata cleaned', { count });
                        resolve(count);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    resolve(0);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    private async deleteRecords(
        store: IDBObjectStore,
        index: IDBIndex,
        range: IDBKeyRange
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const cursorRequest = index.openCursor(range);
            
            cursorRequest.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    try {
                        cursor.delete();
                        cursor.continue();
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    resolve();
                }
            };
            
            cursorRequest.onerror = () => reject(cursorRequest.error);
        });
    }

    private async getDatabase(): Promise<IDBDatabase> {
        // This is a temporary solution - we should properly access the database
        // through the storage manager in a real implementation
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('YouTubePlaylistManager', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async estimateStoreSize(storeName: string): Promise<number> {
        const db = await this.getDatabase();
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

export const cleanupManager = CleanupManager.getInstance();