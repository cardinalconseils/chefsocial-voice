// ChefSocial Dashboard Session Tracker
class SessionTracker {
    constructor() {
        this.authManager = new AuthManager();
        this.sessions = [];
        this.currentSession = null;
        this.statusInterval = null;
        this.eventSource = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.connectToUpdates();
        this.loadActiveSessions();
    }

    // Setup real-time updates via Server-Sent Events
    connectToUpdates() {
        if (this.eventSource) {
            this.eventSource.close();
        }

        this.eventSource = new EventSource(`/api/sessions/stream?token=${this.authManager.token}`);
        
        this.eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleSessionUpdate(data);
        };

        this.eventSource.onerror = (error) => {
            console.error('Session stream error:', error);
            // Retry connection after 5 seconds
            setTimeout(() => this.connectToUpdates(), 5000);
        };
    }

    // Load active sessions from API
    async loadActiveSessions() {
        try {
            const response = await this.authManager.apiRequest('/api/sessions/active');
            if (!response.ok) throw new Error('Failed to load sessions');

            const result = await response.json();
            this.sessions = result.sessions || [];
            this.renderSessionList();

        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    }

    // Handle session updates from server
    handleSessionUpdate(data) {
        switch (data.type) {
            case 'session_started':
                this.addSession(data.session);
                break;
            case 'session_updated':
                this.updateSession(data.session);
                break;
            case 'session_ended':
                this.removeSession(data.sessionId);
                break;
            case 'content_generated':
                this.updateSessionContent(data.sessionId, data.content);
                break;
        }
    }

    // Add new session to tracking
    addSession(session) {
        this.sessions.unshift(session);
        this.renderSessionList();
        this.showNotification(`New session started: ${session.type}`, 'info');
    }

    // Update existing session
    updateSession(updatedSession) {
        const index = this.sessions.findIndex(s => s.id === updatedSession.id);
        if (index !== -1) {
            this.sessions[index] = { ...this.sessions[index], ...updatedSession };
            this.renderSessionList();
            
            if (this.currentSession?.id === updatedSession.id) {
                this.renderSessionDetails(updatedSession);
            }
        }
    }

    // Remove session from tracking
    removeSession(sessionId) {
        this.sessions = this.sessions.filter(s => s.id !== sessionId);
        this.renderSessionList();
        
        if (this.currentSession?.id === sessionId) {
            this.currentSession = null;
            this.renderSessionDetails(null);
        }
    }

    // Update session with new content
    updateSessionContent(sessionId, content) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (session) {
            if (!session.content) session.content = [];
            session.content.push(content);
            
            if (this.currentSession?.id === sessionId) {
                this.renderSessionDetails(session);
            }
        }
    }

    // Render session list UI
    renderSessionList() {
        const container = document.getElementById('session-list');
        if (!container) return;

        if (this.sessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💭</div>
                    <h3>No Active Sessions</h3>
                    <p>Start a voice conversation or create content to see sessions here</p>
                    <a href="/conversation.html" class="btn btn-primary">Start Session</a>
                </div>
            `;
            return;
        }

        container.innerHTML = this.sessions.map(session => `
            <div class="session-item ${session.id === this.currentSession?.id ? 'active' : ''}" 
                 data-session-id="${session.id}" onclick="sessionTracker.selectSession('${session.id}')">
                <div class="session-header">
                    <div class="session-info">
                        <h4 class="session-title">${session.title || session.type}</h4>
                        <span class="session-type">${this.getSessionTypeLabel(session.type)}</span>
                    </div>
                    <div class="session-status">
                        <span class="status-indicator ${session.status}"></span>
                        <span class="status-text">${this.getStatusText(session.status)}</span>
                    </div>
                </div>
                
                <div class="session-meta">
                    <span class="session-time">${this.formatTime(session.started_at)}</span>
                    <span class="session-duration">${this.calculateDuration(session.started_at, session.ended_at)}</span>
                    ${session.content?.length ? `<span class="content-count">${session.content.length} items</span>` : ''}
                </div>
                
                ${session.preview ? `
                    <div class="session-preview">
                        ${session.preview}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    // Render detailed session view
    renderSessionDetails(session) {
        const container = document.getElementById('session-details');
        if (!container) return;

        if (!session) {
            container.innerHTML = `
                <div class="session-placeholder">
                    <div class="placeholder-icon">📊</div>
                    <h3>Select a Session</h3>
                    <p>Choose a session from the list to view details and content</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="session-detail-header">
                <div class="session-title-section">
                    <h2>${session.title || session.type}</h2>
                    <div class="session-badges">
                        <span class="badge badge-${session.status}">${this.getStatusText(session.status)}</span>
                        <span class="badge badge-type">${this.getSessionTypeLabel(session.type)}</span>
                    </div>
                </div>
                
                <div class="session-actions">
                    ${session.status === 'active' ? `
                        <button class="btn btn-secondary" onclick="sessionTracker.pauseSession('${session.id}')">
                            ⏸️ Pause
                        </button>
                        <button class="btn btn-danger" onclick="sessionTracker.endSession('${session.id}')">
                            ⏹️ End Session
                        </button>
                    ` : ''}
                    <button class="btn btn-primary" onclick="sessionTracker.exportSession('${session.id}')">
                        📤 Export
                    </button>
                </div>
            </div>

            <div class="session-stats">
                <div class="stat-card">
                    <div class="stat-value">${this.calculateDuration(session.started_at, session.ended_at)}</div>
                    <div class="stat-label">Duration</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${session.content?.length || 0}</div>
                    <div class="stat-label">Content Items</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${session.interactions || 0}</div>
                    <div class="stat-label">Interactions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${session.voice_minutes || 0}m</div>
                    <div class="stat-label">Voice Minutes</div>
                </div>
            </div>

            <div class="session-timeline">
                <h3>Session Timeline</h3>
                <div class="timeline-container">
                    ${this.renderTimeline(session)}
                </div>
            </div>

            ${session.content?.length ? `
                <div class="session-content">
                    <h3>Generated Content</h3>
                    <div class="content-grid">
                        ${session.content.map(content => this.renderContentPreview(content)).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    // Render session timeline
    renderTimeline(session) {
        const events = [
            { type: 'started', time: session.started_at, message: 'Session started' },
            ...(session.content || []).map(c => ({ 
                type: 'content', 
                time: c.created_at, 
                message: `Generated ${c.type}: ${c.title || 'Untitled'}` 
            })),
            ...(session.ended_at ? [{ type: 'ended', time: session.ended_at, message: 'Session ended' }] : [])
        ];

        return events.map(event => `
            <div class="timeline-event">
                <div class="timeline-marker ${event.type}"></div>
                <div class="timeline-content">
                    <div class="timeline-message">${event.message}</div>
                    <div class="timeline-time">${this.formatTime(event.time)}</div>
                </div>
            </div>
        `).join('');
    }

    // Render content preview
    renderContentPreview(content) {
        return `
            <div class="content-preview-card" onclick="contentPreview.showContent('${content.id}')">
                <div class="content-header">
                    <span class="content-type">${content.type}</span>
                    <span class="content-platform">${content.platform}</span>
                </div>
                <div class="content-preview">
                    ${content.preview || content.caption || 'No preview available'}
                </div>
                <div class="content-meta">
                    <span class="content-time">${this.formatTime(content.created_at)}</span>
                    ${content.viral_score ? `<span class="viral-score">🔥 ${content.viral_score}</span>` : ''}
                </div>
            </div>
        `;
    }

    // Session management actions
    selectSession(sessionId) {
        this.currentSession = this.sessions.find(s => s.id === sessionId);
        this.renderSessionList();
        this.renderSessionDetails(this.currentSession);
    }

    async pauseSession(sessionId) {
        try {
            await this.authManager.apiRequest(`/api/sessions/${sessionId}/pause`, { method: 'POST' });
            this.showNotification('Session paused', 'success');
        } catch (error) {
            this.showNotification('Failed to pause session', 'error');
        }
    }

    async endSession(sessionId) {
        if (!confirm('Are you sure you want to end this session?')) return;
        
        try {
            await this.authManager.apiRequest(`/api/sessions/${sessionId}/end`, { method: 'POST' });
            this.showNotification('Session ended', 'success');
        } catch (error) {
            this.showNotification('Failed to end session', 'error');
        }
    }

    async exportSession(sessionId) {
        try {
            const response = await this.authManager.apiRequest(`/api/sessions/${sessionId}/export`);
            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session-${sessionId}-export.json`;
            a.click();
            window.URL.revokeObjectURL(url);

            this.showNotification('Session exported successfully', 'success');
        } catch (error) {
            this.showNotification('Failed to export session', 'error');
        }
    }

    // Helper methods
    getSessionTypeLabel(type) {
        const types = {
            'voice_content': 'Voice Content',
            'conversation': 'AI Chat',
            'recipe_generation': 'Recipe',
            'social_media': 'Social Media',
            'menu_creation': 'Menu'
        };
        return types[type] || type;
    }

    getStatusText(status) {
        const statuses = {
            'active': 'Active',
            'paused': 'Paused',
            'completed': 'Completed',
            'failed': 'Failed',
            'cancelled': 'Cancelled'
        };
        return statuses[status] || status;
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleString();
    }

    calculateDuration(startTime, endTime) {
        if (!startTime) return '0m';
        
        const start = new Date(startTime);
        const end = endTime ? new Date(endTime) : new Date();
        const diff = Math.floor((end - start) / 1000 / 60);
        
        if (diff < 60) return `${diff}m`;
        return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    setupEventListeners() {
        // Listen for page visibility changes to pause/resume tracking
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseTracking();
            } else {
                this.resumeTracking();
            }
        });

        // Handle cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    pauseTracking() {
        if (this.eventSource) {
            this.eventSource.close();
        }
    }

    resumeTracking() {
        this.connectToUpdates();
        this.loadActiveSessions();
    }

    cleanup() {
        if (this.eventSource) {
            this.eventSource.close();
        }
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
    }
}

// Export for use in dashboard pages
window.SessionTracker = SessionTracker;