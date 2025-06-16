// ChefSocial Internationalization (i18n) System
const fs = require('fs');
const path = require('path');

class I18nManager {
    constructor() {
        this.translations = new Map();
        this.defaultLanguage = 'en';
        this.supportedLanguages = ['en', 'fr'];
        this.loadTranslations();
    }

    // Load all translation files
    loadTranslations() {
        this.supportedLanguages.forEach(lang => {
            try {
                const filePath = path.join(__dirname, 'translations', `${lang}.json`);
                if (fs.existsSync(filePath)) {
                    const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    this.translations.set(lang, translations);
                    console.log(`✅ Loaded ${lang} translations`);
                } else {
                    console.warn(`⚠️ Translation file not found: ${filePath}`);
                }
            } catch (error) {
                console.error(`❌ Error loading ${lang} translations:`, error);
            }
        });
    }

    // Get translation for a key
    t(key, language = this.defaultLanguage, variables = {}) {
        const lang = this.isSupported(language) ? language : this.defaultLanguage;
        const translations = this.translations.get(lang) || this.translations.get(this.defaultLanguage);
        
        if (!translations) {
            console.warn(`⚠️ No translations found for language: ${lang}`);
            return key;
        }

        // Navigate nested keys (e.g., 'auth.login.title')
        const value = this.getNestedValue(translations, key);
        
        if (value === undefined) {
            console.warn(`⚠️ Translation key not found: ${key} for language: ${lang}`);
            // Fallback to default language
            if (lang !== this.defaultLanguage) {
                return this.t(key, this.defaultLanguage, variables);
            }
            return key;
        }

        // Replace variables in translation
        return this.replaceVariables(value, variables);
    }

    // Get nested value from object using dot notation
    getNestedValue(obj, key) {
        return key.split('.').reduce((current, prop) => {
            return current && current[prop] !== undefined ? current[prop] : undefined;
        }, obj);
    }

    // Replace variables in translation string
    replaceVariables(text, variables) {
        if (typeof text !== 'string' || !variables || Object.keys(variables).length === 0) {
            return text;
        }

        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return variables[key] !== undefined ? variables[key] : match;
        });
    }

    // Check if language is supported
    isSupported(language) {
        return this.supportedLanguages.includes(language);
    }

    // Detect language from various sources
    detectLanguage(req) {
        // Priority order: URL param > User preference > Accept-Language header > Geolocation > Default
        
        // 1. Check URL parameter
        if (req.query.lang && this.isSupported(req.query.lang)) {
            return req.query.lang;
        }

        // 2. Check user preferences (if authenticated)
        if (req.user && req.user.preferred_language && this.isSupported(req.user.preferred_language)) {
            return req.user.preferred_language;
        }

        // 3. Check Accept-Language header
        const acceptLanguage = req.headers['accept-language'];
        if (acceptLanguage) {
            const languages = this.parseAcceptLanguage(acceptLanguage);
            for (const lang of languages) {
                if (this.isSupported(lang)) {
                    return lang;
                }
            }
        }

        // 4. Geolocation-based detection (simplified)
        const clientIP = req.ip || req.connection.remoteAddress;
        const geoLanguage = this.detectLanguageByGeo(clientIP);
        if (geoLanguage && this.isSupported(geoLanguage)) {
            return geoLanguage;
        }

        // 5. Default fallback
        return this.defaultLanguage;
    }

    // Parse Accept-Language header
    parseAcceptLanguage(acceptLanguage) {
        return acceptLanguage
            .split(',')
            .map(lang => {
                const parts = lang.trim().split(';');
                const code = parts[0].split('-')[0]; // Get primary language code
                return code;
            })
            .filter(lang => lang.length === 2);
    }

    // Simple geolocation-based language detection
    detectLanguageByGeo(ip) {
        // This is a simplified version. In production, use a real geolocation service
        if (!ip || ip === '127.0.0.1' || ip === '::1') {
            return null; // localhost
        }

        // Canadian IP ranges (simplified) - detect French for Quebec
        if (ip.startsWith('142.') || ip.startsWith('206.167.')) {
            return 'fr'; // Likely Quebec, Canada
        }

        // This would need a proper IP geolocation database
        return null;
    }

    // Get all available languages
    getAvailableLanguages() {
        return this.supportedLanguages.map(lang => ({
            code: lang,
            name: this.t(`languages.${lang}`, lang),
            nativeName: this.getNativeName(lang)
        }));
    }

    // Get native name for language
    getNativeName(language) {
        const nativeNames = {
            'en': 'English',
            'fr': 'Français'
        };
        return nativeNames[language] || language;
    }

    // Middleware for Express.js
    middleware() {
        return (req, res, next) => {
            // Detect and set language
            const detectedLanguage = this.detectLanguage(req);
            req.language = detectedLanguage;
            
            // Add translation function to request
            req.t = (key, variables = {}) => {
                return this.t(key, req.language, variables);
            };

            // Add language info to response locals for templates
            res.locals.language = detectedLanguage;
            res.locals.t = req.t;
            res.locals.availableLanguages = this.getAvailableLanguages();

            next();
        };
    }

    // Format numbers according to locale
    formatNumber(number, language = this.defaultLanguage) {
        const locales = {
            'en': 'en-US',
            'fr': 'fr-CA'
        };
        
        const locale = locales[language] || locales[this.defaultLanguage];
        return new Intl.NumberFormat(locale).format(number);
    }

    // Format currency according to locale
    formatCurrency(amount, language = this.defaultLanguage) {
        const locales = {
            'en': { locale: 'en-US', currency: 'USD' },
            'fr': { locale: 'fr-CA', currency: 'CAD' }
        };
        
        const config = locales[language] || locales[this.defaultLanguage];
        return new Intl.NumberFormat(config.locale, {
            style: 'currency',
            currency: config.currency
        }).format(amount);
    }

    // Format date according to locale
    formatDate(date, language = this.defaultLanguage, options = {}) {
        const locales = {
            'en': 'en-US',
            'fr': 'fr-CA'
        };
        
        const locale = locales[language] || locales[this.defaultLanguage];
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        
        return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(new Date(date));
    }

    // Get RTL support info (for future Arabic support)
    isRTL(language) {
        const rtlLanguages = ['ar', 'he', 'fa']; // Arabic, Hebrew, Persian
        return rtlLanguages.includes(language);
    }
}

module.exports = I18nManager;