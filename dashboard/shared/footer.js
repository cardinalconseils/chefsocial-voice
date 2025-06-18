// Footer Component for ChefSocial
class FooterComponent {
    constructor() {
        this.currentLang = localStorage.getItem('chefsocial-lang') || 'en';
        this.init();
    }

    init() {
        this.injectStyles();
        this.render();
        this.setupEventListeners();
        
        // Listen for language changes from header
        window.addEventListener('languageChanged', (e) => {
            this.currentLang = e.detail.language;
            this.updateLanguageButtons();
        });
    }

    injectStyles() {
        // Check if styles are already injected
        if (document.getElementById('footer-component-styles')) return;

        const styles = `
            <style id="footer-component-styles">
                /* Footer Styles */
                .footer {
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                    color: white;
                    padding: 4rem 0 2rem;
                    margin-top: 4rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .footer-content {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 2rem;
                    margin-bottom: 3rem;
                }

                .footer-section h4 {
                    color: #ff6b35;
                    margin-bottom: 1rem;
                    font-size: 1.2rem;
                    font-weight: 600;
                }

                .footer-section ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .footer-section ul li {
                    margin-bottom: 0.75rem;
                }

                .footer-section ul li a {
                    color: rgba(255, 255, 255, 0.8);
                    text-decoration: none;
                    transition: all 0.3s ease;
                }

                .footer-section ul li a:hover {
                    color: #ff6b35;
                    transform: translateX(5px);
                }

                .footer-logo {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.5rem;
                    font-weight: bold;
                    margin-bottom: 1rem;
                }

                .footer-logo .logo-icon {
                    font-size: 2rem;
                }

                .footer-section p {
                    color: rgba(255, 255, 255, 0.7);
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                }

                /* Newsletter Section */
                .newsletter-section {
                    grid-column: span 2;
                }

                .newsletter-form {
                    margin-top: 1.5rem;
                }

                .newsletter-input-group {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                }

                .newsletter-input {
                    flex: 1;
                    padding: 1rem;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 25px;
                    background: rgba(255, 255, 255, 0.05);
                    color: white;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                }

                .newsletter-input::placeholder {
                    color: rgba(255, 255, 255, 0.5);
                }

                .newsletter-input:focus {
                    outline: none;
                    border-color: #ff6b35;
                    background: rgba(255, 255, 255, 0.1);
                    box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.2);
                }

                .newsletter-button {
                    background: linear-gradient(45deg, #ff6b35, #f7931e);
                    color: white;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 25px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
                    white-space: nowrap;
                }

                .newsletter-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
                }

                .newsletter-button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }

                /* Footer Bottom */
                .footer-bottom {
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    padding-top: 2rem;
                }

                .footer-bottom-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .footer-bottom-content p {
                    color: rgba(255, 255, 255, 0.6);
                    margin: 0;
                }

                /* Social Media Links */
                .social-media-links {
                    display: flex;
                    gap: 1rem;
                }

                .social-link {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    color: rgba(255, 255, 255, 0.8);
                    text-decoration: none;
                    transition: all 0.3s ease;
                }

                .social-link:hover {
                    background: #ff6b35;
                    color: white;
                    transform: translateY(-3px);
                    box-shadow: 0 5px 15px rgba(255, 107, 53, 0.4);
                }

                .social-link svg {
                    width: 20px;
                    height: 20px;
                }

                /* Mobile Responsive */
                @media (max-width: 768px) {
                    .footer {
                        padding: 3rem 0 1.5rem;
                    }

                    .footer-content {
                        grid-template-columns: 1fr;
                        gap: 2rem;
                        text-align: center;
                    }

                    .newsletter-section {
                        grid-column: span 1;
                    }

                    .newsletter-input-group {
                        flex-direction: column;
                    }

                    .newsletter-button {
                        width: 100%;
                    }

                    .footer-bottom-content {
                        flex-direction: column;
                        text-align: center;
                        gap: 1.5rem;
                    }

                    .social-media-links {
                        justify-content: center;
                    }
                }

                @media (max-width: 480px) {
                    .footer-content {
                        gap: 1.5rem;
                    }

                    .footer-section h4 {
                        font-size: 1.1rem;
                    }

                    .newsletter-input,
                    .newsletter-button {
                        padding: 0.8rem 1.5rem;
                        font-size: 0.9rem;
                    }

                    .social-link {
                        width: 35px;
                        height: 35px;
                    }

                    .social-link svg {
                        width: 18px;
                        height: 18px;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    render() {
        const footerHTML = `
            <footer class="footer" role="contentinfo">
                <div class="container">
                    <div class="footer-content">
                        <div class="footer-section">
                            <div class="footer-logo">
                                <span class="logo-icon" aria-hidden="true">👨‍🍳</span>
                                <span>ChefSocial</span>
                            </div>
                            <p data-i18n="footer.description">AI-powered voice-to-content platform for restaurants and food creators.</p>
                        </div>

                        <div class="footer-section">
                            <h4 data-i18n="footer.product.title">Product</h4>
                            <ul role="list">
                                <li><a href="/demo.html" data-i18n="footer.product.demo">Demo</a></li>
                                <li><a href="/register.html" data-i18n="footer.product.pricing">Pricing</a></li>
                                <li><a href="/#features" data-i18n="footer.product.features">Features</a></li>
                            </ul>
                        </div>

                        <div class="footer-section">
                            <h4 data-i18n="footer.company.title">Company</h4>
                            <ul role="list">
                                <li><a href="/about.html" data-i18n="footer.company.about">About</a></li>
                                <li><a href="/contact.html" data-i18n="footer.company.contact">Contact</a></li>
                                <li><a href="/blog.html" data-i18n="footer.company.blog">Blog</a></li>
                            </ul>
                        </div>

                        <div class="footer-section">
                            <h4 data-i18n="footer.legal.title">Legal</h4>
                            <ul role="list">
                                <li><a href="/privacy.html" data-i18n="footer.legal.privacy">Privacy Policy</a></li>
                                <li><a href="/terms.html" data-i18n="footer.legal.terms">Terms of Service</a></li>
                                <li><a href="/cookies.html" data-i18n="footer.legal.cookies">Cookie Policy</a></li>
                            </ul>
                        </div>

                        <div class="footer-section newsletter-section">
                            <h4 data-i18n="footer.newsletter.title">Stay Updated</h4>
                            <p data-i18n="footer.newsletter.description">Get the latest features and food content tips delivered to your inbox.</p>
                            <form class="newsletter-form" aria-label="Newsletter signup">
                                <div class="newsletter-input-group">
                                    <input 
                                        type="email" 
                                        class="newsletter-input" 
                                        placeholder="Enter your email"
                                        data-i18n-placeholder="footer.newsletter.placeholder"
                                        aria-label="Email address"
                                        required
                                    >
                                    <button 
                                        type="submit" 
                                        class="newsletter-button"
                                        data-i18n="footer.newsletter.button"
                                        aria-label="Subscribe to newsletter"
                                    >
                                        Subscribe
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div class="footer-bottom">
                        <div class="footer-bottom-content">
                            <p data-i18n="footer.copyright">&copy; 2024 ChefSocial. All rights reserved.</p>
                            <div class="social-media-links" aria-label="Social media">
                                <a href="#" class="social-link" aria-label="Follow us on Twitter" rel="noopener noreferrer" target="_blank">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                </a>
                                <a href="#" class="social-link" aria-label="Follow us on Instagram" rel="noopener noreferrer" target="_blank">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                    </svg>
                                </a>
                                <a href="#" class="social-link" aria-label="Follow us on LinkedIn" rel="noopener noreferrer" target="_blank">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                </a>
                                <a href="#" class="social-link" aria-label="Subscribe to our YouTube channel" rel="noopener noreferrer" target="_blank">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        `;

        try {
            // Insert footer at the end of body
            document.body.insertAdjacentHTML('beforeend', footerHTML);
        } catch (error) {
            console.error('Failed to render footer:', error);
        }
    }

    setupEventListeners() {
        // Newsletter form submission
        const newsletterForm = document.querySelector('.newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleNewsletterSubmission(e.target);
            });
        }

        // Social media links tracking (optional)
        document.querySelectorAll('.social-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const platform = e.currentTarget.getAttribute('aria-label').toLowerCase();
                console.log(`Social link clicked: ${platform}`);
                // Add analytics tracking here if needed
            });
        });
    }

    async handleNewsletterSubmission(form) {
        const emailInput = form.querySelector('.newsletter-input');
        const submitButton = form.querySelector('.newsletter-button');
        const email = emailInput.value.trim();

        if (!email) return;

        // Disable form during submission
        submitButton.disabled = true;
        submitButton.textContent = window.i18nManager ? 
            window.i18nManager.getTranslation('footer.newsletter.subscribing') : 
            'Subscribing...';

        try {
            // Simulate API call for newsletter subscription
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Success feedback
            submitButton.textContent = window.i18nManager ? 
                window.i18nManager.getTranslation('footer.newsletter.success') : 
                'Subscribed!';
            submitButton.style.background = '#4facfe';
            emailInput.value = '';
            
            // Reset button after 3 seconds
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.textContent = window.i18nManager ? 
                    window.i18nManager.getTranslation('footer.newsletter.button') : 
                    'Subscribe';
                submitButton.style.background = '';
            }, 3000);

        } catch (error) {
            console.error('Newsletter subscription failed:', error);
            submitButton.textContent = window.i18nManager ? 
                window.i18nManager.getTranslation('footer.newsletter.error') : 
                'Try again';
            submitButton.disabled = false;
        }
    }

    setLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('chefsocial-lang', lang);
        // No language buttons in footer to update
    }

    updateLanguageButtons() {
        // No language buttons in footer to update
        // Language is controlled solely by header component
    }

    getCurrentLanguage() {
        return this.currentLang;
    }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    window.footerComponent = new FooterComponent();
}