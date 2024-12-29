// src/popup/components/popup.tsx
import React, { useEffect, useState } from 'react';
import Header from './Header';
import PlaylistStatus from './PlaylistStatus';
import Settings from './Settings';
import { MessageType } from '../../common/types/message-types';
import { createMessage } from '../../common/utils/message-utils';

interface PopupState {
    currentPlaylist: string | null;
    syncStatus: 'idle' | 'syncing' | 'error';
    error: string | null;
    showSettings: boolean;
}

const Popup = () => {
    const [state, setState] = useState<PopupState>({
        currentPlaylist: null,
        syncStatus: 'idle',
        error: null,
        showSettings: false
    });

    useEffect(() => {
        loadCurrentState();
    }, []);

    const loadCurrentState = async () => {
        try {
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

            if (tab?.url?.includes('youtube.com/playlist')) {
                const url = new URL(tab.url);
                const playlistId = url.searchParams.get('list');

                if (playlistId) {
                    setState(prev => ({ ...prev, currentPlaylist: playlistId }));
                    await loadPlaylistStatus(playlistId);
                }
            }
        } catch (error) {
            console.error('Error loading popup state:', error);
            setState(prev => ({
                ...prev,
                error: 'Failed to load current state'
            }));
        }
    };

    const loadPlaylistStatus = async (playlistId: string) => {
        try {
            const { syncMetadata } = await chrome.storage.local.get('syncMetadata');
            const status = syncMetadata?.[playlistId];

            if (status) {
                setState(prev => ({
                    ...prev,
                    syncStatus: status.status,
                    error: status.error || null
                }));
            }
        } catch (error) {
            console.error('Error loading playlist status:', error);
            setState(prev => ({
                ...prev,
                error: 'Failed to load playlist status'
            }));
        }
    };

    const handleSync = async () => {
        if (!state.currentPlaylist || state.syncStatus === 'syncing') {
            return;
        }

        try {
            setState(prev => ({ ...prev, syncStatus: 'syncing', error: null }));

            const message = createMessage(MessageType.SYNC_REQUEST, {
                playlistId: state.currentPlaylist,
                force: true
            });

            const response = await chrome.runtime.sendMessage(message);

            if (!response.success) {
                throw new Error(response.error || 'Sync failed');
            }
        } catch (error) {
            console.error('Sync error:', error);
            setState(prev => ({
                ...prev,
                syncStatus: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            }));
        }
    };

    const clearError = () => {
        setState(prev => ({ ...prev, error: null }));
    };

    const toggleSettings = () => {
        setState(prev => ({ ...prev, showSettings: !prev.showSettings }));
    };

    return (
        <div className="w-[350px] min-h-[400px] max-h-[600px] flex flex-col bg-white">
            <Header onSettingsClick={toggleSettings} />
            
            <main className="flex-1 p-4 overflow-y-auto">
                <PlaylistStatus
                    playlistId={state.currentPlaylist}
                    syncStatus={state.syncStatus}
                    error={state.error}
                    onSyncClick={handleSync}
                    onErrorClear={clearError}
                />
            </main>

            <footer className="p-4 border-t border-gray-200 text-center text-sm text-gray-500">
                {state.currentPlaylist ? 
                    'Click Sync Now to update playlist data' : 
                    'Open a YouTube playlist to begin'
                }
            </footer>

            {state.showSettings && (
                <Settings onClose={toggleSettings} />
            )}
        </div>
    );
};

export default Popup;