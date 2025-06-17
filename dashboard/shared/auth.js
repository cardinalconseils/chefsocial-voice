// ChefSocial Dashboard Authentication Helper
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.user = null;
        this.baseUrl = window.location.origin;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }

    // Get current user data
    getUser() {
        return this.user;
    }

    // Verify token and load user data
    async verifyAuth() {
        if (!this.token) {
            this.redirectToLogin();
            return false;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/auth/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Authentication failed');
            }

            const result = await response.json();
            this.user = result.user;
            return true;

        } catch (error) {
            console.error('Auth verification failed:', error);
            this.logout();
            return false;
        }
    }

    // Make authenticated API request
    async apiRequest(endpoint, options = {}) {
        const config = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        const response = await fetch(`${this.baseUrl}${endpoint}`, config);
        
        if (response.status === 401) {
            this.logout();
            throw new Error('Authentication expired');
        }

        return response;
    }

    // Logout user
    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        this.token = null;
        this.user = null;
        this.redirectToLogin();
    }

    // Redirect to login page
    redirectToLogin() {
        window.location.href = '/login.html';
    }

    // Update user display
    updateUserDisplay(elementId = 'user-name') {
        const element = document.getElementById(elementId);
        if (element && this.user) {
            element.textContent = this.user.name || 'User';
        }
    }

    // Get user plan info
    getUserPlan() {
        return this.user?.plan || 'trial';
    }

    // Check if user has feature access
    hasFeatureAccess(featureKey) {
        // This would be populated from API
        return this.user?.features?.[featureKey] || false;
    }
}

// Export for use in other dashboard pages
window.AuthManager = AuthManager;