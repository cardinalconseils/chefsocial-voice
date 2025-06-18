// External JavaScript for multilingual test page
let currentLanguage = 'en';

const translations = {
    en: {
        title: '🍽️ ChefSocial Multilingual Test',
        subtitle: 'Test voice processing in English and French',
        demoTitle: 'Voice Demo Test',
        demoInstructions: 'Click the button below to test voice processing with sample audio data:',
        demoButtonText: 'Test Voice Processing',
        languageApiTitle: 'Language API Test',
        languageApiInstructions: 'Test language detection and switching:',
        languageApiButtonText: 'Test Language Detection',
        statusLabel: 'Status:',
        statusReady: 'Ready to test',
        testing: 'Testing...',
        error: 'Error occurred',
        success: 'Test completed successfully'
    },
    fr: {
        title: '🍽️ Test Multilingue ChefSocial',
        subtitle: 'Testez le traitement vocal en anglais et français',
        demoTitle: 'Test Démo Vocal',
        demoInstructions: 'Cliquez sur le bouton ci-dessous pour tester le traitement vocal avec des données audio d\'exemple :',
        demoButtonText: 'Tester le Traitement Vocal',
        languageApiTitle: 'Test API Langue',
        languageApiInstructions: 'Testez la détection et le changement de langue :',
        languageApiButtonText: 'Tester la Détection de Langue',
        statusLabel: 'Statut :',
        statusReady: 'Prêt à tester',
        testing: 'Test en cours...',
        error: 'Erreur survenue',
        success: 'Test terminé avec succès'
    }
};

function setLanguage(lang) {
    currentLanguage = lang;
    
    // Update active button
    document.getElementById('lang-en').classList.toggle('active', lang === 'en');
    document.getElementById('lang-fr').classList.toggle('active', lang === 'fr');
    
    // Update text content
    const t = translations[lang];
    document.getElementById('title').textContent = t.title;
    document.getElementById('subtitle').textContent = t.subtitle;
    document.getElementById('demo-title').textContent = t.demoTitle;
    document.getElementById('demo-instructions').textContent = t.demoInstructions;
    document.getElementById('demo-button-text').textContent = t.demoButtonText;
    document.getElementById('language-api-title').textContent = t.languageApiTitle;
    document.getElementById('language-api-instructions').textContent = t.languageApiInstructions;
    document.getElementById('language-api-button-text').textContent = t.languageApiButtonText;
    document.getElementById('status-label').textContent = t.statusLabel;
    document.getElementById('status-text').textContent = t.statusReady;
}

function updateStatus(key) {
    const t = translations[currentLanguage];
    document.getElementById('status-text').textContent = t[key] || key;
}

async function testVoiceDemo() {
    const button = document.getElementById('demo-button');
    const results = document.getElementById('demo-results');
    
    button.disabled = true;
    updateStatus('testing');
    results.style.display = 'none';

    try {
        // Create sample base64 audio data (this is just a placeholder)
        const sampleAudio = 'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUdBDOJ0fHNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUdBDOJ0fHNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUdBDOJ0fHNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUdBDOJ0fHNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUdBDOJ0fHNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUdBDOJ0fHNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUdBDOJ0fHNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUdBDOJ0fHNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUdBDOJ0fHNeSsFJHfH8N2QQAoUXrTp66hVFA==';
        
        const response = await fetch('/api/process-voice-demo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audio: sampleAudio,
                language: currentLanguage
            })
        });

        const data = await response.json();

        if (data.success) {
            updateStatus('success');
            displayVoiceResults(data);
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (error) {
        updateStatus('error');
        displayError('Voice Demo Error: ' + error.message);
    } finally {
        button.disabled = false;
    }
}

async function testLanguageAPI() {
    updateStatus('testing');
    const results = document.getElementById('language-results');
    results.style.display = 'none';

    try {
        const response = await fetch('/api/languages');
        const data = await response.json();

        if (data.success) {
            updateStatus('success');
            displayLanguageResults(data);
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (error) {
        updateStatus('error');
        displayError('Language API Error: ' + error.message);
    }
}

function displayVoiceResults(data) {
    const results = document.getElementById('demo-results');
    results.innerHTML = `
        <div class="results">
            <h4>Voice Processing Results (${currentLanguage.toUpperCase()})</h4>
            <div class="content-block">
                <strong>Transcript:</strong><br>
                ${data.transcript}
            </div>
            <div class="content-block">
                <strong>Instagram Content:</strong><br>
                <em>Caption:</em> ${data.content.instagram.caption}<br>
                <em>Hashtags:</em> ${data.content.instagram.hashtags}
            </div>
            <div class="content-block">
                <strong>TikTok Content:</strong><br>
                <em>Caption:</em> ${data.content.tiktok.caption}<br>
                <em>Hashtags:</em> ${data.content.tiktok.hashtags}
            </div>
            <div class="content-block">
                <strong>Viral Potential:</strong> ${data.content.viralPotential}/10<br>
                <strong>Best Time:</strong> ${data.content.bestTime}<br>
                ${data.content.demoNote ? `<em>${data.content.demoNote}</em>` : ''}
            </div>
        </div>
    `;
    results.style.display = 'block';
}

function displayLanguageResults(data) {
    const results = document.getElementById('language-results');
    results.innerHTML = `
        <div class="results">
            <h4>Language Detection Results</h4>
            <div class="content-block">
                <strong>Current Language:</strong> ${data.current}<br>
                <strong>Available Languages:</strong><br>
                ${data.languages.map(lang => 
                    `• ${lang.code}: ${lang.name} (${lang.nativeName})`
                ).join('<br>')}
            </div>
        </div>
    `;
    results.style.display = 'block';
}

function displayError(message) {
    const results = document.getElementById('demo-results');
    results.innerHTML = `
        <div class="results error">
            <strong>Error:</strong> ${message}
        </div>
    `;
    results.style.display = 'block';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    setLanguage('en');
    
    // Add event listeners
    document.getElementById('lang-en').addEventListener('click', () => setLanguage('en'));
    document.getElementById('lang-fr').addEventListener('click', () => setLanguage('fr'));
    document.getElementById('demo-button').addEventListener('click', testVoiceDemo);
    document.getElementById('language-api-button').addEventListener('click', testLanguageAPI);
});