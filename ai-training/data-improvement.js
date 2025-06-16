// ChefSocial Data Collection for Model Improvement
require('dotenv').config();
const fs = require('fs');
const path = require('path');

class ModelDataImprover {
    constructor() {
        this.dataPath = path.join(__dirname, 'user-generated-data');
        this.ensureDataDirectory();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
    }

    // Collect successful content for training
    async collectSuccessfulContent(userId, content, engagement) {
        const timestamp = new Date().toISOString();
        const filename = `successful-content-${timestamp.split('T')[0]}.jsonl`;
        const filepath = path.join(this.dataPath, filename);

        const trainingExample = {
            messages: [
                {
                    role: "system",
                    content: content.metadata?.region ? 
                        this.getRegionalSystemPrompt(content.metadata.region) :
                        "You are ChefSocial AI, a food marketing expert."
                },
                {
                    role: "user",
                    content: content.originalTranscript || "Create engaging food content"
                },
                {
                    role: "assistant",
                    content: JSON.stringify({
                        instagram: content.instagram,
                        tiktok: content.tiktok,
                        viralPotential: content.viralPotential
                    })
                }
            ],
            metadata: {
                userId: userId,
                engagement: engagement,
                region: content.metadata?.region,
                timestamp: timestamp,
                viralScore: content.viralPotential
            }
        };

        // Append to training file
        fs.appendFileSync(filepath, JSON.stringify(trainingExample) + '\n');
        console.log(`✅ Collected successful content: ${engagement.likes} likes, ${engagement.shares} shares`);
    }

    // Collect user corrections/feedback
    async collectUserCorrections(userId, originalContent, correctedContent, region) {
        const timestamp = new Date().toISOString();
        const filename = `user-corrections-${timestamp.split('T')[0]}.jsonl`;
        const filepath = path.join(this.dataPath, filename);

        const correctionExample = {
            messages: [
                {
                    role: "system",
                    content: this.getRegionalSystemPrompt(region)
                },
                {
                    role: "user",
                    content: originalContent.transcript
                },
                {
                    role: "assistant",
                    content: JSON.stringify(correctedContent)
                }
            ],
            metadata: {
                userId: userId,
                correctionType: 'user_improved',
                region: region,
                timestamp: timestamp,
                original: originalContent,
                improved: correctedContent
            }
        };

        fs.appendFileSync(filepath, JSON.stringify(correctionExample) + '\n');
        console.log(`✅ Collected user correction for ${region}`);
    }

    // Simple method to add more training examples
    generateMoreExamples(region, count = 50) {
        const examples = [];
        const foodTypes = this.getFoodTypesByRegion(region);
        const templates = this.getTemplatesByRegion(region);

        for (let i = 0; i < count; i++) {
            const food = foodTypes[Math.floor(Math.random() * foodTypes.length)];
            const template = templates[Math.floor(Math.random() * templates.length)];
            
            examples.push({
                input: template.input.replace('{food}', food.name),
                output: template.output.replace('{food}', food.name).replace('{description}', food.description),
                region: region,
                category: 'generated_expansion'
            });
        }

        return examples;
    }

    getFoodTypesByRegion(region) {
        const foods = {
            'fr-CA': [
                { name: 'poutine', description: 'avec fromage en grains frais' },
                { name: 'tourtière', description: 'traditionnelle du Lac-Saint-Jean' },
                { name: 'tire d\'érable', description: 'sur neige fraîche' },
                { name: 'smoked meat', description: 'style montréalais' },
                { name: 'cipaille', description: 'aux six viandes' }
            ],
            'fr-FR': [
                { name: 'bouillabaisse', description: 'marseillaise authentique' },
                { name: 'coq au vin', description: 'de nos vignobles locaux' },
                { name: 'ratatouille', description: 'provençale aux légumes de saison' },
                { name: 'crème brûlée', description: 'à la vanille de Madagascar' },
                { name: 'foie gras', description: 'mi-cuit du Périgord' }
            ],
            'en-US': [
                { name: 'BBQ ribs', description: 'slow-smoked with bourbon glaze' },
                { name: 'burger', description: 'classic American cheeseburger' },
                { name: 'mac and cheese', description: 'ultimate comfort food' },
                { name: 'apple pie', description: 'with vanilla ice cream' },
                { name: 'buffalo wings', description: 'with blue cheese dip' }
            ],
            'en-CA': [
                { name: 'maple salmon', description: 'glazed with pure Canadian maple syrup' },
                { name: 'butter tarts', description: 'made with local ingredients' },
                { name: 'Canadian bacon', description: 'with farm-fresh eggs' },
                { name: 'Nanaimo bars', description: 'classic Canadian dessert' },
                { name: 'pemmican', description: 'traditional energy food' }
            ]
        };

        return foods[region] || foods['en-US'];
    }

