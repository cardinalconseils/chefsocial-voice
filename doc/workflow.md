# ChefSocial - Complete Workflow & Tech Stack Documentation

## 🎯 Overview

ChefSocial is an AI-powered social media platform for restaurants and culinary professionals that transforms simple food photos into viral social media content through voice conversations and intelligent automation.

### Core Value Proposition
**"Raw Food Photo → Voice Conversation → AI Image Enhancement → Content Generation → Smart Publishing"**

---

## 🏗️ Technical Architecture

### Tech Stack Components
- **OpenAI RealTime API**: Voice AI conversations and user interaction
- **N8N**: Workflow orchestration and AI model coordination
- **Marketing Site**: chefsocial.io (React + TypeScript)
- **App**: app.chefsocial.io (React + TypeScript + PWA)
- **AI Models**: OpenRouter (GPT-4o, Claude 3.5, Gemini Pro)
- **Image Enhancement**: Fal.ai, Adobe Firefly API
- **Database**: PostgreSQL with Drizzle ORM
- **Payments**: Stripe with subscription management

### Integration Flow
```
Marketing Site/App → VAPI Conversation → N8N Workflow → AI Processing → Database → Publishing
```

---

## 🌊 Complete User Workflows

### Workflow 1: Marketing Demo (chefsocial.io)
**Goal**: Convert website visitors to trial customers

```mermaid
graph TD
    A[User visits chefsocial.io] --> B[Uploads food photo]
    B --> C[Language detection & routing]
    C --> D[VAPI voice conversation]
    D --> E[Context-driven image enhancement]
    E --> F[AI content generation]
    F --> G[Content preview display]
    G --> H[Email capture]
    H --> I[Trial signup conversion]
```

### Workflow 2: App Content Creation (app.chefsocial.io)
**Goal**: Enable voice-powered content creation for users

```mermaid
graph TD
    A[User uploads photo in app] --> B[VAPI conversation starts]
    B --> C[Story & context extraction]
    C --> D[Image enhancement based on story]
    D --> E[Multi-platform content generation]
    E --> F[User review & approval]
    F --> G[Smart scheduling & publishing]
```

### Workflow 3: SMS Upload Automation
**Goal**: Complete hands-free content creation

```mermaid
graph TD
    A[Photo received via SMS] --> B[SMS notification sent]
    B --> C[2-minute delay]
    C --> D[VAPI calls user]
    D --> E[Voice conversation]
    E --> F[Context-aware enhancement]
    F --> G[Content generation]
    G --> H[SMS approval request]
    H --> I[Auto-publishing on approval]
```

---

## 🎙️ VAPI Configuration

### Assistant Setup by Language

#### French (Quebec) Assistant
```yaml
Assistant ID: chefsocial-demo-french
Language: fr-CA
Voice Provider: 11labs
Voice ID: french-chef-voice-id

System Message: |
  Tu es l'assistant IA de ChefSocial, spécialisé dans la création de contenu viral 
  pour les restaurants. Parle naturellement en français québécois, avec le ton 
  chaleureux d'un chef qui parle à un autre chef. Utilise "on" plutôt que "nous".
  
  Ton rôle:
  1. Accueillir chaleureusement l'utilisateur
  2. Demander l'histoire derrière le plat
  3. Extraire le contexte émotionnel et culturel
  4. Identifier l'audience cible
  5. Comprendre l'objectif de publication
  
  Garde la conversation sous 2 minutes pour la démo, 5 minutes pour l'app.

Variables to Extract:
  - dish_story: "l'inspiration et l'histoire du plat"
  - target_audience: "pour qui ce contenu est destiné"
  - desired_mood: "l'ambiance émotionnelle voulue"
  - cuisine_context: "contexte culturel ou style"
  - posting_urgency: "quand ils veulent publier"
  - restaurant_personality: "personnalité de la marque"
```

