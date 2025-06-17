// Minimal ChefSocial server for testing multilingual functionality
require('dotenv').config();
const express = require('express');
const path = require('path');
const I18nManager = require('./i18n');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize I18n Manager
const i18n = new I18nManager();

// Basic middleware
app.use(express.json());

// Relaxed CSP for development/testing
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "script-src-attr 'unsafe-inline';"
    );
    next();
});

app.use(express.static('public'));
app.use(i18n.middleware());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        language: req.language || 'en',
        message: req.t('common.success')
    });
});

// Languages API
app.get('/api/languages', (req, res) => {
    const languages = i18n.getAvailableLanguages();
    res.json({ 
        success: true, 
        languages: languages,
        current: req.language || i18n.defaultLanguage
    });
});

// Simple voice demo
app.post('/api/process-voice-demo', async (req, res) => {
    try {
        const { audio, language } = req.body;
        const userLanguage = language || req.language || 'en';
        
        // Simple multilingual content generation
        const content = {
            instagram: {
                caption: userLanguage === 'fr' 
                    ? "🍽️ Découvrez ce délicieux plat ! Quel est votre plat préféré à cuisiner ? Dites-nous en commentaires ! 👇✨"
                    : "🍽️ Check out this amazing dish! What's your favorite dish to cook? Let us know in the comments! 👇✨",
                hashtags: userLanguage === 'fr'
                    ? "#chef #restaurantfr #gastronomie #delicieux #nourriture #cuisine"
                    : "#chef #foodie #delicious #instafood #cooking #yummy"
            },
            tiktok: {
                caption: userLanguage === 'fr'
                    ? "Magie culinaire en cours ! ✨👨‍🍳"
                    : "Cooking magic happening! ✨👨‍🍳",
                hashtags: userLanguage === 'fr'
                    ? "#foodtok #chef #cuisine #delicieux #nourriture #fyp"
                    : "#foodtok #chef #cooking #yummy #food #fyp"
            },
            viralPotential: "7",
            bestTime: userLanguage === 'fr' ? "19h00" : "7:00 PM",
            language: userLanguage
        };

        res.json({
            success: true,
            transcript: userLanguage === 'fr' 
                ? "Je décris ce délicieux plat"
                : "I'm describing this delicious dish",
            content: content,
            demo: true,
            message: userLanguage === 'fr'
                ? "Mode démo - Inscrivez-vous pour des fonctionnalités IA avancées !"
                : "Demo mode - Register for advanced AI features!"
        });
        
    } catch (error) {
        console.error('❌ Demo error:', error);
        res.status(500).json({
            success: false,
            error: 'Demo processing failed'
        });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🍽️ ChefSocial Minimal Server running on port ${PORT}`);
    console.log(`🌐 Test URLs:`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Languages: http://localhost:${PORT}/api/languages`);
    console.log(`   Test page: http://localhost:${PORT}/multilingual-test.html`);
});

// Error handling
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});