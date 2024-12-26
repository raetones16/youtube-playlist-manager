// tests/unit/popup/popup.test.ts

import { chrome } from '../../setup';
import { MessageType } from '../../../src/common/types/message-types';
import { PopupManager } from '../../../src/popup/popup';

// Mock specific chrome APIs needed for the popup
const mockChrome = {
    ...chrome,
    tabs: {
        query: jest.fn()
    },
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn()
        }
    }
};

// Replace the global chrome object for this test
(global as any).chrome = mockChrome;

describe('PopupManager', () => {
    beforeEach(() => {
        // Set up DOM
        document.body.innerHTML = `
            <div id="playlist-status" class="hidden"></div>
            <button id="sync-button">Sync Now</button>
            <div id="error-message" class="hidden"></div>
        `;

        // Reset mocks
        jest.clearAllMocks();

        // Mock chrome.tabs.query to return a YouTube playlist page
        mockChrome.tabs.query.mockImplementation(() =>
            Promise.resolve([{
                id: 1,
                url: 'https://www.youtube.com/playlist?list=test-playlist-id'
            }])
        );

        // Mock chrome.storage.local.get
        mockChrome.storage.local.get.mockImplementation(() =>
            Promise.resolve({ syncMetadata: {} })
        );

        // Mock runtime.sendMessage
        mockChrome.runtime.sendMessage.mockImplementation(() => 
            Promise.resolve({ success: true })
        );
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.resetModules();
    });

    it('initializes and detects current playlist', async () => {
        // Create instance directly instead of using DOMContentLoaded
        const manager = new PopupManager();
        
        // Wait for async initialization
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if playlist status is shown
        const statusElement = document.getElementById('playlist-status');
        console.log('Status element content:', statusElement?.textContent);
        console.log('Status element classList:', statusElement?.classList);
        
        expect(statusElement?.textContent).toContain('test-playlist-id');
        expect(statusElement?.classList.contains('hidden')).toBe(false);
        
        // Sync button should be enabled
        const syncButton = document.getElementById('sync-button') as HTMLButtonElement;
        expect(syncButton.disabled).toBe(false);
    });

    it('handles sync button click', async () => {
        // Create instance directly
        const manager = new PopupManager();

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 100));

        // Click sync button
        const syncButton = document.getElementById('sync-button') as HTMLButtonElement;
        syncButton.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify sync message was sent
        expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: MessageType.SYNC_REQUEST,
                payload: expect.objectContaining({
                    playlistId: 'test-playlist-id'
                })
            })
        );

        // Button should be disabled during sync
        expect(syncButton.disabled).toBe(true);
    });
});