#### English (North America) Assistant
```yaml
Assistant ID: chefsocial-demo-english
Language: en-US
Voice Provider: 11labs
Voice ID: english-chef-voice-id

System Message: |
  You are ChefSocial's AI assistant, specialized in creating viral social media 
  content for restaurants. Speak with the warm, professional energy of a chef 
  talking to another culinary professional.
  
  Your role:
  1. Welcome the user enthusiastically
  2. Ask about the story behind the dish
  3. Extract emotional and cultural context
  4. Identify target audience
  5. Understand posting goals
  
  Keep demo conversations under 2 minutes, app conversations under 5 minutes.

Variables to Extract:
  - dish_story: "the inspiration and background story"
  - target_audience: "who this content is for"
  - desired_mood: "the emotional vibe they want"
  - cuisine_context: "cultural or style context"
  - posting_urgency: "when they want to post"
  - restaurant_personality: "their brand character"
```

#### Spanish (Mexican) Assistant
```yaml
Assistant ID: chefsocial-demo-spanish
Language: es-MX
Voice Provider: 11labs
Voice ID: spanish-chef-voice-id

System Message: |
  Eres el asistente IA de ChefSocial, especializado en crear contenido viral 
  para redes sociales de restaurantes. Habla con el calor y entusiasmo de un 
  chef mexicano hablando con otro profesional culinario.
  
  Tu función:
  1. Dar la bienvenida con entusiasmo
  2. Preguntar sobre la historia del platillo
  3. Extraer contexto emocional y cultural
  4. Identificar la audiencia objetivo
  5. Entender los objetivos de publicación
  
  Mantén las conversaciones de demo bajo 2 minutos, app bajo 5 minutos.

Variables to Extract:
  - dish_story: "la inspiración e historia del platillo"
  - target_audience: "para quién es este contenido"
  - desired_mood: "el ambiente emocional deseado"
  - cuisine_context: "contexto cultural o estilo"
  - posting_urgency: "cuándo quieren publicar"
  - restaurant_personality: "personalidad de la marca"
```

### VAPI Conversation Flow Structure

#### Demo Conversation Script
```
1. Opening (15 seconds)
   "Bonjour! Bienvenue à ChefSocial! Je suis votre assistant IA qui crée 
   du contenu viral pour les restaurants."

2. Engagement (30-45 seconds)
   "Pour vous montrer comment ça marche, parlez-moi de ce plat - quelle 
   est l'histoire derrière cette création?"

3. Processing (15 seconds)
   "Incroyable! Je peux déjà voir que ça a un énorme potentiel viral. 
   Laissez-moi analyser ça..."

4. Generation (10 seconds)
   "Je génère du contenu pour Instagram, TikTok et Facebook maintenant... 
   Ça prend 10 secondes avec ChefSocial vs des heures manuellement!"

5. Conversion (30 seconds)
   "Parfait! Votre contenu est prêt et il a l'air incroyable. Vous pouvez 
   voir l'aperçu sur le site. Voulez-vous un accès instantané pour essayer 
   ça pour votre restaurant?"
```

#### App Conversation Script
```
1. Context Gathering (1-2 minutes)
   "Je vois votre plat et il a l'air délicieux! Pour créer le meilleur 
   contenu possible, racontez-moi l'histoire - qu'est-ce qui vous a inspiré?"

2. Platform Strategy (1 minute)
   "Sur quelles plateformes voulez-vous publier? Instagram pour les visuels, 
   TikTok pour les tendances, Facebook pour la communauté?"

3. Audience Targeting (1 minute)
   "Qui est votre clientèle cible? Familles, jeunes professionnels, 
   amateurs de gastronomie?"

4. Final Confirmation (30 seconds)
   "Parfait! Je crée maintenant du contenu personnalisé qui capture 
   l'essence de votre plat et parle à votre audience."
```

---

## 🔧 N8N Workflow Configurations

### Core Workflow: Content Generation Pipeline

#### Webhook Entry Points
```yaml
Marketing Demo: POST /webhook/vapi-demo-complete
App Content: POST /webhook/vapi-app-content
SMS Content: POST /webhook/vapi-sms-content
Review Response: POST /webhook/review-received
```

#### Workflow 1: Demo Content Generation

