// src/popup/components/header.tsx
import React from 'react';
import Button from './common/Button';
import { Settings } from 'lucide-react';

interface HeaderProps {
    onSettingsClick: () => void;
}

const Header = ({ onSettingsClick }: HeaderProps) => {
    return (
        <header className="flex items-center justify-between p-4 border-b border-gray-200">
            <h1 className="text-lg font-medium text-gray-900">
                YouTube Playlist Manager
            </h1>
            <Button
                variant="icon"
                onClick={onSettingsClick}
                aria-label="Settings"
            >
                <Settings className="w-5 h-5 text-gray-600" />
            </Button>
        </header>
    );
};

export default Header;