// src/popup/popup.ts

import { MessageType } from '../common/types/message-types';
import { createMessage } from '../common/utils/message-utils';

export class PopupManager {
    private state = {
        currentPlaylist: null as string | null,
        syncStatus: 'idle' as 'idle' | 'syncing' | 'error',
        error: null as string | null
    };

    constructor() {
        this.initialize();
    }

    private async initialize() {
        await this.loadCurrentState();
        this.setupEventListeners();
        this.render();
    }

    private async loadCurrentState() {
        try {
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

            if (tab?.url?.includes('youtube.com/playlist')) {
                await this.detectPlaylistContext(tab);
            }
        } catch (error) {
            console.error('Error loading popup state:', error);
            this.state.error = 'Failed to load current state';
        }
    }

    private async detectPlaylistContext(tab: chrome.tabs.Tab) {
        const url = new URL(tab.url!);
        const playlistId = url.searchParams.get('list');

        if (playlistId) {
            this.state.currentPlaylist = playlistId;
            await this.loadPlaylistStatus(playlistId);
        }
    }

    private async loadPlaylistStatus(playlistId: string) {
        try {
            const { syncMetadata } = await chrome.storage.local.get('syncMetadata');
            const status = syncMetadata?.[playlistId];

            if (status) {
                this.state.syncStatus = status.status;
                if (status.error) {
                    this.state.error = status.error;
                }
            }
        } catch (error) {
            console.error('Error loading playlist status:', error);
            this.state.error = 'Failed to load playlist status';
        }
    }

    private setupEventListeners() {
        // Sync button
        document.getElementById('sync-button')?.addEventListener('click', () => {
            this.handleSync();
        });

        // Settings button
        document.getElementById('settings-button')?.addEventListener('click', () => {
            this.openSettings();
        });

        // Clear error button
        document.getElementById('clear-error')?.addEventListener('click', () => {
            this.clearError();
        });
    }

    private async handleSync() {
        if (!this.state.currentPlaylist || this.state.syncStatus === 'syncing') {
            return;
        }

        try {
            this.state.syncStatus = 'syncing';
            this.render();

            const message = createMessage(MessageType.SYNC_REQUEST, {
                playlistId: this.state.currentPlaylist,
                force: true
            });

            const response = await chrome.runtime.sendMessage(message);

            if (!response.success) {
                throw new Error(response.error || 'Sync failed');
            }
        } catch (error) {
            console.error('Sync error:', error);
            this.state.syncStatus = 'error';
            this.state.error = error instanceof Error ? error.message : 'Unknown error';
        }

        this.render();
    }

    private clearError() {
        this.state.error = null;
        this.render();
    }

    private openSettings() {
        chrome.runtime.openOptionsPage();
    }

    private render() {
        // Playlist status section
        const statusElement = document.getElementById('playlist-status');
        if (statusElement) {
            if (this.state.currentPlaylist) {
                statusElement.textContent = `Monitoring playlist: ${this.state.currentPlaylist}`;
                statusElement.classList.remove('hidden');
            } else {
                statusElement.classList.add('hidden');
            }
        }

        // Sync button
        const syncButton = document.getElementById('sync-button') as HTMLButtonElement;
        if (syncButton) {
            syncButton.disabled = !this.state.currentPlaylist || this.state.syncStatus === 'syncing';
            syncButton.textContent = this.state.syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now';
        }

        // Error display
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            if (this.state.error) {
                errorElement.textContent = this.state.error;
                errorElement.classList.remove('hidden');
            } else {
                errorElement.classList.add('hidden');
            }
        }
    }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});