```json
{
  "name": "Demo Content Generation Workflow",
  "trigger": "VAPI demo completion webhook",
  "steps": [
    {
      "node": "Process VAPI Data",
      "type": "Function",
      "code": "// Extract conversation variables and prepare for AI processing"
    },
    {
      "node": "Context-Driven Image Enhancement",
      "type": "AI Agent",
      "model": "anthropic/claude-3-5-sonnet-20241022",
      "prompt": "Based on the conversation context: {{conversation_data}}, enhance this food image to match the story mood and target audience. Return enhancement instructions in JSON format."
    },
    {
      "node": "Apply Image Enhancement", 
      "type": "HTTP Request",
      "url": "https://api.fal.ai/enhance-image",
      "method": "POST"
    },
    {
      "node": "Generate Viral Content",
      "type": "AI Agent", 
      "model": "openai/gpt-4o",
      "prompt": "Create viral social media content based on: Image: {{enhanced_image}}, Story: {{dish_story}}, Audience: {{target_audience}}, Mood: {{desired_mood}}"
    },
    {
      "node": "Store Demo Results",
      "type": "HTTP Request",
      "url": "{{CHEFSOCIAL_API}}/api/demo/store-results"
    },
    {
      "node": "Trigger Email Conversion",
      "type": "HTTP Request", 
      "url": "{{CHEFSOCIAL_API}}/api/email/demo-conversion"
    }
  ]
}
```

#### Workflow 2: App Content Creation

```json
{
  "name": "App Content Creation Workflow",
  "trigger": "VAPI app conversation completion",
  "steps": [
    {
      "node": "Analyze Conversation Context",
      "type": "AI Agent",
      "model": "anthropic/claude-3-5-sonnet-20241022",
      "prompt": "Analyze this restaurant conversation and extract key context for content creation: {{vapi_transcript}}"
    },
    {
      "node": "Multi-Style Image Enhancement",
      "type": "AI Agent",
      "model": "anthropic/claude-3-5-sonnet-20241022", 
      "prompt": "Create 3 image enhancement options based on: Story context: {{context}}, Target platforms: {{platforms}}, Brand personality: {{brand}}"
    },
    {
      "node": "Generate Platform-Specific Content",
      "type": "AI Agent",
      "model": "openai/gpt-4o",
      "prompt": "Generate optimized content for each platform: Instagram (visual storytelling), TikTok (trending hooks), Facebook (community engagement)"
    },
    {
      "node": "Smart Scheduling Logic",
      "type": "AI Agent",
      "model": "anthropic/claude-3-5-sonnet-20241022",
      "prompt": "Determine optimal posting schedule based on: Content type: {{content_type}}, Urgency: {{posting_urgency}}, Platform best practices"
    },
    {
      "node": "Store Generated Content",
      "type": "HTTP Request",
      "url": "{{CHEFSOCIAL_API}}/api/content/store"
    },
    {
      "node": "Notify User",
      "type": "HTTP Request",
      "url": "{{CHEFSOCIAL_API}}/api/notifications/content-ready"
    }
  ]
}
```

#### Workflow 3: SMS Automation Pipeline

```json
{
  "name": "SMS Content Automation",
  "trigger": "SMS photo upload webhook", 
  "steps": [
    {
      "node": "Send Initial SMS",
      "type": "Twilio",
      "message": "Salut! 📸 J'ai reçu votre photo. Je vous appelle dans 2 minutes pour créer du contenu viral! 🚀"
    },
    {
      "node": "Wait 2 Minutes",
      "type": "Wait",
      "duration": "2 minutes"
    },
    {
      "node": "Initiate VAPI Call",
      "type": "HTTP Request",
      "url": "https://api.vapi.ai/call",
      "method": "POST"
    },
    {
      "node": "Process Voice Conversation",
      "type": "Function",
      "description": "Wait for VAPI webhook with conversation results"
    },
    {
      "node": "Context-Aware Enhancement",
      "type": "AI Agent",
      "model": "anthropic/claude-3-5-sonnet-20241022",
      "prompt": "Enhance this SMS photo based on voice conversation context: {{conversation_data}}"
    },
    {
      "node": "Generate Mobile-Optimized Content",
      "type": "AI Agent",
      "model": "openai/gpt-4o", 
      "prompt": "Create mobile-first content optimized for quick SMS approval and immediate posting"
    },
    {
      "node": "Send Approval SMS",
      "type": "Twilio",
      "message": "Votre contenu est prêt! {{content_preview}} Répondez OUI pour publier ou NON pour modifier."
    }
  ]
}
```

