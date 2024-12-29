// src/popup/components/playliststatus.tsx
import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import Button from './common/Button';
import { MessageType } from '../../common/types/message-types';

interface PlaylistStatusProps {
    playlistId: string | null;
    syncStatus: 'idle' | 'syncing' | 'error';
    error: string | null;
    onSyncClick: () => void;
    onErrorClear: () => void;
}

const PlaylistStatus = ({
    playlistId,
    syncStatus,
    error,
    onSyncClick,
    onErrorClear
}: PlaylistStatusProps) => {
    if (!playlistId) {
        return (
            <div className="p-4 text-center text-gray-500">
                No playlist detected. Open a YouTube playlist to begin.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Playlist Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">
                    Monitoring playlist: {playlistId}
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center justify-between p-4 bg-red-50 text-red-700 rounded-lg">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={onErrorClear}
                        className="text-red-700 hover:text-red-800"
                        aria-label="Clear error"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Sync Button */}
            <div className="flex justify-center">
                <Button
                    onClick={onSyncClick}
                    disabled={syncStatus === 'syncing'}
                    className="w-full"
                >
                    {syncStatus === 'syncing' ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Syncing...
                        </span>
                    ) : (
                        'Sync Now'
                    )}
                </Button>
            </div>

            {/* Sync Status */}
            <div className="text-center text-sm text-gray-500">
                {syncStatus === 'syncing' ? (
                    'Synchronizing playlist data...'
                ) : syncStatus === 'error' ? (
                    'Last sync attempt failed'
                ) : (
                    'Ready to sync'
                )}
            </div>
        </div>
    );
};

export default PlaylistStatus;