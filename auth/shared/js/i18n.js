// Translation data
const translations = {
    en: {
        'login.hero.title': 'Welcome Back to ChefSocial',
        'login.hero.subtitle': 'Continue your culinary content creation journey with our AI-powered platform',
        'login.hero.feature1': 'Voice-to-content AI technology',
        'login.hero.feature2': 'Professional recipe generation',
        'login.hero.feature3': 'Multi-language support',
        'login.hero.feature4': 'Social media optimization',
        'login.title': 'Sign In',
        'login.subtitle': 'Access your account and continue creating',
        'login.demo.title': '🎯 Want to try before you sign in?',
        'login.demo.description': 'Experience our AI-powered food content creation with our free demo',
        'login.demo.button': 'Try Demo Now',
        'login.email': 'Email Address',
        'login.password': 'Password',
        'login.forgot': 'Forgot your password?',
        'login.submit': 'Sign In',
        'login.noAccount': 'Don\'t have an account?',
        'login.getStarted': 'Get started here',
        'register.title': 'Get Started',
        'register.subtitle': 'Create your account and start generating amazing content',
        'register.name': 'Full Name',
        'register.email': 'Email Address',
        'register.password': 'Password',
        'register.confirmPassword': 'Confirm Password',
        'register.submit': 'Create Account',
        'register.hasAccount': 'Already have an account?',
        'register.signIn': 'Sign in here',
        'footer.description': 'AI-powered voice-to-content platform for restaurants and food creators.',
        'footer.product.title': 'Product',
        'footer.product.demo': 'Demo',
        'footer.product.pricing': 'Pricing',
        'footer.product.features': 'Features',
        'footer.company.title': 'Company',
        'footer.company.about': 'About',
        'footer.company.contact': 'Contact',
        'footer.company.blog': 'Blog',
        'footer.legal.title': 'Legal',
        'footer.legal.privacy': 'Privacy Policy',
        'footer.legal.terms': 'Terms of Service',
        'footer.legal.cookies': 'Cookie Policy',
        'footer.copyright': '© 2024 ChefSocial Voice. All rights reserved.'
    },
    fr: {
        'login.hero.title': 'Bon Retour sur ChefSocial',
        'login.hero.subtitle': 'Continuez votre parcours de création de contenu culinaire avec notre plateforme alimentée par l\'IA',
        'login.hero.feature1': 'Technologie IA voix-vers-contenu',
        'login.hero.feature2': 'Génération de recettes professionnelles',
        'login.hero.feature3': 'Support multi-langues',
        'login.hero.feature4': 'Optimisation des médias sociaux',
        'login.title': 'Se Connecter',
        'login.subtitle': 'Accédez à votre compte et continuez à créer',
        'login.demo.title': '🎯 Vous voulez essayer avant de vous connecter ?',
        'login.demo.description': 'Expérimentez notre création de contenu alimentaire alimentée par l\'IA avec notre démo gratuite',
        'login.demo.button': 'Essayer la Démo',
        'login.email': 'Adresse Email',
        'login.password': 'Mot de Passe',
        'login.forgot': 'Mot de passe oublié ?',
        'login.submit': 'Se Connecter',
        'login.noAccount': 'Vous n\'avez pas de compte ?',
        'login.getStarted': 'Commencez ici',
        'register.title': 'Commencer',
        'register.subtitle': 'Créez votre compte et commencez à générer du contenu incroyable',
        'register.name': 'Nom Complet',
        'register.email': 'Adresse Email',
        'register.password': 'Mot de Passe',
        'register.confirmPassword': 'Confirmer le Mot de Passe',
        'register.submit': 'Créer un Compte',
        'register.hasAccount': 'Vous avez déjà un compte ?',
        'register.signIn': 'Connectez-vous ici',
        'footer.description': 'Plateforme vocale-vers-contenu alimentée par l\'IA pour restaurants et créateurs culinaires.',
        'footer.product.title': 'Produit',
        'footer.product.demo': 'Démo',
        'footer.product.pricing': 'Tarification',
        'footer.product.features': 'Fonctionnalités',
        'footer.company.title': 'Entreprise',
        'footer.company.about': 'À Propos',
        'footer.company.contact': 'Contact',
        'footer.company.blog': 'Blog',
        'footer.legal.title': 'Légal',
        'footer.legal.privacy': 'Politique de Confidentialité',
        'footer.legal.terms': 'Conditions d\'Utilisation',
        'footer.legal.cookies': 'Politique des Cookies',
        'footer.copyright': '© 2024 ChefSocial Voice. Tous droits réservés.'
    }
};

// Language manager
class LanguageManager {
    constructor() {
        this.currentLang = localStorage.getItem('chefsocial-lang') || 'en';
        this.init();
    }

    init() {
        this.updateLanguageButtons();
        this.translatePage();
        this.setupLanguageToggle();
    }

    setupLanguageToggle() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                this.setLanguage(lang);
            });
        });
    }

    setLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('chefsocial-lang', lang);
        this.updateLanguageButtons();
        this.translatePage();
    }

    updateLanguageButtons() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === this.currentLang);
        });
    }

    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.dataset.i18n;
            const translation = translations[this.currentLang]?.[key];
            if (translation) {
                if (element.tagName === 'INPUT' && element.type === 'button') {
                    element.value = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });
    }

    t(key) {
        return translations[this.currentLang]?.[key] || translations.en[key] || key;
    }

    getCurrentLanguage() {
        return this.currentLang;
    }
}

// Initialize language manager
const lang = new LanguageManager();