---

## 🎨 AI Prompt Engineering

### Image Enhancement Prompts

#### Context-Driven Enhancement
```yaml
Prompt: |
  You are ChefSocial's Image Enhancement Specialist. Based on the voice conversation context, 
  create enhancement instructions that match the story and target audience.

  Context: {{conversation_analysis}}
  Original Image: {{image_url}}
  
  Create enhancement instructions in JSON format:
  {
    "enhancement_type": "lighting|background|styling|promotional",
    "mood_direction": "cozy|elegant|trendy|rustic|modern",
    "lighting_adjustments": {
      "brightness": "increase|decrease|maintain",
      "contrast": "boost|soften|maintain", 
      "warmth": "warmer|cooler|neutral"
    },
    "background_treatment": {
      "style": "restaurant|home_kitchen|studio|outdoor",
      "blur_level": "none|slight|medium|heavy",
      "color_palette": ["color1", "color2", "color3"]
    },
    "cultural_context": "match conversation cultural cues",
    "platform_optimization": {
      "instagram": "square|vertical aspect ratio preferences",
      "tiktok": "vertical video-ready positioning",
      "facebook": "horizontal storytelling layout"
    }
  }

Temperature: 0.3
Max Tokens: 1200
```

#### Multi-Language Enhancement Context
```yaml
French Context: |
  Contexte culturel français: Élégance, tradition culinaire, présentation sophistiquée.
  Palette de couleurs: Tons chauds et sophistiqués.
  Style: Ambiance de restaurant français classique.

English Context: |
  Cultural context: Diverse, Instagram-friendly, trending aesthetic.
  Color palette: Vibrant, eye-catching, social media optimized.
  Style: Modern, clean, platform-ready presentation.

Spanish Context: |
  Contexto cultural: Colores ricos, tradiciones familiares, presentación vibrante.
  Paleta de colores: Cálidos, ricos, festivos.
  Estilo: Familiar, tradicional, acogedor.
```

### Content Generation Prompts

#### Multi-Platform Content Creation
```yaml
Prompt: |
  You are ChefSocial's Viral Content Generator. Create platform-specific social media content 
  that captures the essence of the dish story and appeals to the target audience.

  Input Data:
  - Enhanced Image: {{enhanced_image_url}}
  - Dish Story: {{dish_story}}
  - Target Audience: {{target_audience}}
  - Desired Mood: {{desired_mood}}
  - Cultural Context: {{cuisine_context}}
  - Restaurant Personality: {{restaurant_personality}}
  - Language: {{conversation_language}}

  Generate content in JSON format:
  {
    "instagram": {
      "caption": "Engaging story-driven caption with emojis and hooks",
      "hashtags": ["mix of trending and niche hashtags"],
      "story_text": "Overlay text for Instagram Stories",
      "reel_concept": "Video content idea for Reels"
    },
    "tiktok": {
      "caption": "Hook that stops scrolling within first 3 seconds",
      "hashtags": ["trending TikTok food hashtags"],
      "video_concept": "Trending format adaptation",
      "sound_suggestion": "Popular sound or original audio idea"
    },
    "facebook": {
      "post_text": "Community-engaging longer form content",
      "call_to_action": "Specific action for followers",
      "event_connection": "Link to restaurant events if applicable"
    },
    "engagement_prediction": {
      "viral_potential": "low|medium|high|viral",
      "estimated_reach": "projected reach numbers",
      "optimal_posting_time": "best time for this content"
    }
  }

  Style Guidelines:
  - Use natural, conversational tone
  - Include emotional hooks and storytelling elements
  - Optimize for platform algorithms
  - Maintain cultural authenticity
  - Include trending elements without losing brand voice

Temperature: 0.8
Max Tokens: 2500
```

