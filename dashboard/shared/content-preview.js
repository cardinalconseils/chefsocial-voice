// ChefSocial Content Preview Interface
class ContentPreview {
    constructor() {
        this.authManager = new AuthManager();
        this.currentContent = null;
        this.previewModal = null;
        
        this.init();
    }

    init() {
        this.createPreviewModal();
        this.setupEventListeners();
    }

    // Create modal for content preview
    createPreviewModal() {
        this.previewModal = document.createElement('div');
        this.previewModal.className = 'content-preview-modal';
        this.previewModal.innerHTML = `
            <div class="modal-backdrop" onclick="contentPreview.closePreview()"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h2 id="preview-title">Content Preview</h2>
                    <button class="modal-close" onclick="contentPreview.closePreview()">×</button>
                </div>
                <div class="modal-content">
                    <div id="preview-content-area"></div>
                </div>
                <div class="modal-footer">
                    <div class="preview-actions">
                        <button class="btn btn-secondary" onclick="contentPreview.editContent()">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-secondary" onclick="contentPreview.copyContent()">
                            📋 Copy
                        </button>
                        <button class="btn btn-secondary" onclick="contentPreview.downloadContent()">
                            💾 Download
                        </button>
                        <button class="btn btn-primary" onclick="contentPreview.shareContent()">
                            📤 Share
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.previewModal);
    }

    // Show content in preview modal
    async showContent(contentId) {
        try {
            const response = await this.authManager.apiRequest(`/api/content/${contentId}`);
            if (!response.ok) throw new Error('Failed to load content');

            const content = await response.json();
            this.currentContent = content;
            this.renderContentPreview(content);
            this.openPreview();

        } catch (error) {
            console.error('Failed to load content:', error);
            this.showNotification('Failed to load content', 'error');
        }
    }

    // Render content in preview
    renderContentPreview(content) {
        const titleEl = document.getElementById('preview-title');
        const contentArea = document.getElementById('preview-content-area');
        
        titleEl.textContent = content.title || `${content.type} Content`;
        
        contentArea.innerHTML = `
            <div class="content-preview-container">
                <div class="content-metadata">
                    <div class="metadata-grid">
                        <div class="metadata-item">
                            <label>Type</label>
                            <span class="content-type-badge">${content.type}</span>
                        </div>
                        <div class="metadata-item">
                            <label>Platform</label>
                            <span class="platform-badge">${content.platform}</span>
                        </div>
                        <div class="metadata-item">
                            <label>Created</label>
                            <span>${new Date(content.created_at).toLocaleString()}</span>
                        </div>
                        ${content.viral_score ? `
                            <div class="metadata-item">
                                <label>Viral Score</label>
                                <span class="viral-score">🔥 ${content.viral_score}/100</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="content-sections">
                    ${content.caption ? `
                        <div class="content-section">
                            <h4>Caption</h4>
                            <div class="content-text selectable">${content.caption}</div>
                        </div>
                    ` : ''}

                    ${content.hashtags ? `
                        <div class="content-section">
                            <h4>Hashtags</h4>
                            <div class="hashtags-container">
                                ${content.hashtags.split(' ').map(tag => 
                                    `<span class="hashtag">${tag}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${content.transcript ? `
                        <div class="content-section">
                            <h4>Original Transcript</h4>
                            <div class="transcript-text">${content.transcript}</div>
                        </div>
                    ` : ''}

                    ${content.image_url ? `
                        <div class="content-section">
                            <h4>Generated Image</h4>
                            <div class="image-container">
                                <img src="${content.image_url}" alt="Generated content image" />
                            </div>
                        </div>
                    ` : ''}

                    ${content.analytics ? `
                        <div class="content-section">
                            <h4>Performance Analytics</h4>
                            <div class="analytics-grid">
                                ${this.renderAnalytics(content.analytics)}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="platform-preview">
                    <h4>Platform Preview</h4>
                    <div class="platform-mockup ${content.platform}">
                        ${this.renderPlatformMockup(content)}
                    </div>
                </div>
            </div>
        `;
    }

    // Render platform-specific mockup
    renderPlatformMockup(content) {
        switch (content.platform) {
            case 'instagram':
                return this.renderInstagramMockup(content);
            case 'facebook':
                return this.renderFacebookMockup(content);
            case 'twitter':
                return this.renderTwitterMockup(content);
            case 'linkedin':
                return this.renderLinkedInMockup(content);
            case 'tiktok':
                return this.renderTikTokMockup(content);
            default:
                return this.renderGenericMockup(content);
        }
    }

    renderInstagramMockup(content) {
        return `
            <div class="ig-post">
                <div class="ig-header">
                    <div class="ig-profile">
                        <div class="ig-avatar">🍽️</div>
                        <span class="ig-username">your_restaurant</span>
                    </div>
                    <div class="ig-menu">⋯</div>
                </div>
                ${content.image_url ? `
                    <div class="ig-image">
                        <img src="${content.image_url}" alt="Post image" />
                    </div>
                ` : ''}
                <div class="ig-actions">
                    <div class="ig-action-icons">
                        <span>🤍</span>
                        <span>💬</span>
                        <span>📤</span>
                    </div>
                </div>
                <div class="ig-caption">
                    <span class="ig-username">your_restaurant</span>
                    ${content.caption}
                </div>
                ${content.hashtags ? `
                    <div class="ig-hashtags">${content.hashtags}</div>
                ` : ''}
            </div>
        `;
    }

    renderFacebookMockup(content) {
        return `
            <div class="fb-post">
                <div class="fb-header">
                    <div class="fb-profile">
                        <div class="fb-avatar">🍽️</div>
                        <div class="fb-info">
                            <span class="fb-name">Your Restaurant</span>
                            <span class="fb-time">Just now</span>
                        </div>
                    </div>
                </div>
                <div class="fb-content">
                    ${content.caption}
                </div>
                ${content.image_url ? `
                    <div class="fb-image">
                        <img src="${content.image_url}" alt="Post image" />
                    </div>
                ` : ''}
                <div class="fb-reactions">
                    <span>👍 ❤️ 😋</span>
                    <span class="fb-counts">23 reactions</span>
                </div>
            </div>
        `;
    }

    renderTwitterMockup(content) {
        return `
            <div class="twitter-post">
                <div class="twitter-header">
                    <div class="twitter-avatar">🍽️</div>
                    <div class="twitter-info">
                        <span class="twitter-name">Your Restaurant</span>
                        <span class="twitter-handle">@yourrestaurant</span>
                        <span class="twitter-time">• now</span>
                    </div>
                </div>
                <div class="twitter-content">
                    ${content.caption}
                    ${content.hashtags ? `<div class="twitter-hashtags">${content.hashtags}</div>` : ''}
                </div>
                ${content.image_url ? `
                    <div class="twitter-image">
                        <img src="${content.image_url}" alt="Post image" />
                    </div>
                ` : ''}
                <div class="twitter-actions">
                    <span>💬</span>
                    <span>🔄</span>
                    <span>🤍</span>
                    <span>📤</span>
                </div>
            </div>
        `;
    }

    renderLinkedInMockup(content) {
        return `
            <div class="linkedin-post">
                <div class="linkedin-header">
                    <div class="linkedin-profile">
                        <div class="linkedin-avatar">🍽️</div>
                        <div class="linkedin-info">
                            <span class="linkedin-name">Your Restaurant</span>
                            <span class="linkedin-title">Restaurant & Food Service</span>
                            <span class="linkedin-time">Just now</span>
                        </div>
                    </div>
                </div>
                <div class="linkedin-content">
                    ${content.caption}
                    ${content.hashtags ? `<div class="linkedin-hashtags">${content.hashtags}</div>` : ''}
                </div>
                ${content.image_url ? `
                    <div class="linkedin-image">
                        <img src="${content.image_url}" alt="Post image" />
                    </div>
                ` : ''}
                <div class="linkedin-reactions">
                    <span>👍 ❤️ 💡</span>
                    <span>12 reactions</span>
                </div>
            </div>
        `;
    }

    renderTikTokMockup(content) {
        return `
            <div class="tiktok-post">
                <div class="tiktok-video">
                    ${content.image_url ? `
                        <img src="${content.image_url}" alt="Video thumbnail" />
                        <div class="tiktok-play">▶️</div>
                    ` : `
                        <div class="tiktok-placeholder">
                            <span>🎥</span>
                            <p>Video Content</p>
                        </div>
                    `}
                </div>
                <div class="tiktok-info">
                    <div class="tiktok-profile">
                        <div class="tiktok-avatar">🍽️</div>
                        <span class="tiktok-username">@yourrestaurant</span>
                    </div>
                    <div class="tiktok-caption">
                        ${content.caption}
                        ${content.hashtags ? `<div class="tiktok-hashtags">${content.hashtags}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderGenericMockup(content) {
        return `
            <div class="generic-post">
                <div class="generic-header">
                    <span>Preview for ${content.platform}</span>
                </div>
                <div class="generic-content">
                    ${content.caption}
                </div>
                ${content.hashtags ? `
                    <div class="generic-hashtags">${content.hashtags}</div>
                ` : ''}
            </div>
        `;
    }

    renderAnalytics(analytics) {
        if (!analytics) return '';
        
        return Object.entries(analytics).map(([key, value]) => `
            <div class="analytics-item">
                <span class="analytics-label">${key.replace('_', ' ')}</span>
                <span class="analytics-value">${value}</span>
            </div>
        `).join('');
    }

    // Modal actions
    openPreview() {
        this.previewModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closePreview() {
        this.previewModal.classList.remove('active');
        document.body.style.overflow = '';
        this.currentContent = null;
    }

    // Content actions
    editContent() {
        if (!this.currentContent) return;
        
        // This would open an edit modal or redirect to edit page
        console.log('Edit content:', this.currentContent.id);
        this.showNotification('Edit functionality coming soon', 'info');
    }

    async copyContent() {
        if (!this.currentContent) return;
        
        const textToCopy = [
            this.currentContent.caption,
            this.currentContent.hashtags
        ].filter(Boolean).join('\n\n');
        
        try {
            await navigator.clipboard.writeText(textToCopy);
            this.showNotification('Content copied to clipboard', 'success');
        } catch (error) {
            this.showNotification('Failed to copy content', 'error');
        }
    }

    downloadContent() {
        if (!this.currentContent) return;
        
        const data = {
            id: this.currentContent.id,
            type: this.currentContent.type,
            platform: this.currentContent.platform,
            caption: this.currentContent.caption,
            hashtags: this.currentContent.hashtags,
            created_at: this.currentContent.created_at
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `content-${this.currentContent.id}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showNotification('Content downloaded', 'success');
    }

    shareContent() {
        if (!this.currentContent) return;
        
        // This would integrate with platform APIs
        console.log('Share content:', this.currentContent.id);
        this.showNotification('Share functionality coming soon', 'info');
    }

    setupEventListeners() {
        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.previewModal.classList.contains('active')) {
                this.closePreview();
            }
        });
    }

    showNotification(message, type) {
        // Reuse notification system from session tracker
        if (window.sessionTracker) {
            window.sessionTracker.showNotification(message, type);
        } else {
            console.log(`${type}: ${message}`);
        }
    }
}

// Export for use in dashboard pages
window.ContentPreview = ContentPreview;