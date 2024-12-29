// src/content/ui/notifications/notification.ts

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

interface NotificationConfig {
    id: string;
    type: NotificationType;
    message: string;
    duration?: number;
    actions?: Array<{
        label: string;
        onClick: () => void;
    }>;
}

const NOTIFICATION_STYLES = {
    success: {
        icon: `<svg viewBox="0 0 24 24" class="notification-icon">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
        </svg>`,
        color: 'bg-green-500',
        textColor: 'text-white'
    },
    warning: {
        icon: `<svg viewBox="0 0 24 24" class="notification-icon">
            <path d="M12 2L1 21h22L12 2zm0 3.45l8.27 14.3H3.73L12 5.45zm-1.11 8.05h2.22v2.22h-2.22v-2.22zm0-4.44h2.22v3.33h-2.22V9.06z" fill="currentColor"/>
        </svg>`,
        color: 'bg-yellow-500',
        textColor: 'text-white'
    },
    error: {
        icon: `<svg viewBox="0 0 24 24" class="notification-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
        </svg>`,
        color: 'bg-red-500',
        textColor: 'text-white'
    },
    info: {
        icon: `<svg viewBox="0 0 24 24" class="notification-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>
        </svg>`,
        color: 'bg-blue-500',
        textColor: 'text-white'
    }
};

const DEFAULT_DURATIONS = {
    success: 3000,
    warning: 5000,
    error: 7000,
    info: 4000
};

export class NotificationComponent {
    private element: HTMLElement;
    private timeoutId?: number;

    constructor(private config: NotificationConfig) {
        this.element = this.createNotificationElement();
        this.setupAutoHide();
    }

    private createNotificationElement(): HTMLElement {
        const styles = NOTIFICATION_STYLES[this.config.type];
        const container = document.createElement('div');
        
        container.id = this.config.id;
        container.className = `notification-item ${styles.color} ${styles.textColor} rounded-lg shadow-lg p-4 mb-2 flex items-center justify-between max-w-sm animate-slide-in`;
        
        container.innerHTML = `
            <div class="flex items-center">
                <div class="notification-icon-container w-6 h-6 mr-3">
                    ${styles.icon}
                </div>
                <span class="notification-message">${this.config.message}</span>
            </div>
            ${this.createActionsHTML()}
            <button class="ml-4 text-white opacity-75 hover:opacity-100 close-button" aria-label="Close">
                <svg viewBox="0 0 24 24" class="w-5 h-5">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/>
                </svg>
            </button>
        `;

        this.setupEventListeners(container);
        return container;
    }

    private createActionsHTML(): string {
        if (!this.config.actions?.length) return '';

        return `
            <div class="notification-actions flex gap-2 ml-4">
                ${this.config.actions.map(action => `
                    <button class="notification-action px-3 py-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors">
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    private setupEventListeners(container: HTMLElement): void {
        // Close button
        const closeButton = container.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.close());
        }

        // Action buttons
        if (this.config.actions) {
            const actionButtons = container.querySelectorAll('.notification-action');
            actionButtons.forEach((button, index) => {
                button.addEventListener('click', () => {
                    this.config.actions?.[index].onClick();
                });
            });
        }

        // Pause auto-hide on hover
        container.addEventListener('mouseenter', () => this.pauseAutoHide());
        container.addEventListener('mouseleave', () => this.setupAutoHide());
    }

    private setupAutoHide(): void {
        if (this.timeoutId) {
            window.clearTimeout(this.timeoutId);
        }

        if (this.config.duration !== 0) { // 0 means don't auto-hide
            const duration = this.config.duration || DEFAULT_DURATIONS[this.config.type];
            this.timeoutId = window.setTimeout(() => this.close(), duration);
        }
    }

    private pauseAutoHide(): void {
        if (this.timeoutId) {
            window.clearTimeout(this.timeoutId);
        }
    }

    close(): void {
        this.element.classList.add('animate-slide-out');
        this.element.addEventListener('animationend', () => {
            this.element.remove();
            this.element.dispatchEvent(new CustomEvent('notification:closed', {
                detail: { id: this.config.id }
            }));
        });
    }

    mount(container: HTMLElement): void {
        container.appendChild(this.element);
    }
}