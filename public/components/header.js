// Header Component for ChefSocial
class HeaderComponent {
    constructor() {
        this.currentLang = localStorage.getItem('chefsocial-lang') || 'en';
        this.headerElement = null;
        this.mobileToggle = null;
        this.navLinks = null;
        this.init();
        
        // Add debug functions to window for testing
        window.debugHeader = () => {
            console.log('Header debug info:');
            console.log('Mobile toggle element:', this.mobileToggle);
            console.log('Nav links element:', this.navLinks);
            console.log('Screen width:', window.innerWidth);
            console.log('Mobile toggle visible:', this.mobileToggle ? window.getComputedStyle(this.mobileToggle).display : 'element not found');
            console.log('Nav links visible:', this.navLinks ? window.getComputedStyle(this.navLinks).display : 'element not found');
            
            if (this.mobileToggle) {
                const styles = window.getComputedStyle(this.mobileToggle);
                console.log('Mobile toggle computed styles:', {
                    display: styles.display,
                    visibility: styles.visibility,
                    opacity: styles.opacity,
                    background: styles.background,
                    position: styles.position,
                    zIndex: styles.zIndex
                });
            }
        };
        
        window.forceShowMobileMenu = () => {
            if (this.mobileToggle) {
                this.mobileToggle.style.display = 'flex';
                this.mobileToggle.style.visibility = 'visible';
                this.mobileToggle.style.opacity = '1';
                this.mobileToggle.style.background = '#ff6b35';
                this.mobileToggle.style.border = '2px solid white';
                this.mobileToggle.style.padding = '12px';
                this.mobileToggle.style.borderRadius = '12px';
                this.mobileToggle.style.position = 'relative';
                this.mobileToggle.style.zIndex = '1001';
                console.log('Force showing mobile menu - applied inline styles');
            } else {
                console.log('Mobile toggle element not found');
            }
        };
    }

    init() {
        // Prevent multiple initializations
        if (document.getElementById('header')) {
            console.warn('Header already exists, skipping initialization');
            return;
        }
        
        this.injectStyles();
        this.render();
        this.setupEventListeners();
        this.updateScrollEffect();
    }

