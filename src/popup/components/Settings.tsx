// src/popup/components/settings.tsx
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Button from './common/Button';
import Toggle from './common/Toggle';
import { MessageType, SettingKey } from '../../common/types/message-types';
import { createMessage } from '../../common/utils/message-utils';

interface SettingsProps {
    onClose: () => void;
}

const Settings = ({ onClose }: SettingsProps) => {
    const [settings, setSettings] = useState<SettingKey>({
        defaultPlaylistBehavior: 'ask_always',
        syncFrequency: 'hourly',
        notifications: {
            videoStatus: true,
            syncStatus: true,
            storage: true
        }
    });
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const message = createMessage(MessageType.SETTINGS_GET, {});
            const response = await chrome.runtime.sendMessage(message);
            
            if (response.success && response.data) {
                setSettings(response.data);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async <K extends keyof SettingKey>(
        key: K,
        value: SettingKey[K]
    ) => {
        try {
            const message = createMessage(MessageType.SETTINGS_UPDATE, { 
                key: String(key) as keyof SettingKey,
                value: value 
            });
            const response = await chrome.runtime.sendMessage(message);
            
            if (response.success) {
                setSettings((prev: SettingKey) => ({
                    ...prev,
                    [String(key)]: value
                }));
            }
        } catch (error) {
            console.error(`Failed to update ${String(key)}:`, error);
        }
    };

    const updateNotification = (key: keyof SettingKey['notifications'], value: boolean) => {
        const newNotifications = {
            ...settings.notifications,
            [key]: value
        };
        updateSetting('notifications', newNotifications);
    };

    if (loading) {
        return (
            <div className="p-4 text-center text-gray-500">
                Loading settings...
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg w-96 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Settings</h2>
                    <Button
                        variant="icon"
                        onClick={onClose}
                        aria-label="Close settings"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Playlist Behavior */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900">Playlist Monitoring</h3>
                        <div className="space-y-2">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="playlistBehavior"
                                    checked={settings.defaultPlaylistBehavior === 'ask_always'}
                                    onChange={() => updateSetting('defaultPlaylistBehavior', 'ask_always')}
                                    className="text-red-600 focus:ring-red-500"
                                />
                                <span className="text-gray-700">Ask before monitoring</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="playlistBehavior"
                                    checked={settings.defaultPlaylistBehavior === 'manual_only'}
                                    onChange={() => updateSetting('defaultPlaylistBehavior', 'manual_only')}
                                    className="text-red-600 focus:ring-red-500"
                                />
                                <span className="text-gray-700">Manual activation only</span>
                            </label>
                        </div>
                    </div>

                    {/* Sync Frequency */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900">Sync Frequency</h3>
                        <div className="space-y-2">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="syncFrequency"
                                    checked={settings.syncFrequency === 'hourly'}
                                    onChange={() => updateSetting('syncFrequency', 'hourly')}
                                    className="text-red-600 focus:ring-red-500"
                                />
                                <span className="text-gray-700">Every hour</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="syncFrequency"
                                    checked={settings.syncFrequency === 'daily'}
                                    onChange={() => updateSetting('syncFrequency', 'daily')}
                                    className="text-red-600 focus:ring-red-500"
                                />
                                <span className="text-gray-700">Once per day</span>
                            </label>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900">Notifications</h3>
                        <div className="space-y-4">
                            <Toggle
                                label="Video status changes"
                                checked={settings.notifications.videoStatus}
                                onChange={(checked) => updateNotification('videoStatus', checked)}
                            />
                            <Toggle
                                label="Sync status updates"
                                checked={settings.notifications.syncStatus}
                                onChange={(checked) => updateNotification('syncStatus', checked)}
                            />
                            <Toggle
                                label="Storage alerts"
                                checked={settings.notifications.storage}
                                onChange={(checked) => updateNotification('storage', checked)}
                                disabled={true}
                                className="opacity-50"
                            />
                            <p className="text-sm text-gray-500">
                                Storage alerts cannot be disabled for system reliability
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-end">
                    <Button onClick={onClose}>
                        Done
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Settings;