    getTemplatesByRegion(region) {
        const templates = {
            'fr-CA': [
                {
                    input: "Décris notre {food} spécial",
                    output: "🍁 Notre {food} {description}, c'est donc ben bon! Venez goûter à ce délice québécois qui va vous faire dire 'Tabarnouche!' #QuébecCuisine #DelicieuxQuebec"
                }
            ],
            'fr-FR': [
                {
                    input: "Présentez notre {food} signature",
                    output: "✨ Découvrez notre {food} {description}, une symphonie gustative qui révèle l'excellence de notre savoir-faire français. #CuisineFrançaise #GastronomieExceptionnelle"
                }
            ],
            'en-US': [
                {
                    input: "Promote our {food} special",
                    output: "🔥 Get ready for our amazing {food} {description}! This is comfort food at its finest, bringing you that authentic American taste you crave! #AmericanCuisine #ComfortFood"
                }
            ],
            'en-CA': [
                {
                    input: "Feature our {food} dish",
                    output: "🇨🇦 Our {food} {description} is a true taste of Canada, eh! From coast to coast, this is what Canadian hospitality tastes like! #CanadianCuisine #ProudlyCanadian"
                }
            ]
        };

        return templates[region] || templates['en-US'];
    }

    getRegionalSystemPrompt(region) {
        const prompts = {
            'fr-CA': "Tu es ChefSocial IA, expert en marketing culinaire québécois qui utilise les expressions locales authentiques.",
            'fr-FR': "Vous êtes ChefSocial IA, expert en gastronomie française qui crée du contenu raffiné et sophistiqué.",
            'en-US': "You are ChefSocial AI, American food marketing expert who creates enthusiastic, engaging content.",
            'en-CA': "You are ChefSocial AI, Canadian food expert who creates friendly, authentic content with Canadian warmth."
        };
        return prompts[region] || prompts['en-US'];
    }

    // Generate training file for additional fine-tuning
    async createSupplementalTrainingData() {
        console.log('📚 Creating supplemental training data...');
        
        const regions = ['fr-CA', 'fr-FR', 'en-US', 'en-CA'];
        const allExamples = [];

        regions.forEach(region => {
            const examples = this.generateMoreExamples(region, 25); // 25 per region
            examples.forEach(example => {
                allExamples.push({
                    messages: [
                        {
                            role: "system",
                            content: this.getRegionalSystemPrompt(region)
                        },
                        {
                            role: "user",
                            content: example.input
                        },
                        {
                            role: "assistant",
                            content: example.output
                        }
                    ]
                });
            });
        });

        // Save supplemental training file
        const filename = `supplemental-training-${new Date().toISOString().split('T')[0]}.jsonl`;
        const filepath = path.join(this.dataPath, filename);
        
        allExamples.forEach(example => {
            fs.appendFileSync(filepath, JSON.stringify(example) + '\n');
        });

        console.log(`✅ Created ${allExamples.length} supplemental training examples`);
        console.log(`📁 Saved to: ${filepath}`);
        
        return filepath;
    }

    // Simple OpenRouter integration example
    getOpenRouterConfig() {
        return {
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
            defaultHeaders: {
                "HTTP-Referer": "https://chef-social.com",
                "X-Title": "ChefSocial AI"
            }
        };
    }

    // MVP-ready model improvement suggestions
    getMVPImprovements() {
        return {
            immediate: [
                "✅ Current fine-tuning (in progress)",
                "✅ Regional content adaptation (working)",
                "✅ User feedback collection (ready to implement)"
            ],
            postMVP: [
                "📊 Collect successful content engagement data",
                "🔄 Retrain models with user data quarterly",
                "🧪 A/B test different prompts",
                "💰 Consider OpenRouter for cost optimization"
            ],
            simple: [
                "Add more food examples per region",
                "Collect user corrections",
                "Track which content performs best",
                "Seasonal content updates"
            ]
        };
    }
}

module.exports = ModelDataImprover;

// CLI usage
if (require.main === module) {
    const improver = new ModelDataImprover();
    
    if (process.argv[2] === 'create-supplemental') {
        improver.createSupplementalTrainingData();
    } else if (process.argv[2] === 'suggestions') {
        console.log('🎯 ChefSocial MVP Model Improvement Strategy:');
        const suggestions = improver.getMVPImprovements();
        
        console.log('\n✅ Immediate (Ready Now):');
        suggestions.immediate.forEach(item => console.log(`  ${item}`));
        
        console.log('\n📈 Post-MVP (After Launch):');
        suggestions.postMVP.forEach(item => console.log(`  ${item}`));
        
        console.log('\n🚀 Simple Improvements:');
        suggestions.simple.forEach(item => console.log(`  ${item}`));
        
        console.log('\n💡 OpenRouter Integration:');
        console.log('  - Add OPENROUTER_API_KEY to .env');
        console.log('  - Access Claude, Gemini, local models');
        console.log('  - Cost optimization for high volume');
        console.log('  - Keep current OpenAI as primary');
    }
}