#### Language-Specific Content Optimization
```yaml
French Optimization: |
  - Utilise un ton chaleureux et personnel
  - Inclus des expressions québécoises naturelles
  - Met l'accent sur la tradition et la technique culinaire
  - Hashtags: Mix de tendances françaises et québécoises
  - Évite les anglicismes, privilégie les termes culinaires français

English Optimization: |
  - Use engaging, trendy language
  - Include current social media slang and expressions
  - Focus on visual appeal and shareability
  - Hashtags: Mix of viral and niche food community tags
  - Emphasize convenience and lifestyle appeal

Spanish Optimization: |
  - Usa tono cálido y familiar
  - Incluye expresiones culturales mexicanas
  - Enfócate en tradición familiar y celebración
  - Hashtags: Mix de tendencias en español y cultura culinaria
  - Destaca aspectos comunitarios y de reunión familiar
```

---

## 📱 Application Integration

### Marketing Site (chefsocial.io)

#### Language Detection & Routing
```javascript
// Auto-detect user language and route to appropriate VAPI assistant
const detectUserLanguage = () => {
  const browserLang = navigator.language || navigator.userLanguage;
  const geoLocation = getUserGeoLocation();
  const urlParams = new URLSearchParams(window.location.search);
  
  // Priority: URL param > Geo location > Browser setting
  if (urlParams.get('lang')) return urlParams.get('lang');
  if (geoLocation.country === 'CA' && geoLocation.region === 'QC') return 'fr';
  if (geoLocation.country === 'MX') return 'es';
  return browserLang.startsWith('fr') ? 'fr' : 
         browserLang.startsWith('es') ? 'es' : 'en';
};

const getVAPIAssistant = (language) => {
  const assistantMap = {
    'fr': 'chefsocial-demo-french',
    'en': 'chefsocial-demo-english',
    'es': 'chefsocial-demo-spanish'
  };
  return assistantMap[language] || assistantMap['en'];
};
```

#### Demo Flow Integration
```javascript
// Voice demo initiation
const startVoiceDemo = async (imageFile) => {
  const language = detectUserLanguage();
  const assistantId = getVAPIAssistant(language);
  
  // Upload image first
  const imageUpload = await uploadDemoImage(imageFile);
  
  // Start VAPI conversation
  await vapi.start({
    assistantId: assistantId,
    metadata: {
      demo_session_id: generateSessionId(),
      image_url: imageUpload.url,
      language: language,
      utm_source: getUTMSource(),
      visitor_id: getVisitorId()
    }
  });
  
  // Show demo UI
  showDemoInterface(language);
};

// Listen for demo completion
vapi.on('call-end', async (callData) => {
  const contentPreview = await waitForContentGeneration(callData.metadata.demo_session_id);
  showContentPreview(contentPreview);
  showEmailCapture();
});
```

### App Integration (app.chefsocial.io)

#### Voice Content Creation Flow
```javascript
// App content creation with voice
const createContentWithVoice = async (imageFile, userId) => {
  const userProfile = await getUserProfile(userId);
  const assistantId = getVAPIAssistant(userProfile.language);
  
  // Upload and prepare image
  const imageUpload = await uploadUserImage(imageFile, userId);
  
  // Start voice conversation
  await vapi.start({
    assistantId: assistantId,
    metadata: {
      user_id: userId,
      image_url: imageUpload.url,
      restaurant_profile: userProfile.restaurant,
      content_session_id: generateContentSessionId(),
      language: userProfile.language
    }
  });
  
  // Update UI to show voice conversation
  showVoiceInterface();
};

// Handle content generation completion
vapi.on('call-end', async (callData) => {
  showProcessingLoader("Generating your viral content...");
  
  const generatedContent = await waitForContentGeneration(
    callData.metadata.content_session_id
  );
  
  // Show content review interface
  showContentReview(generatedContent);
});
```

### SMS Integration

