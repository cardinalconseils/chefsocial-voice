// ChefSocial Authentication Handler with Stripe Integration
class AuthHandler {
    constructor(mode = 'login') {
        this.mode = mode;
        this.stripe = null;
        this.elements = null;
        this.cardElement = null;
        this.isProcessing = false;
        
        this.initializeStripe();
        this.setupEventListeners();
        this.setupFormValidation();
        
        // Load language manager
        if (typeof LanguageManager !== 'undefined') {
            this.lang = new LanguageManager();
        }
    }

    async initializeStripe() {
        try {
            // Initialize Stripe with publishable key
            this.stripe = Stripe(window.STRIPE_PUBLISHABLE_KEY || 'pk_test_51234567890abcdef'); // Replace with actual key
            
            if (this.mode === 'register') {
                this.setupStripeElements();
            }
        } catch (error) {
            console.error('Stripe initialization failed:', error);
            this.showError('Payment system unavailable. Please try again later.');
        }
    }

    setupStripeElements() {
        if (!this.stripe) return;

        // Create Stripe Elements
        this.elements = this.stripe.elements({
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#ff6b35',
                    colorBackground: '#ffffff',
                    colorText: '#2d3748',
                    colorDanger: '#df1b41',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    spacingUnit: '6px',
                    borderRadius: '8px'
                }
            }
        });

        // Create card element
        this.cardElement = this.elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#2d3748',
                    '::placeholder': {
                        color: '#718096',
                    },
                },
            },
        });

        // Add payment section to registration form
        this.addPaymentSection();
        
        // Mount card element
        setTimeout(() => {
            const cardContainer = document.getElementById('card-element');
            if (cardContainer && this.cardElement) {
                this.cardElement.mount('#card-element');
                this.setupCardValidation();
            }
        }, 100);
    }

    addPaymentSection() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        const paymentSection = document.createElement('div');
        paymentSection.className = 'payment-section';
        paymentSection.innerHTML = `
            <div class="pricing-info">
                <div class="plan-header">
                    <h3>🚀 ChefSocial Complete Plan</h3>
                    <div class="price">
                        <span class="amount">$79</span>
                        <span class="period">/month</span>
                    </div>
                </div>
                
                <div class="trial-notice">
                    <div class="trial-badge">
                        <span>🎁</span>
                        <span>14-Day Free Trial</span>
                    </div>
                    <p>Start your free trial today. No charges until ${this.getTrialEndDate()}.</p>
                </div>

                <div class="plan-features">
                    <h4>Everything included:</h4>
                    <ul>
                        <li>✅ Voice content creation (300 min/month)</li>
                        <li>✅ AI image generation (30 images/month)</li>
                        <li>✅ Smart video creation (10 videos/month)</li>
                        <li>✅ Unlimited social media posting</li>
                        <li>✅ Review monitoring & analytics</li>
                        <li>✅ Team collaboration (2 users)</li>
                        <li>✅ Multi-location support</li>
                        <li>✅ Advanced AI features</li>
                        <li>✅ Priority support</li>
                    </ul>
                </div>
            </div>

            <div class="payment-method">
                <h4>Payment Method</h4>
                <p class="payment-note">Your card will be charged $79.00 on ${this.getTrialEndDate()} unless you cancel before then.</p>
                
                <div class="form-group">
                    <label for="card-element">Credit or Debit Card</label>
                    <div id="card-element" class="card-input">
                        <!-- Stripe Elements will create form elements here -->
                    </div>
                    <div id="card-errors" class="error-message" style="display: none;"></div>
                </div>

                <div class="security-notice">
                    <div class="security-icons">
                        <span>🔒</span>
                        <span>💳</span>
                        <span>🛡️</span>
                    </div>
                    <p>Secured by Stripe. Your payment information is encrypted and secure.</p>
                </div>
            </div>

            <div class="billing-agreement">
                <label class="checkbox-container">
                    <input type="checkbox" id="billingAgreement" required>
                    <span class="checkmark"></span>
                    <span class="agreement-text">
                        I agree to the <a href="/terms.html" target="_blank">Terms of Service</a> and 
                        <a href="/privacy.html" target="_blank">Privacy Policy</a>. 
                        I understand that my free trial will automatically convert to a paid subscription 
                        unless I cancel before ${this.getTrialEndDate()}.
                    </span>
                </label>
            </div>
        `;

        // Insert before submit button
        const submitButton = form.querySelector('button[type="submit"]');
        form.insertBefore(paymentSection, submitButton);

        // Update submit button text
        submitButton.innerHTML = `
            <span class="button-text">Start Free Trial</span>
            <span class="button-subtext">14 days free, then $79/month</span>
        `;
    }

    setupCardValidation() {
        if (!this.cardElement) return;

        this.cardElement.on('change', (event) => {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
                displayError.style.display = 'block';
            } else {
                displayError.style.display = 'none';
            }
        });
    }

    getTrialEndDate() {
        const date = new Date();
        date.setDate(date.getDate() + 14);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    setupEventListeners() {
        // Form submission
        const form = document.getElementById(this.mode === 'login' ? 'loginForm' : 'registerForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Password visibility toggles
        this.setupPasswordToggles();

        // Real-time validation
        this.setupRealTimeValidation();
    }

    setupFormValidation() {
        // Password strength validation for registration
        if (this.mode === 'register') {
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirmPassword');
            
            if (passwordInput) {
                passwordInput.addEventListener('input', () => this.validatePasswordStrength());
            }
            
            if (confirmPasswordInput) {
                confirmPasswordInput.addEventListener('input', () => this.validatePasswordMatch());
            }
        }
    }

    setupPasswordToggles() {
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const input = e.target.previousElementSibling;
                const icon = e.target;
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.textContent = '🙈';
                } else {
                    input.type = 'password';
                    icon.textContent = '👁️';
                }
            });
        });
    }

    setupRealTimeValidation() {
        const inputs = document.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    validateField(input) {
        const value = input.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Basic required validation
        if (!value) {
            isValid = false;
            errorMessage = `${this.getFieldLabel(input)} is required`;
        } else {
            // Specific validations
            switch (input.type) {
                case 'email':
                    if (!this.isValidEmail(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid email address';
                    }
                    break;
                case 'password':
                    if (input.id === 'password' && this.mode === 'register') {
                        const strength = this.checkPasswordStrength(value);
                        if (strength.score < 3) {
                            isValid = false;
                            errorMessage = 'Password is too weak. ' + strength.feedback;
                        }
                    }
                    break;
            }
        }

        this.showFieldValidation(input, isValid, errorMessage);
        return isValid;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isProcessing) return;
        
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Validate form
        if (!this.validateForm(form)) {
            return;
        }

        // Check billing agreement for registration
        if (this.mode === 'register') {
            const billingAgreement = document.getElementById('billingAgreement');
            if (!billingAgreement?.checked) {
                this.showError('Please agree to the terms and billing to continue.');
                return;
            }
        }

        this.isProcessing = true;
        this.setLoadingState(true);

        try {
            if (this.mode === 'register') {
                await this.handleRegistration(data);
            } else {
                await this.handleLogin(data);
            }
        } catch (error) {
            console.error('Authentication error:', error);
            this.showError(error.message || 'An error occurred. Please try again.');
        } finally {
            this.isProcessing = false;
            this.setLoadingState(false);
        }
    }

    async handleRegistration(data) {
        // Create payment method with Stripe
        const { error: stripeError, paymentMethod } = await this.stripe.createPaymentMethod({
            type: 'card',
            card: this.cardElement,
            billing_details: {
                name: data.name,
                email: data.email,
            },
        });

        if (stripeError) {
            throw new Error(`Payment method error: ${stripeError.message}`);
        }

        // Register user with payment method
        const registrationData = {
            ...data,
            paymentMethodId: paymentMethod.id,
            plan: 'complete',
            trialDays: 14
        };

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(registrationData),
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Registration failed');
        }

        // Store authentication token
        localStorage.setItem('chefsocial-token', result.token);
        localStorage.setItem('chefsocial-user', JSON.stringify(result.user));

        // Show success message
        this.showSuccess(`🎉 Welcome to ChefSocial! Your 14-day free trial has started. You'll be redirected to your dashboard in a moment.`);

        // Redirect to dashboard after success message
        setTimeout(() => {
            window.location.href = '/dashboard/';
        }, 2000);
    }

    async handleLogin(data) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Login failed');
        }

        // Store authentication token
        localStorage.setItem('chefsocial-token', result.token);
        localStorage.setItem('chefsocial-user', JSON.stringify(result.user));

        // Check subscription status
        if (result.user.subscriptionStatus === 'trialing') {
            const trialDaysLeft = this.calculateTrialDaysLeft(result.user.trialEndDate);
            this.showSuccess(`Welcome back! You have ${trialDaysLeft} days left in your free trial.`);
        } else if (result.user.subscriptionStatus === 'active') {
            this.showSuccess('Welcome back! Redirecting to your dashboard...');
        } else {
            this.showWarning('Your subscription needs attention. Please update your billing information.');
        }

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = '/dashboard/';
        }, 1500);
    }

    calculateTrialDaysLeft(trialEndDate) {
        if (!trialEndDate) return 0;
        const end = new Date(trialEndDate);
        const now = new Date();
        const diffTime = end - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }

    validateForm(form) {
        const inputs = form.querySelectorAll('input[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        // Additional registration validations
        if (this.mode === 'register') {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                this.showFieldValidation(
                    document.getElementById('confirmPassword'),
                    false,
                    'Passwords do not match'
                );
                isValid = false;
            }
        }

        return isValid;
    }

    validatePasswordStrength() {
        const passwordInput = document.getElementById('password');
        const password = passwordInput.value;
        const strength = this.checkPasswordStrength(password);
        
        // Show password strength indicator
        this.showPasswordStrength(strength);
        
        return strength.score >= 3;
    }

    checkPasswordStrength(password) {
        let score = 0;
        let feedback = [];

        if (password.length >= 8) score++;
        else feedback.push('at least 8 characters');

        if (/[a-z]/.test(password)) score++;
        else feedback.push('lowercase letters');

        if (/[A-Z]/.test(password)) score++;
        else feedback.push('uppercase letters');

        if (/[0-9]/.test(password)) score++;
        else feedback.push('numbers');

        if (/[^A-Za-z0-9]/.test(password)) score++;
        else feedback.push('special characters');

        const strength = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
        const feedbackText = feedback.length > 0 ? `Add: ${feedback.join(', ')}` : 'Password is strong';

        return { score, strength, feedback: feedbackText };
    }

    showPasswordStrength(strength) {
        let indicator = document.querySelector('.password-strength');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'password-strength';
            document.getElementById('password').parentNode.appendChild(indicator);
        }

        const colors = ['#ff4757', '#ff6b35', '#ffa502', '#2ed573', '#20bf6b'];
        const color = colors[strength.score] || colors[0];

        indicator.innerHTML = `
            <div class="strength-bar">
                <div class="strength-fill" style="width: ${strength.score * 20}%; background-color: ${color};"></div>
            </div>
            <div class="strength-text" style="color: ${color};">
                ${strength.strength} - ${strength.feedback}
            </div>
        `;
    }

    validatePasswordMatch() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmInput = document.getElementById('confirmPassword');

        if (confirmPassword && password !== confirmPassword) {
            this.showFieldValidation(confirmInput, false, 'Passwords do not match');
            return false;
        } else if (confirmPassword) {
            this.showFieldValidation(confirmInput, true, '');
            return true;
        }
        return true;
    }

    showFieldValidation(input, isValid, message) {
        const container = input.parentNode;
        let errorElement = container.querySelector('.field-error');

        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            container.appendChild(errorElement);
        }

        if (isValid) {
            input.classList.remove('error');
            input.classList.add('valid');
            errorElement.style.display = 'none';
        } else {
            input.classList.remove('valid');
            input.classList.add('error');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    clearFieldError(input) {
        input.classList.remove('error');
        const errorElement = input.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    getFieldLabel(input) {
        const label = input.parentNode.querySelector('label');
        return label ? label.textContent.replace('*', '').trim() : input.name;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    setLoadingState(isLoading) {
        const submitButton = document.querySelector('button[type="submit"]');
        const buttonText = submitButton.querySelector('.button-text') || submitButton;
        
        if (isLoading) {
            submitButton.disabled = true;
            buttonText.textContent = this.mode === 'register' ? 'Creating Account...' : 'Signing In...';
            submitButton.style.opacity = '0.7';
        } else {
            submitButton.disabled = false;
            buttonText.textContent = this.mode === 'register' ? 'Start Free Trial' : 'Sign In';
            submitButton.style.opacity = '1';
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showWarning(message) {
        this.showMessage(message, 'warning');
    }

    showMessage(message, type) {
        const messageElement = document.getElementById(`${type}Message`) || 
                              document.getElementById('errorMessage') ||
                              this.createMessageElement(type);
        
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        messageElement.className = `${type}-message`;

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 5000);
        }

        // Scroll to message
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    createMessageElement(type) {
        const element = document.createElement('div');
        element.id = `${type}Message`;
        element.className = `${type}-message`;
        element.style.display = 'none';
        
        const form = document.querySelector('form');
        form.insertBefore(element, form.firstChild);
        
        return element;
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on an auth page
    const isLoginPage = window.location.pathname.includes('login');
    const isRegisterPage = window.location.pathname.includes('register');
    
    if (isLoginPage || isRegisterPage) {
        const mode = isRegisterPage ? 'register' : 'login';
        window.authHandler = new AuthHandler(mode);
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthHandler;
}