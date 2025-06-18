class AuthHandler {
    constructor(formType = 'login') {
        this.formType = formType;
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    setupEventListeners() {
        const formId = this.formType === 'login' ? 'loginForm' : 'registerForm';
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.formType === 'login') {
                    this.handleLogin();
                } else {
                    this.handleRegister();
                }
            });
        }
    }

    checkExistingAuth() {
        const token = localStorage.getItem('auth_token');
        if (token) {
            // Verify token with backend
            this.verifyToken(token);
        }
    }

    async verifyToken(token) {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                window.location.href = '/dashboard/';
            } else {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
        }
    }

    async handleLogin() {
        const submitButton = document.getElementById('submitButton');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        
        submitButton.disabled = true;
        
        // Add loading state
        const originalContent = submitButton.innerHTML;
        submitButton.innerHTML = `<span class="loading"></span>${lang.getCurrentLanguage() === 'fr' ? 'Connexion...' : 'Signing In...'}`;
        
        try {
            const formData = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            };

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Login failed');
            }

            // Handle successful login
            successMessage.textContent = lang.getCurrentLanguage() === 'fr'
                ? '✅ Connexion réussie ! Redirection en cours...'
                : '✅ Login successful! Redirecting...';
            successMessage.style.display = 'block';
            errorMessage.style.display = 'none';

            // Store user data
            localStorage.setItem('auth_token', result.token);
            localStorage.setItem('user_data', JSON.stringify(result.user));

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard/';
            }, 1500);

        } catch (error) {
            errorMessage.textContent = `❌ ${error.message}`;
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';
            
            submitButton.disabled = false;
            submitButton.innerHTML = originalContent;
        }
    }

    async handleRegister() {
        const submitButton = document.getElementById('submitButton');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        
        submitButton.disabled = true;
        
        // Add loading state
        const originalContent = submitButton.innerHTML;
        submitButton.innerHTML = `<span class="loading"></span>${lang.getCurrentLanguage() === 'fr' ? 'Création du compte...' : 'Creating Account...'}`;
        
        try {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                throw new Error(lang.getCurrentLanguage() === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match');
            }

            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                password: password
            };

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Registration failed');
            }

            // Handle successful registration
            successMessage.textContent = lang.getCurrentLanguage() === 'fr'
                ? '✅ Compte créé avec succès ! Redirection en cours...'
                : '✅ Account created successfully! Redirecting...';
            successMessage.style.display = 'block';
            errorMessage.style.display = 'none';

            // Store user data
            localStorage.setItem('auth_token', result.token);
            localStorage.setItem('user_data', JSON.stringify(result.user));

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard/';
            }, 1500);

        } catch (error) {
            errorMessage.textContent = `❌ ${error.message}`;
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';
            
            submitButton.disabled = false;
            submitButton.innerHTML = originalContent;
        }
    }

    static logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '/auth/login.html';
    }

    static isAuthenticated() {
        return !!localStorage.getItem('auth_token');
    }

    static getToken() {
        return localStorage.getItem('auth_token');
    }

    static getUser() {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    }
}