#### Twilio Webhook Handler
```javascript
// Handle incoming SMS with photo
app.post('/webhook/sms-received', async (req, res) => {
  const { From: phoneNumber, MediaUrl0: imageUrl, Body: messageBody } = req.body;
  
  // Trigger N8N SMS workflow
  await fetch(`${N8N_WEBHOOK_URL}/webhook/sms-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone_number: phoneNumber,
      image_url: imageUrl,
      message_text: messageBody,
      upload_method: 'sms',
      timestamp: new Date().toISOString()
    })
  });
  
  res.status(200).send('Image received');
});
```

---

## 🔐 Environment Configuration

### Required Environment Variables

```bash
# VAPI Configuration
VAPI_API_KEY=your_vapi_api_key
VAPI_DEMO_PHONE_NUMBER_ID=your_demo_phone_number
VAPI_WEBHOOK_SECRET=your_webhook_secret

# VAPI Assistant IDs
VAPI_ASSISTANT_FRENCH=chefsocial-demo-french
VAPI_ASSISTANT_ENGLISH=chefsocial-demo-english  
VAPI_ASSISTANT_SPANISH=chefsocial-demo-spanish

# Voice IDs by Language
VOICE_ID_FRENCH=your_french_voice_id
VOICE_ID_ENGLISH=your_english_voice_id
VOICE_ID_SPANISH=your_spanish_voice_id

# N8N Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance.com
N8N_API_KEY=your_n8n_api_key

# AI Model Configuration  
OPENROUTER_API_KEY=your_openrouter_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Image Enhancement
FAL_AI_API_KEY=your_fal_ai_key
ADOBE_FIREFLY_API_KEY=your_adobe_key

# Application URLs
CHEFSOCIAL_MARKETING_URL=https://chefsocial.io
CHEFSOCIAL_APP_URL=https://app.chefsocial.io

# Communication Services
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
RESEND_API_KEY=your_resend_key

# Database & Storage
DATABASE_URL=postgresql://user:pass@host:port/dbname
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

---

## 🚀 Deployment Instructions

### VAPI Setup
1. Create VAPI account and obtain API keys
2. Set up phone numbers for each language market
3. Create assistants using configurations above
4. Configure webhooks pointing to N8N instance
5. Test voice conversations in each language

### N8N Setup  
1. Deploy N8N instance (self-hosted or cloud)
2. Import workflow JSON files
3. Configure credentials for all external services
4. Set up webhook endpoints with proper authentication
5. Test all workflow triggers and data flow

### Application Deployment
1. Deploy marketing site to chefsocial.io
2. Deploy app to app.chefsocial.io  
3. Configure environment variables
4. Set up domain routing and SSL certificates
5. Configure CDN for image optimization

### Testing Checklist
- [ ] Voice conversations in all languages
- [ ] Image enhancement pipeline
- [ ] Content generation quality
- [ ] SMS integration flow
- [ ] Email conversion sequences
- [ ] Database storage and retrieval
- [ ] Payment processing
- [ ] Analytics tracking

---

## 📊 Monitoring & Analytics

### Key Metrics to Track
- Voice conversation completion rates by language
- Content generation success rates  
- Demo-to-trial conversion rates
- User engagement with generated content
- Image enhancement processing times
- Platform publishing success rates

### Error Handling
- VAPI call failures and retries
- AI model rate limits and fallbacks
- Image enhancement service outages
- Database connection issues
- Third-party API failures

---

## 🔄 Maintenance & Updates

### Regular Tasks
- Monitor VAPI conversation quality and adjust prompts
- Update AI model versions and test performance
- Review and optimize image enhancement parameters
- Update cultural context for different languages
- Monitor and update trending hashtags and content styles

### Scaling Considerations
- Add new language support following established patterns
- Optimize AI model costs and response times
- Scale N8N workflows for higher volume
- Implement caching for frequently accessed content
- Monitor and optimize database performance

---

*This documentation represents the complete technical architecture for ChefSocial's voice-powered social media content creation platform. Each component is designed to work together seamlessly while maintaining cultural authenticity and technical excellence.*