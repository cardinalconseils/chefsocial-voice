// ChefSocial Dashboard Navigation Component
class DashboardNav {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.authManager = new AuthManager();
    }

    // Get current page from URL
    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('/profile')) return 'profile';
        if (path.includes('/analytics')) return 'analytics';
        if (path.includes('/content')) return 'content';
        if (path.includes('/sessions')) return 'sessions';
        return 'overview';
    }

    // Render navigation sidebar
    renderSidebar(containerId = 'dashboard-sidebar') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="sidebar">
                <div class="logo">
                    🍽️ ChefSocial
                </div>
                
                <ul class="nav-menu">
                    <li class="nav-item">
                        <a href="/dashboard/" class="nav-link ${this.currentPage === 'overview' ? 'active' : ''}" data-page="overview">
                            📊 Overview
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="/dashboard/sessions/" class="nav-link ${this.currentPage === 'sessions' ? 'active' : ''}" data-page="sessions">
                            🔄 Sessions
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="/dashboard/profile/" class="nav-link ${this.currentPage === 'profile' ? 'active' : ''}" data-page="profile">
                            👤 Profile
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="/dashboard/analytics/" class="nav-link ${this.currentPage === 'analytics' ? 'active' : ''}" data-page="analytics">
                            📈 Analytics
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="/dashboard/content/" class="nav-link ${this.currentPage === 'content' ? 'active' : ''}" data-page="content">
                            📚 Content Library
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="/conversation.html" class="nav-link" data-page="voice">
                            🎙️ Voice Content
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="/natural.html" class="nav-link" data-page="conversation">
                            💬 AI Conversation
                        </a>
                    </li>
                </ul>
                
                <div class="sidebar-footer">
                    <div class="user-info">
                        <div class="user-name" id="sidebar-user-name">Loading...</div>
                        <div class="user-plan" id="sidebar-user-plan">Trial</div>
                    </div>
                    <button class="logout-btn" onclick="dashboardNav.logout()">
                        Logout
                    </button>
                </div>
            </div>
        `;

        this.updateUserInfo();
    }

    // Update user info in sidebar
    async updateUserInfo() {
        await this.authManager.verifyAuth();
        
        const userNameEl = document.getElementById('sidebar-user-name');
        const userPlanEl = document.getElementById('sidebar-user-plan');
        
        if (userNameEl) userNameEl.textContent = this.authManager.getUser()?.name || 'User';
        if (userPlanEl) userPlanEl.textContent = this.authManager.getUserPlan();
    }

    // Logout function
    logout() {
        this.authManager.logout();
    }

    // Navigation breadcrumbs
    renderBreadcrumbs(containerId = 'breadcrumbs') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const breadcrumbs = this.getBreadcrumbs();
        container.innerHTML = breadcrumbs.map(crumb => 
            `<span class="breadcrumb-item">${crumb}</span>`
        ).join(' / ');
    }

    // Get breadcrumbs based on current page
    getBreadcrumbs() {
        const breadcrumbs = ['Dashboard'];
        
        switch (this.currentPage) {
            case 'profile':
                breadcrumbs.push('Profile');
                break;
            case 'analytics':
                breadcrumbs.push('Analytics');
                break;
            case 'content':
                breadcrumbs.push('Content Library');
                break;
        }
        
        return breadcrumbs;
    }
}

// Export for use in dashboard pages
window.DashboardNav = DashboardNav;