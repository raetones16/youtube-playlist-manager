// src/content/ui/notifications/notification-manager.ts

import { NotificationComponent, NotificationType } from './notification';

interface NotificationOptions {
    type: NotificationType;
    message: string;
    duration?: number;
    actions?: Array<{
        label: string;
        onClick: () => void;
    }>;
}

export class NotificationManager {
    private static instance: NotificationManager;
    private container: HTMLElement;
    private notifications: Set<string> = new Set();
    private queue: NotificationOptions[] = [];
    private readonly MAX_VISIBLE = 3;

    private constructor() {
        this.container = this.createContainer();
        this.setupStyles();
    }

    public static getInstance(): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager.instance;
    }

    private createContainer(): HTMLElement {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed bottom-4 right-4 z-50 flex flex-col items-end';
        document.body.appendChild(container);
        return container;
    }

    private setupStyles(): void {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            #notification-container {
                pointer-events: none;
            }
            #notification-container > * {
                pointer-events: auto;
            }
            .notification-item {
                width: 100%;
                max-width: 24rem;
                margin-top: 0.5rem;
            }
        `;
        document.head.appendChild(styleSheet);
    }

    show(options: NotificationOptions): string {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        if (this.notifications.size >= this.MAX_VISIBLE) {
            this.queue.push(options);
            return id;
        }

        this.createNotification(id, options);
        return id;
    }

    private createNotification(id: string, options: NotificationOptions): void {
        const notification = new NotificationComponent({
            id,
            ...options
        });

        this.notifications.add(id);
        notification.mount(this.container);

        this.container.addEventListener('notification:closed', ((event: CustomEvent) => {
            if (event.detail.id === id) {
                this.notifications.delete(id);
                this.processQueue();
            }
        }) as EventListener);
    }

    private processQueue(): void {
        if (this.queue.length > 0 && this.notifications.size < this.MAX_VISIBLE) {
            const options = this.queue.shift();
            if (options) {
                const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                this.createNotification(id, options);
            }
        }
    }

    // Helper methods for common notifications
    success(message: string, options: Partial<NotificationOptions> = {}): string {
        return this.show({ type: 'success', message, ...options });
    }

    warning(message: string, options: Partial<NotificationOptions> = {}): string {
        return this.show({ type: 'warning', message, ...options });
    }

    error(message: string, options: Partial<NotificationOptions> = {}): string {
        return this.show({ type: 'error', message, ...options });
    }

    info(message: string, options: Partial<NotificationOptions> = {}): string {
        return this.show({ type: 'info', message, ...options });
    }
}