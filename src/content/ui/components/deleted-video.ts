// src/content/ui/components/deleted-video.ts

export class DeletedVideoComponent {
    private readonly container: HTMLElement;
    
    constructor(private videoData: {
        videoId: string;
        title: string;
        channelTitle: string;
        thumbnailUrl?: string;
        reason: string;
        lastAvailable?: number;
    }) {
        this.container = this.createContainer();
    }

    private createContainer(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'ytd-playlist-video-renderer deleted-video';
        container.innerHTML = `
            <div class="deleted-video-container">
                <div class="thumbnail-container">
                    ${this.createThumbnail()}
                    <span class="duration-overlay unavailable-overlay">
                        <span class="unavailable-icon">
                            <svg viewBox="0 0 24 24" class="unavailable-icon-svg">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                            </svg>
                        </span>
                    </span>
                </div>
                <div class="metadata">
                    <h3 class="title">
                        <span class="deleted-video-title">${this.videoData.title}</span>
                    </h3>
                    <div class="metadata-line">
                        <span class="channel-name">${this.videoData.channelTitle}</span>
                    </div>
                    <div class="status-line">
                        <span class="status-badge">${this.getStatusBadge()}</span>
                        ${this.getLastAvailableDate()}
                    </div>
                </div>
                <div class="menu-container">
                    <button class="options-button" aria-label="Action menu">
                        <svg viewBox="0 0 24 24" class="options-icon">
                            <path d="M12 16.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM10.5 12c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5zm0-6c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        this.setupEventListeners(container);
        return container;
    }

    private createThumbnail(): string {
        if (this.videoData.thumbnailUrl) {
            return `
                <img src="${this.videoData.thumbnailUrl}" 
                     class="thumbnail" 
                     alt="Video thumbnail"
                     style="opacity: 0.7;">
            `;
        }
        
        return `
            <div class="thumbnail placeholder-thumbnail">
                <svg viewBox="0 0 24 24" class="placeholder-icon">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" fill="currentColor"/>
                    <path d="M13.5 10.5l-3-3v6z" fill="currentColor"/>
                </svg>
            </div>
        `;
    }

    private getStatusBadge(): string {
        const badgeText = this.videoData.reason === 'private' ? 'Private video' :
                         this.videoData.reason === 'deleted' ? 'Video removed' :
                         'Video unavailable';

        return `<span class="status-badge-text">${badgeText}</span>`;
    }

    private getLastAvailableDate(): string {
        if (!this.videoData.lastAvailable) return '';
        
        const date = new Date(this.videoData.lastAvailable);
        const formattedDate = date.toLocaleDateString();
        return `
            <span class="last-available">
                Last available: ${formattedDate}
            </span>
        `;
    }

    private setupEventListeners(container: HTMLElement) {
        const optionsButton = container.querySelector('.options-button');
        if (optionsButton) {
            optionsButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showOptionsMenu();
            });
        }
    }

    private showOptionsMenu() {
        // Will be implemented in future phases
        // This will show options like:
        // - Hide this video
        // - Find replacement
        // - Copy information
        // - Export details
        console.log('Options menu clicked for video:', this.videoData.videoId);
    }

    mount(targetElement: Element): void {
        targetElement.replaceWith(this.container);
    }

    update(newData: Partial<typeof this.videoData>): void {
        Object.assign(this.videoData, newData);
        const newContainer = this.createContainer();
        this.container.replaceWith(newContainer);
    }
}