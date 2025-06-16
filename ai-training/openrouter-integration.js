// Simple OpenRouter Integration for ChefSocial
// Use after MVP for cost optimization and model diversity

const OpenAI = require('openai');

class OpenRouterClient {
    constructor() {
        // OpenRouter client (drop-in OpenAI replacement)
        this.openrouter = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
            defaultHeaders: {
                "HTTP-Referer": "https://chef-social.com",
                "X-Title": "ChefSocial AI"
            }
        });

        // Model pricing (per 1M tokens)
        this.models = {
            // Creative content generation
            'anthropic/claude-3.5-sonnet': { 
                input: 3.00, output: 15.00, 
                best_for: 'Creative content, storytelling'
            },
            
            // Multilingual support
            'google/gemini-pro': { 
                input: 0.50, output: 1.50,
                best_for: 'Multilingual, cost-effective'
            },
            
            // Fast and cheap
            'meta-llama/llama-3.1-8b-instruct:free': { 
                input: 0.00, output: 0.00,
                best_for: 'High volume, simple tasks'
            },
            
            // OpenAI (for comparison)
            'openai/gpt-4o': { 
                input: 5.00, output: 15.00,
                best_for: 'Best quality, current choice'
            }
        };
    }

    // Smart model selection based on task complexity
    selectModel(task) {
        const taskTypes = {
            'simple_caption': 'meta-llama/llama-3.1-8b-instruct:free',
            'creative_content': 'anthropic/claude-3.5-sonnet',
            'multilingual': 'google/gemini-pro',
            'premium': 'openai/gpt-4o'
        };

        return taskTypes[task] || 'google/gemini-pro';
    }

    // Generate content with model selection
    async generateContent(transcript, imageAnalysis, options = {}) {
        const { 
            language = 'en', 
            quality = 'standard',
            task = 'creative_content'
        } = options;

        // Select appropriate model
        const modelName = quality === 'premium' ? 
            'openai/gpt-4o' : 
            this.selectModel(task);

        console.log(`🤖 Using model: ${modelName} for ${task}`);

        try {
            const response = await this.openrouter.chat.completions.create({
                model: modelName,
                messages: [
                    {
                        role: "system",
                        content: this.getSystemPrompt(language)
                    },
                    {
                        role: "user",
                        content: this.createPrompt(transcript, imageAnalysis, language)
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 600,
                temperature: task === 'creative_content' ? 0.9 : 0.7
            });

            return JSON.parse(response.choices[0].message.content);

        } catch (error) {
            console.error(`❌ OpenRouter error with ${modelName}:`, error);
            throw error;
        }
    }

    getSystemPrompt(language) {
        return language === 'fr' ?
            "Tu es ChefSocial IA, expert en marketing culinaire qui crée du contenu viral pour les restaurants." :
            "You are ChefSocial AI, a food marketing expert who creates viral content for restaurants.";
    }

    createPrompt(transcript, imageAnalysis, language) {
        return `Create viral social media content based on:
        
DESCRIPTION: "${transcript}"
IMAGE: "${imageAnalysis}"
LANGUAGE: ${language}

Generate JSON with instagram and tiktok content.`;
    }

    // Cost comparison utility
    estimateCosts(tokensPerMonth) {
        console.log('\n💰 Monthly Cost Estimates (for', tokensPerMonth.toLocaleString(), 'tokens):');
        
        Object.entries(this.models).forEach(([model, pricing]) => {
            const cost = (tokensPerMonth / 1000000) * (pricing.input + pricing.output);
            console.log(`  ${model}: $${cost.toFixed(2)} - ${pricing.best_for}`);
        });
    }

    // Simple integration example
    static createMVPIntegration() {
        return `
// Add to your existing generateContent function:

// Option 1: Cost optimization (use cheaper models for simple tasks)
if (userPlan === 'basic' && task === 'simple_caption') {
    // Use free Llama model for basic users
    return await openRouterClient.generateContent(transcript, image, {
        task: 'simple_caption',
        quality: 'standard'
    });
}

// Option 2: Premium features (use Claude for creative content)
if (userPlan === 'premium' && needsCreativity) {
    return await openRouterClient.generateContent(transcript, image, {
        task: 'creative_content',
        quality: 'premium'
    });
}

// Option 3: Fallback (if OpenAI has issues)
try {
    return await openai.chat.completions.create(...);
} catch (openaiError) {
    console.log('🔄 Falling back to OpenRouter...');
    return await openRouterClient.generateContent(transcript, image);
}
`;
    }
}

// Export for use
module.exports = OpenRouterClient;

// CLI demonstration
if (require.main === module) {
    console.log('🌟 OpenRouter Integration for ChefSocial');
    console.log('=====================================\n');

    const client = new OpenRouterClient();
    
    // Show cost comparison
    client.estimateCosts(1000000); // 1M tokens per month

    console.log('\n🎯 MVP Recommendation:');
    console.log('  ✅ Keep OpenAI as primary (best quality)');
    console.log('  ✅ Add OpenRouter for cost optimization');
    console.log('  ✅ Use Claude for premium creative content');
    console.log('  ✅ Use Gemini for multilingual at scale');
    console.log('  ✅ Use Llama for simple/high-volume tasks');

    console.log('\n🚀 Simple Integration:');
    console.log(OpenRouterClient.createMVPIntegration());

    console.log('\n📝 Setup Steps:');
    console.log('  1. Add OPENROUTER_API_KEY to .env');
    console.log('  2. Install: already using OpenAI client');
    console.log('  3. Import OpenRouterClient when needed');
    console.log('  4. Use for specific use cases (cost, creativity, etc.)');
}