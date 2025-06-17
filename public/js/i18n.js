// Internationalization system for ChefSocial
class I18nManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('chefsocial-lang') || 'en';
        this.translations = {
            en: {
                nav: {
                    features: 'Features',
                    'how-it-works': 'How It Works',
                    demo: 'Demo',
                    pricing: 'Pricing',
                    login: 'Login',
                    getStarted: 'Get Started'
                },
                footer: {
                    description: 'AI-powered voice-to-content platform for restaurants and food creators.',
                    copyright: '© 2024 ChefSocial. All rights reserved.',
                    product: {
                        title: 'Product',
                        demo: 'Demo',
                        pricing: 'Pricing',
                        features: 'Features'
                    },
                    company: {
                        title: 'Company',
                        about: 'About',
                        contact: 'Contact',
                        blog: 'Blog'
                    },
                    legal: {
                        title: 'Legal',
                        privacy: 'Privacy Policy',
                        terms: 'Terms of Service',
                        cookies: 'Cookie Policy'
                    },
                    newsletter: {
                        title: 'Stay Updated',
                        description: 'Get the latest features and food content tips delivered to your inbox.',
                        placeholder: 'Enter your email',
                        button: 'Subscribe',
                        subscribing: 'Subscribing...',
                        success: 'Subscribed!',
                        error: 'Try again'
                    }
                }
            },
            fr: {
                nav: {
                    features: 'Fonctionnalités',
                    'how-it-works': 'Comment ça marche',
                    demo: 'Démo',
                    pricing: 'Tarifs',
                    login: 'Connexion',
                    getStarted: 'Commencer'
                },
                footer: {
                    description: 'Plateforme de création de contenu alimentaire alimentée par l\'IA vocale pour les restaurants et créateurs culinaires.',
                    copyright: '© 2024 ChefSocial. Tous droits réservés.',
                    product: {
                        title: 'Produit',
                        demo: 'Démo',
                        pricing: 'Tarifs',
                        features: 'Fonctionnalités'
                    },
                    company: {
                        title: 'Entreprise',
                        about: 'À propos',
                        contact: 'Contact',
                        blog: 'Blog'
                    },
                    legal: {
                        title: 'Légal',
                        privacy: 'Politique de confidentialité',
                        terms: 'Conditions d\'utilisation',
                        cookies: 'Politique des cookies'
                    },
                    newsletter: {
                        title: 'Restez informé',
                        description: 'Recevez les dernières fonctionnalités et conseils de contenu culinaire dans votre boîte mail.',
                        placeholder: 'Entrez votre email',
                        button: 'S\'abonner',
                        subscribing: 'Abonnement...',
                        success: 'Abonné!',
                        error: 'Réessayez'
                    }
                }
            }
        };
        
        this.init();
    }

    init() {
        // Listen for language change events
        window.addEventListener('languageChanged', (e) => {
            this.setLanguage(e.detail.language);
        });
        
        // Apply initial translations
        this.updateTranslations();
    }

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('chefsocial-lang', lang);
            this.updateTranslations();
        }
    }

    updateTranslations() {
        // Update text content
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            if (translation) {
                element.textContent = translation;
            }
        });
        
        // Update placeholders
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.getTranslation(key);
            if (translation) {
                element.placeholder = translation;
            }
        });
        
        // Update HTML lang attribute
        document.documentElement.lang = this.currentLanguage;
    }

    getTranslation(key) {
        const keys = key.split('.');
        let translation = this.translations[this.currentLanguage];
        
        for (const k of keys) {
            if (translation && translation[k]) {
                translation = translation[k];
            } else {
                // Fallback to English if translation not found
                translation = this.translations.en;
                for (const k of keys) {
                    if (translation && translation[k]) {
                        translation = translation[k];
                    } else {
                        return key; // Return key if no translation found
                    }
                }
                break;
            }
        }
        
        return translation;
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    window.i18nManager = new I18nManager();
}