    injectStyles() {
        // Check if styles are already injected
        if (document.getElementById('header-component-styles')) return;

        const styles = `
            <style id="header-component-styles">
                /* Header Styles */
                #header {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    /* IMPROVED CONTRAST: Darker gradient with better text visibility */
                    background: linear-gradient(135deg, 
                        rgba(255, 107, 53, 0.95) 0%,    /* Darker orange */
                        rgba(212, 70, 239, 0.95) 50%,   /* Darker purple */
                        rgba(30, 58, 138, 0.95) 100%    /* Much darker blue */
                    );
                    padding: 1rem 0;
                    box-shadow: 0 4px 32px rgba(0, 0, 0, 0.1);
                }

                #header.scrolled {
                    background: rgba(0, 0, 0, 0.9);
                    backdrop-filter: blur(20px);
                    padding: 0.75rem 0;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                }

                .header-nav {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 2rem;
                    height: 64px;
                }

                .header-logo {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.5rem;
                    font-weight: 700;
                    /* CONTRAST FIX: White text with text shadow for better visibility */
                    color: #ffffff;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    text-decoration: none;
                    transition: all 0.3s ease;
                }

                .header-logo:hover {
                    transform: translateY(-1px);
                    text-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
                }

                .header-logo-icon {
                    width: 2rem;
                    height: 2rem;
                    font-size: 2rem;
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
                }

                .header-nav-links {
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                    list-style: none;
                    margin: 0;
                    padding: 0;
                }

                .header-nav-links a {
                    /* CONTRAST FIX: Solid white with text shadow */
                    color: #ffffff;
                    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
                    text-decoration: none;
                    font-weight: 500;
                    font-size: 1.1rem;
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    transition: all 0.3s ease;
                    position: relative;
                }

                .header-nav-links a:hover {
                    /* Enhanced hover with dark background for maximum contrast */
                    background-color: rgba(0, 0, 0, 0.2);
                    color: #ffffff;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
                    transform: translateY(-1px);
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 1.5rem;
                }

                .language-toggle {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(10px);
                    border-radius: 2rem;
                    padding: 0.25rem;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .lang-button {
                    /* CONTRAST FIX: Darker background for inactive state */
                    background: rgba(0, 0, 0, 0.2);
                    color: #ffffff;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
                    border: none;
                    padding: 0.5rem 0.75rem;
                    border-radius: 1.5rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    min-width: 36px;
                    height: 36px;
                }

                .lang-button.active {
                    /* CONTRAST FIX: Dark background with white text for maximum contrast */
                    background: rgba(0, 0, 0, 0.6);
                    color: #ffffff;
                    text-shadow: none;
                    transform: scale(1.05);
                }

                .lang-button:hover {
                    background: rgba(0, 0, 0, 0.4);
                    transform: scale(1.05);
                }

                .auth-buttons {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .login-button, .header-cta-button {
                    padding: 0.75rem 1.5rem;
                    border-radius: 2rem;
                    font-weight: 600;
                    font-size: 1rem;
                    text-decoration: none;
                    transition: all 0.3s ease;
                    display: inline-flex;
                    align-items: center;
                    cursor: pointer;
                    border: 2px solid transparent;
                }

                .login-button {
                    /* CONTRAST FIX: Dark background with white text */
                    background: rgba(0, 0, 0, 0.4);
                    color: #ffffff;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                }

                .login-button:hover {
                    background: rgba(0, 0, 0, 0.6);
                    color: #ffffff;
                    border-color: rgba(255, 255, 255, 0.5);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                }

                .header-cta-button {
                    /* CONTRAST FIX: Much darker background for better contrast */
                    background: linear-gradient(135deg, #cc5a2b 0%, #8b2a9b 100%);
                    color: #ffffff;
                    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                }

                .header-cta-button:hover {
                    background: linear-gradient(135deg, #b8511f 0%, #7a2487 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                }

                /* Mobile Menu Toggle */
                .mobile-menu-toggle {
                    display: none;
                    flex-direction: column;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.5rem;
                    z-index: 1001;
                    position: relative;
                }

                .mobile-menu-toggle span {
                    width: 24px;
                    height: 3px;
                    /* CONTRAST FIX: White hamburger lines with shadow */
                    background-color: #ffffff;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                    margin: 3px 0;
                    transition: all 0.3s ease;
                    border-radius: 2px;
                }

                /* Hamburger Animation */
                .mobile-menu-toggle.active span:nth-child(1) {
                    transform: rotate(45deg) translate(6px, 6px);
                }

                .mobile-menu-toggle.active span:nth-child(2) {
                    opacity: 0;
                }

                .mobile-menu-toggle.active span:nth-child(3) {
                    transform: rotate(-45deg) translate(6px, -6px);
                }

                /* Mobile Navigation Menu */
                .header-nav-links.mobile-menu {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100vh;
                    /* CONTRAST FIX: Darker background with better text contrast */
                    background: rgba(0, 0, 0, 0.95);
                    backdrop-filter: blur(20px);
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 2rem;
                    z-index: 1000;
                    transform: translateX(-100%);
                    transition: transform 0.3s ease;
                    padding: 2rem;
                }

                .header-nav-links.mobile-menu.active {
                    transform: translateX(0);
                }

                .header-nav-links.mobile-menu a {
                    /* CONTRAST FIX: White text on dark background */
                    color: #ffffff;
                    text-shadow: none;
                    font-size: 1.5rem;
                    font-weight: 600;
                    padding: 1rem 2rem;
                    border-radius: 1rem;
                    background: rgba(255, 255, 255, 0.1);
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    min-width: 200px;
                    text-align: center;
                    transition: all 0.3s ease;
                }

                .header-nav-links.mobile-menu a:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.4);
                    transform: scale(1.05);
                }

                /* Mobile Menu Backdrop */
                .mobile-menu-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    z-index: 999;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }

                .mobile-menu-backdrop.active {
                    opacity: 1;
                    visibility: visible;
                }

                /* Desktop and Tablet - Keep auth buttons visible */
                @media (min-width: 901px) {
                    .auth-buttons {
                        display: flex !important;
                        align-items: center;
                        gap: 1rem;
                    }
                    
                    .mobile-menu-toggle {
                        display: none !important;
                    }
                }

                /* Tablet responsive */
                @media (max-width: 1024px) {
                    .header-nav-links {
                        gap: 1.5rem;
                    }

                    .header-nav-links a {
                        font-size: 1rem;
                    }

                    .header-actions {
                        gap: 1rem;
                    }
                }

                /* Mobile responsive */
                @media (max-width: 900px) {
                    .header-nav {
                        padding: 0 1.5rem;
                    }

                    .header-nav-links:not(.mobile-menu) {
                        display: none;
                    }

                    .mobile-menu-toggle {
                        display: flex !important;
                    }

                    .auth-buttons {
                        display: none !important;
                    }

                    .header-actions {
                        gap: 1rem !important;
                        justify-content: flex-end;
                    }

                    .language-toggle {
                        gap: 0.125rem;
                        padding: 0.125rem;
                    }

                    .lang-button {
                        padding: 0.375rem 0.5rem !important;
                        font-size: 0.75rem !important;
                        min-width: 28px !important;
                        height: 28px !important;
                    }
                }

                @media (max-width: 480px) {
                    #header {
                        padding: 0.875rem 0;
                    }

                    .header-nav {
                        padding: 0 1rem;
                    }

                    .header-logo {
                        font-size: 1.25rem;
                    }

                    .header-logo-icon {
                        width: 1.75rem;
                        height: 1.75rem;
                        font-size: 1.75rem;
                    }

                    /* Even tighter spacing on very small screens */
                    .header-actions {
                        gap: 0.5rem !important;
                    }

                    .login-button {
                        padding: 0.5rem 0.625rem !important;
                        font-size: 0.875rem !important;
                    }

                    .header-cta-button {
                        padding: 0.5rem 0.75rem !important;
                        font-size: 0.875rem !important;
                    }
                }

                /* Accessibility improvements */
                @media (prefers-reduced-motion: reduce) {
                    *, *::before, *::after {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }
                }

                /* Focus states for keyboard navigation */
                .header-nav-links a:focus,
                .login-button:focus,
                .header-cta-button:focus,
                .lang-button:focus,
                .mobile-menu-toggle:focus {
                    outline: 2px solid #ffffff;
                    outline-offset: 2px;
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    render() {
        // Create the header HTML step by step to properly handle active states
        const headerElement = document.createElement('header');
        headerElement.id = 'header';
        
        // Create the base structure
        headerElement.innerHTML = `
            <nav class="header-nav">
                <a href="/" class="header-logo">
                    <span class="header-logo-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M12 3c1.918 0 3.52 1.35 3.91 3.151a4 4 0 0 1 2.09 7.723l0 7.126h-12v-7.126a4 4 0 1 1 2.092 -7.723a4 4 0 0 1 3.908 -3.151z" />
                            <path d="M6.161 17.009l11.839 -.009" />
                        </svg>
                    </span>
                    <span>ChefSocial</span>
                </a>
                
                <ul class="header-nav-links" id="navLinks">
                    <li><a href="/#features" data-i18n="nav.features">Features</a></li>
                    <li><a href="/#how-it-works" data-i18n="nav.how-it-works">How It Works</a></li>
                    <li><a href="/demo.html" data-i18n="nav.demo">Demo</a></li>
                    <li><a href="/register.html" data-i18n="nav.pricing">Pricing</a></li>
                </ul>
                
                <div class="header-actions">
                    <div class="language-toggle">
                        <button class="lang-btn" data-lang="en">EN</button>
                        <button class="lang-btn" data-lang="fr">FR</button>
                    </div>
                    
                    <div class="auth-buttons">
                        <a href="/login.html" class="login-button" data-i18n="nav.login">Login</a>
                        <a href="/register.html" class="header-cta-button" data-i18n="nav.get-started">Get Started</a>
                    </div>
                    
                    <button class="mobile-menu-toggle" id="mobileMenuToggle">
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                    </button>
                </div>
            </nav>
        `;

        // Insert header at the beginning of body
        document.body.insertBefore(headerElement, document.body.firstChild);
        this.headerElement = headerElement;

        // Set active language button after DOM insertion
        this.updateLanguageButtons();
    }

    setupEventListeners() {
        // Language switching with direct event binding
        const langButtons = this.headerElement.querySelectorAll('.lang-btn');
        langButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = btn.dataset.lang;
                console.log('Language button clicked:', lang);
                this.setLanguage(lang);
                
                // Dispatch custom event for other components
                window.dispatchEvent(new CustomEvent('languageChanged', {
                    detail: { language: lang }
                }));
            });
        });

        // Mobile menu toggle
        this.mobileToggle = document.getElementById('mobileMenuToggle');
        this.navLinks = document.getElementById('navLinks');
        
        console.log('Mobile toggle found:', !!this.mobileToggle);
        console.log('Nav links found:', !!this.navLinks);
        
        if (this.mobileToggle && this.navLinks) {
            // Create mobile menu backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'mobile-menu-backdrop';
            backdrop.id = 'mobileMenuBackdrop';
            document.body.appendChild(backdrop);

            const toggleMobileMenu = (show) => {
                console.log('Toggling mobile menu:', show);
                if (show) {
                    this.navLinks.classList.add('active');
                    this.mobileToggle.classList.add('active');
                    backdrop.classList.add('active');
                    document.body.classList.add('mobile-menu-open');
                } else {
                    this.navLinks.classList.remove('active');
                    this.mobileToggle.classList.remove('active');
                    backdrop.classList.remove('active');
                    document.body.classList.remove('mobile-menu-open');
                }
            };

            this.mobileToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Mobile toggle clicked');
                const isActive = this.navLinks.classList.contains('active');
                toggleMobileMenu(!isActive);
            });

            // Close mobile menu when clicking backdrop
            backdrop.addEventListener('click', () => {
                toggleMobileMenu(false);
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#header') && this.navLinks.classList.contains('active')) {
                    toggleMobileMenu(false);
                }
            });

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.navLinks.classList.contains('active')) {
                    toggleMobileMenu(false);
                }
            });
        }

        // Close mobile menu on link click
        const navLinksElements = document.querySelectorAll('.header-nav-links a');
        navLinksElements.forEach(link => {
            link.addEventListener('click', () => {
                const backdrop = document.getElementById('mobileMenuBackdrop');
                if (this.navLinks) this.navLinks.classList.remove('active');
                if (this.mobileToggle) this.mobileToggle.classList.remove('active');
                if (backdrop) backdrop.classList.remove('active');
                document.body.classList.remove('mobile-menu-open');
            });
        });

        // Initial translation
        this.translatePage();
    }

    updateScrollEffect() {
        const header = document.getElementById('header');
        if (!header) return;

        const handleScroll = () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check
    }

    setLanguage(lang) {
        console.log('Setting language to:', lang); // Debug
        this.currentLang = lang;
        localStorage.setItem('chefsocial-lang', lang);
        this.updateLanguageButtons();
        this.translatePage();
    }

    updateLanguageButtons() {
        console.log('Updating language buttons, current lang:', this.currentLang);
        const langButtons = this.headerElement.querySelectorAll('.lang-btn');
        langButtons.forEach(btn => {
            // Remove active class from all buttons first
            btn.classList.remove('active');
            // Add active class only to current language
            if (btn.dataset.lang === this.currentLang) {
                btn.classList.add('active');
                console.log(`Button ${btn.dataset.lang}: set to active`);
            }
        });
    }

    translatePage() {
        // This will be populated by the page's translation data
        const translations = window.translations || {};
        
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.dataset.i18n;
            const translation = translations[this.currentLang]?.[key];
            if (translation) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });
    }
}

// Debug function to inspect hamburger menu
window.debugHamburger = function() {
    const hamburger = document.getElementById('mobileMenuToggle');
    const headerActions = document.querySelector('.header-actions');
    
    console.log('🔍 Hamburger Debug Report:');
    console.log('Hamburger element:', hamburger);
    console.log('Header actions container:', headerActions);
    
    if (hamburger) {
        const rect = hamburger.getBoundingClientRect();
        const styles = window.getComputedStyle(hamburger);
        
        console.log('📐 Hamburger position:', rect);
        console.log('🎨 Hamburger computed styles:');
        console.log('  display:', styles.display);
        console.log('  visibility:', styles.visibility);
        console.log('  opacity:', styles.opacity);
        console.log('  position:', styles.position);
        console.log('  z-index:', styles.zIndex);
        console.log('  background:', styles.background);
        console.log('  width:', styles.width);
        console.log('  height:', styles.height);
        console.log('  overflow:', styles.overflow);
        
        // Force visibility with extreme measures
        hamburger.style.cssText = `
            display: flex !important;
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 99999 !important;
            background: red !important;
            border: 5px solid yellow !important;
            width: 80px !important;
            height: 80px !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        
        console.log('🚨 Applied emergency positioning to hamburger menu');
    } else {
        console.log('❌ Hamburger element not found!');
    }
};

// Initialize header when DOM is ready - cleaner approach
function initializeHeader() {
    if (document.getElementById('header')) {
        console.log('Header already exists, skipping initialization');
        return;
    }
    new HeaderComponent();
}

// Handle different loading states
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHeader);
} else {
    initializeHeader();
}