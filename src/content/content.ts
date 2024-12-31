// src/content/content.ts

import { PlaylistObserver } from './observers/playlist';
import { NotificationManager } from './ui/notifications/notification-manager';
import { ErrorStatusHandler } from './handlers/error-status-handler';

class ContentScript {
    private observer: PlaylistObserver | null = null;
    private notificationManager: NotificationManager;
    private errorHandler: ErrorStatusHandler;

    constructor() {
        this.notificationManager = NotificationManager.getInstance();
        this.errorHandler = new ErrorStatusHandler();
        this.initialize();
        this.setupNavigationHandlers();
    }

    private initialize() {
        // Initialize error handler (needs to be active regardless of page type)
        this.errorHandler.initialize();

        // Initialize observer when on a playlist page
        if (this.isPlaylistPage()) {
            this.setupPlaylistObserver();
        }
    }

    private isPlaylistPage(): boolean {
        const url = new URL(window.location.href);
        return url.pathname === '/playlist' && !!url.searchParams.get('list');
    }

    private setupPlaylistObserver() {
        if (this.observer) {
            this.observer.cleanup();
        }
        this.observer = new PlaylistObserver();
    }

    private setupNavigationHandlers() {
        // Handle YouTube's navigation events
        window.addEventListener('yt-navigate-finish', () => {
            if (this.isPlaylistPage()) {
                this.setupPlaylistObserver();
            } else if (this.observer) {
                this.observer.cleanup();
                this.observer = null;
            }
        });

        // Handle regular navigation events
        window.addEventListener('popstate', () => {
            if (this.isPlaylistPage()) {
                this.setupPlaylistObserver();
            } else if (this.observer) {
                this.observer.cleanup();
                this.observer = null;
            }
        });
    }
}

// Initialize content script
const contentScript = new ContentScript();