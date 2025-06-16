// ChefSocial Regional AI Model Router
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class RegionalModelRouter {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Load fine-tuned models (will be populated after training)
        this.models = this.loadFineTunedModels();
        
        // Fallback to base models if fine-tuned not available
        this.fallbackModels = {
            'fr-CA': 'gpt-4o',
            'fr-FR': 'gpt-4o', 
            'en-US': 'gpt-4o',
            'en-CA': 'gpt-4o',
            'en-UK': 'gpt-4o'
        };
        
        // Regional detection patterns
        this.regionDetection = {
            'fr-CA': {
                keywords: ['québec', 'montreal', 'poutine', 'cabane à sucre', 'tourtière', 'tire d\'érable'],
                expressions: ['c\'est donc ben', 'tabarnouche', 'ça goûte', 'souper'],
                locations: ['québec', 'montreal', 'sherbrooke', 'gatineau', 'trois-rivières']
            },
            'fr-FR': {
                keywords: ['baguette', 'croissant', 'bouillabaisse', 'ratatouille', 'foie gras'],
                expressions: ['c\'est délicieux', 'un régal', 'gastronomie', 'terroir'],
                locations: ['paris', 'lyon', 'marseille', 'toulouse', 'nice']
            },
            'en-US': {
                keywords: ['bbq', 'burger', 'fries', 'steakhouse', 'diner', 'food truck'],
                expressions: ['awesome', 'mouth-watering', 'comfort food', 'farm-to-table'],
                locations: ['new york', 'los angeles', 'chicago', 'houston', 'phoenix']
            },
            'en-CA': {
                keywords: ['maple syrup', 'canadian bacon', 'butter tart', 'timmies'],
                expressions: ['eh', 'aboot', 'double-double', 'hoser'],
                locations: ['toronto', 'vancouver', 'calgary', 'ottawa', 'winnipeg']
            },
            'en-UK': {
                keywords: ['fish and chips', 'bangers and mash', 'sunday roast', 'sticky toffee pudding', 'yorkshire pudding'],
                expressions: ['brilliant', 'proper', 'lovely', 'blimey', 'cheers', 'chuffed'],
                locations: ['london', 'manchester', 'birmingham', 'liverpool', 'bristol']
            }
        };
    }

    loadFineTunedModels() {
        try {
            const modelPath = path.join(__dirname, 'completed-models.json');
            if (fs.existsSync(modelPath)) {
                const data = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
                return data.models || {};
            }
        } catch (error) {
            console.log('📝 No fine-tuned models found, using base models');
        }
        return {};
    }

    // Detect regional variant based on content and user context
    detectRegion(content, userLocation = null, userLanguage = 'en') {
        const baseLanguage = userLanguage.split('-')[0];
        
        // Start with user's preferred language
        let detectedRegion = userLanguage;
        
        // If base language only, determine region
        if (userLanguage.length === 2) {
            if (baseLanguage === 'fr') {
                detectedRegion = this.detectFrenchRegion(content, userLocation);
            } else if (baseLanguage === 'en') {
                detectedRegion = this.detectEnglishRegion(content, userLocation);
            }
        }
        
        // Validate detected region
        const supportedRegions = ['fr-CA', 'fr-FR', 'en-US', 'en-CA', 'en-UK'];
        if (!supportedRegions.includes(detectedRegion)) {
            detectedRegion = baseLanguage === 'fr' ? 'fr-FR' : 'en-US';
        }
        
        return detectedRegion;
    }

    detectFrenchRegion(content, userLocation) {
        const contentLower = content.toLowerCase();
        
        // Check for Quebec-specific indicators
        const quebecScore = this.calculateRegionScore(contentLower, 'fr-CA');
        const franceScore = this.calculateRegionScore(contentLower, 'fr-FR');
        
        // Location-based detection
        if (userLocation) {
            const locationLower = userLocation.toLowerCase();
            if (locationLower.includes('canada') || locationLower.includes('quebec')) {
                return 'fr-CA';
            }
            if (locationLower.includes('france') || locationLower.includes('paris')) {
                return 'fr-FR';
            }
        }
        
        // Content-based detection
        return quebecScore > franceScore ? 'fr-CA' : 'fr-FR';
    }

    detectEnglishRegion(content, userLocation) {
        const contentLower = content.toLowerCase();
        
        // Check for regional indicators
        const usScore = this.calculateRegionScore(contentLower, 'en-US');
        const canadaScore = this.calculateRegionScore(contentLower, 'en-CA');
        const ukScore = this.calculateRegionScore(contentLower, 'en-UK');
        
        // Location-based detection
        if (userLocation) {
            const locationLower = userLocation.toLowerCase();
            if (locationLower.includes('canada')) {
                return 'en-CA';
            }
            if (locationLower.includes('united states') || locationLower.includes('usa')) {
                return 'en-US';
            }
            if (locationLower.includes('united kingdom') || locationLower.includes('uk') || locationLower.includes('britain')) {
                return 'en-UK';
            }
        }
        
        // Content-based detection - find highest score
        const scores = { 'en-US': usScore, 'en-CA': canadaScore, 'en-UK': ukScore };
        const maxRegion = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
        
        return maxRegion;
    }

    calculateRegionScore(content, region) {
        const regionData = this.regionDetection[region];
        if (!regionData) return 0;
        
        let score = 0;
        
        // Check keywords
        regionData.keywords.forEach(keyword => {
            if (content.includes(keyword)) score += 3;
        });
        
        // Check expressions
        regionData.expressions.forEach(expression => {
            if (content.includes(expression)) score += 2;
        });
        
        // Check locations
        regionData.locations.forEach(location => {
            if (content.includes(location)) score += 1;
        });
        
        return score;
    }

    // Get the appropriate model for a region
    getModelForRegion(region) {
        // Use fine-tuned model if available, otherwise fallback
        return this.models[region] || this.fallbackModels[region] || 'gpt-4o';
    }

    // Get regional system prompt
    getRegionalSystemPrompt(region) {
        const prompts = {
            'fr-CA': `Tu es ChefSocial IA, l'expert en marketing culinaire québécois. Tu crées du contenu authentique pour les restaurants du Québec en utilisant:
- Les expressions québécoises naturelles ("C'est donc ben bon!", "Ça goûte le ciel!")
- La terminologie culinaire québécoise (déjeuner, souper, breuvage)
- Les spécialités locales (poutine, tourtière, tire d'érable)
- Les hashtags appropriés (#RestaurantQuébec #CuisineQuébécoise #MontrealFood)
- Le ton chaleureux et familier du Québec`,

            'fr-FR': `Vous êtes ChefSocial IA, l'expert en gastronomie française. Vous créez du contenu raffiné pour les restaurants français en utilisant:
- Le langage sophistiqué de la gastronomie française
- La terminologie culinaire française classique
- Les spécialités régionales françaises
- Les hashtags appropriés (#CuisineFrançaise #GastronomieParisienne #ChefFrançais)
- Le ton élégant et professionnel français`,

            'en-US': `You are ChefSocial AI, the American food marketing expert. You create engaging content for US restaurants using:
- Enthusiastic, casual American expressions
- Regional American cuisine knowledge (BBQ, Tex-Mex, comfort food)
- American food culture and trends
- Appropriate hashtags (#AmericanCuisine #ComfortFood #FarmToTable)
- Energetic, bold American tone`,

            'en-CA': `You are ChefSocial AI, the Canadian food marketing expert. You create warm, authentic content for Canadian restaurants using:
- Friendly Canadian expressions with subtle "eh" usage
- Canadian food culture and specialties (maple syrup, butter tarts)
- Coast-to-coast Canadian pride
- Appropriate hashtags (#CanadianCuisine #MapleInfused #ProudlyCanadian)
- Polite, warm Canadian hospitality tone`,

            'en-UK': `You are ChefSocial AI, the British food marketing expert. You create authentic content for UK restaurants using:
- Proper British expressions ("brilliant", "lovely", "proper")
- British food culture and classics (fish and chips, Sunday roast, afternoon tea)
- Regional British pride and traditions
- Appropriate hashtags (#BritishCuisine #ProperFood #BritishTradition)
- Polite, refined British tone with warmth`
        };
        
        return prompts[region] || prompts['en-US'];
    }

    // Generate content using regional model
    async generateRegionalContent(content, imageAnalysis, userContext = {}) {
        const {
            language = 'en',
            location = null,
            restaurantType = 'restaurant',
            brandVoice = 'friendly'
        } = userContext;
        
        // Detect appropriate region
        const region = this.detectRegion(content, location, language);
        const model = this.getModelForRegion(region);
        const systemPrompt = this.getRegionalSystemPrompt(region);
        
        console.log(`🌍 Using ${region} model: ${model}`);
        
        // Check if this is a fine-tuned model
        const isFineTuned = model.startsWith('ft:');
        if (isFineTuned) {
            console.log(`🧠 Using fine-tuned regional model for ${region}`);
        }
        
        // Create region-specific prompt
        const prompt = this.createRegionalPrompt(content, imageAnalysis, region, userContext);
        
        try {
            const messages = [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: prompt
                }
            ];

            // For fine-tuned models, we need to adapt the approach
            let response;
            if (isFineTuned) {
                // Fine-tuned models work better with simpler prompts
                const simplePrompt = language === 'fr' ?
                    `Crée du contenu viral Instagram et TikTok pour: "${content}". Image: "${imageAnalysis}". Réponds en JSON avec "instagram" (caption, hashtags) et "tiktok" (caption, hashtags).` :
                    `Create viral Instagram and TikTok content for: "${content}". Image: "${imageAnalysis}". Respond in JSON with "instagram" (caption, hashtags) and "tiktok" (caption, hashtags).`;
                
                response = await this.openai.chat.completions.create({
                    model: model,
                    messages: [
                        {
                            role: "user",
                            content: simplePrompt
                        }
                    ],
                    max_tokens: 600,
                    temperature: 0.7
                });
            } else {
                // Base models work well with structured prompts
                response = await this.openai.chat.completions.create({
                    model: model,
                    messages: messages,
                    response_format: { type: "json_object" },
                    max_tokens: 800,
                    temperature: 0.8
                });
            }
            
            let generatedContent;
            try {
                generatedContent = JSON.parse(response.choices[0].message.content);
            } catch (parseError) {
                // If JSON parsing fails, try to extract JSON from the content
                console.log('⚠️ JSON parsing failed, trying to extract...');
                const rawContent = response.choices[0].message.content;
                
                // Try to extract JSON from code blocks or clean up the response
                let jsonContent = rawContent;
                
                // Remove markdown code blocks
                jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
                
                // Try parsing again
                try {
                    generatedContent = JSON.parse(jsonContent);
                } catch (secondParseError) {
                    // Create a structured response from the raw content
                    console.log('⚠️ Second JSON parse failed, creating structured response...');
                    generatedContent = this.createStructuredResponse(rawContent, region);
                }
            }
            
            // Add region metadata
            generatedContent.metadata = {
                region: region,
                model: model,
                modelType: isFineTuned ? 'fine-tuned' : 'base',
                detectedFrom: 'content_analysis',
                generatedAt: new Date().toISOString()
            };
            
            return generatedContent;
            
        } catch (error) {
            console.error(`❌ Error generating content for ${region}:`, error);
            
            // Fallback to base model if fine-tuned model fails
            if (model.startsWith('ft:')) {
                console.log(`🔄 Falling back to base model for ${region}...`);
                const fallbackModel = this.fallbackModels[region];
                
                const fallbackResponse = await this.openai.chat.completions.create({
                    model: fallbackModel,
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    response_format: { type: "json_object" },
                    max_tokens: 800,
                    temperature: 0.8
                });
                
                const fallbackContent = JSON.parse(fallbackResponse.choices[0].message.content);
                fallbackContent.metadata = {
                    region: region,
                    model: fallbackModel,
                    modelType: 'base-fallback',
                    detectedFrom: 'content_analysis',
                    generatedAt: new Date().toISOString()
                };
                
                return fallbackContent;
            }
            
            throw error;
        }
    }

    // Create structured response from raw content
    createStructuredResponse(rawContent, region) {
        const language = region.split('-')[0];
        
        // Extract content and create structure
        const content = rawContent.substring(0, 200);
        
        // Create region-appropriate hashtags
        const hashtags = {
            'fr-CA': '#RestaurantQuébec #CuisineQuébécoise #MontrealFood #FoodieQuebec',
            'fr-FR': '#CuisineFrançaise #GastronomieParisienne #ChefFrançais #RestaurantFrançais',
            'en-US': '#AmericanCuisine #ComfortFood #FarmToTable #FoodieLife',
            'en-CA': '#CanadianCuisine #MapleInfused #ProudlyCanadian #EhFood',
            'en-UK': '#BritishCuisine #ProperFood #BritishTradition #UKEats'
        };

        return {
            instagram: {
                caption: content + (language === 'fr' ? ' ✨ #Délicieux' : ' ✨ #Delicious'),
                hashtags: hashtags[region] || hashtags['en-US']
            },
            tiktok: {
                caption: content.substring(0, 100) + (language === 'fr' ? ' 🔥 #FoodTok' : ' 🔥 #FoodTok'),
                hashtags: hashtags[region] || hashtags['en-US']
            },
            viralPotential: "7",
            bestTime: language === 'fr' ? '19h00' : '7:00 PM'
        };
    }

    createRegionalPrompt(content, imageAnalysis, region, userContext) {
        const language = region.split('-')[0];
        const isQuebec = region === 'fr-CA';
        const isFrance = region === 'fr-FR';
        const isCanada = region.includes('-CA');
        const isUS = region === 'en-US';
        
        let prompt = '';
        
        if (language === 'fr') {
            prompt = `Créez du contenu viral pour les réseaux sociaux basé sur :

DESCRIPTION DU CHEF : "${content}"
ANALYSE D'IMAGE : "${imageAnalysis}"
RÉGION : ${region}
TYPE DE RESTAURANT : ${userContext.restaurantType || 'restaurant'}

Générez le contenu dans ce format JSON exact :
{
  "instagram": {
    "caption": "Légende Instagram engageante avec emojis et appel à l'action",
    "hashtags": "hashtags appropriés pour ${isQuebec ? 'le marché québécois' : 'le marché français'}"
  },
  "tiktok": {
    "caption": "Légende TikTok courte et accrocheuse",
    "hashtags": "hashtags tendance ${isQuebec ? 'québécois' : 'français'}"
  },
  "viralPotential": "8",
  "bestTime": "${isQuebec ? '19h00' : '20h00'}",
  "culturalNotes": "Notes sur l'adaptation culturelle"
}

${isQuebec ? 'Utilisez les expressions québécoises authentiques et la culture culinaire du Québec.' : 'Utilisez le raffinement de la gastronomie française et ses traditions.'}`;
        } else {
            prompt = `Create viral social media content based on:

CHEF'S DESCRIPTION: "${content}"
IMAGE ANALYSIS: "${imageAnalysis}"
REGION: ${region}
RESTAURANT TYPE: ${userContext.restaurantType || 'restaurant'}

Generate content in this exact JSON format:
{
  "instagram": {
    "caption": "Engaging Instagram caption with emojis and call-to-action",
    "hashtags": "hashtags appropriate for ${isCanada ? 'Canadian' : 'American'} market"
  },
  "tiktok": {
    "caption": "Short, catchy TikTok caption with trending language",
    "hashtags": "trending ${isCanada ? 'Canadian' : 'American'} hashtags"
  },
  "viralPotential": "8",
  "bestTime": "${isCanada ? '7:00 PM' : '6:00 PM'}",
  "culturalNotes": "Cultural adaptation notes"
}

${isCanada ? 'Use authentic Canadian expressions and food culture with subtle Canadian pride.' : 'Use enthusiastic American expressions and regional food culture.'}`;
        }
        
        return prompt;
    }

    // Test all regional models
    async testAllRegions() {
        console.log('🧪 Testing all regional models...\n');
        
        const testCases = {
            'fr-CA': {
                content: "Notre poutine signature avec fromage en grains frais",
                expected: "Quebec expressions, poutine knowledge"
            },
            'fr-FR': {
                content: "Notre bouillabaisse marseillaise aux fruits de mer",
                expected: "French sophistication, regional cuisine"
            },
            'en-US': {
                content: "Our Texas BBQ ribs with bourbon glaze",
                expected: "American enthusiasm, regional BBQ knowledge"
            },
            'en-CA': {
                content: "Our maple-glazed Canadian salmon special",
                expected: "Canadian politeness, maple syrup culture"
            },
            'en-UK': {
                content: "Our traditional fish and chips with mushy peas",
                expected: "British expressions, proper language, fish and chips knowledge"
            }
        };
        
        for (const [region, testCase] of Object.entries(testCases)) {
            console.log(`🌍 Testing ${region}:`);
            console.log(`Input: ${testCase.content}`);
            console.log(`Expected: ${testCase.expected}`);
            
            try {
                const result = await this.generateRegionalContent(
                    testCase.content,
                    "A delicious restaurant dish",
                    { language: region }
                );
                
                console.log(`✅ Generated content successfully`);
                console.log(`Instagram: ${result.instagram?.caption?.substring(0, 100)}...`);
                console.log(`Region: ${result.metadata?.region}`);
                console.log('---\n');
            } catch (error) {
                console.error(`❌ Error testing ${region}:`, error.message);
                console.log('---\n');
            }
        }
    }
}

module.exports = RegionalModelRouter;