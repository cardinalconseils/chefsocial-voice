// ChefSocial AI Model Fine-Tuning System
require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class ChefSocialModelTrainer {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.trainingConfig = {
            model: "gpt-4o-2024-08-06", // Latest model for fine-tuning
            regions: ['fr-CA', 'fr-FR', 'en-US', 'en-CA'],
            batchSize: 100,
            epochs: 3,
            learningRate: 0.0001
        };
        
        this.models = new Map(); // Store fine-tuned model IDs
    }

    // Prepare training data in OpenAI format
    async prepareTrainingData() {
        console.log('📚 Preparing training data for fine-tuning...');
        
        const trainingDataPath = path.join(__dirname, 'training-data');
        const outputPath = path.join(__dirname, 'openai-training-files');
        
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        for (const region of this.trainingConfig.regions) {
            console.log(`\n🌍 Processing ${region} training data...`);
            
            const regionalData = await this.loadRegionalData(region);
            const trainingExamples = this.formatForOpenAI(regionalData, region);
            
            // Save training file
            const fileName = `${region}-training.jsonl`;
            const filePath = path.join(outputPath, fileName);
            
            const trainingFile = trainingExamples.map(example => JSON.stringify(example)).join('\n');
            fs.writeFileSync(filePath, trainingFile);
            
            console.log(`✅ Created training file: ${fileName} (${trainingExamples.length} examples)`);
        }
    }

    async loadRegionalData(region) {
        const dataPath = path.join(__dirname, 'training-data', region);
        const samples = [];
        
        try {
            // Load regional samples
            const regionalFile = path.join(dataPath, 'regional-samples.json');
            if (fs.existsSync(regionalFile)) {
                const data = JSON.parse(fs.readFileSync(regionalFile, 'utf8'));
                samples.push(...data);
            }
            
            // Add more sophisticated training examples
            const advancedExamples = this.generateAdvancedExamples(region);
            samples.push(...advancedExamples);
            
            return samples;
        } catch (error) {
            console.error(`❌ Error loading data for ${region}:`, error);
            return [];
        }
    }

    generateAdvancedExamples(region) {
        const examples = [];
        
        // Regional specialization examples
        const regionalSpecs = {
            'fr-CA': {
                systemPrompt: "Tu es un expert en marketing culinaire québécois qui crée du contenu authentique pour les restaurants du Québec. Tu utilises les expressions locales et comprends la culture alimentaire québécoise.",
                examples: [
                    {
                        input: "Décris notre poutine signature avec fromage en grains",
                        output: "🍟 Notre poutine, c'est tout un délice! Frites croustillantes, fromage en grains qui fait squick-squick, et notre sauce brune secrète qui goûte le bonheur! Un classique québécois qui va vous faire dire 'Tabarnouche que c'est bon!' #PoutineQuébec #FromageEnGrains #SauceSecrete"
                    },
                    {
                        input: "Contenu TikTok pour cabane à sucre au printemps",
                        output: "🍁 C'est l'temps des sucres! Venez déguster notre tire sur neige fraîche, nos oreilles de crisse croustillantes pis notre jambon à l'érable fumant! Un vrai festin du temps des sucres! #TempDesSucres #TireSurNeige #CabaneASucre #TraditionQuébécoise"
                    }
                ]
            },
            'fr-FR': {
                systemPrompt: "Vous êtes un expert en gastronomie française qui crée du contenu raffiné pour les restaurants français. Vous maîtrisez l'art culinaire français et utilisez un langage sophistiqué.",
                examples: [
                    {
                        input: "Présente notre menu dégustation aux truffes noires",
                        output: "🌟 Découvrez notre menu dégustation sublimé par les truffes noires du Périgord. Six services d'exception où chaque assiette révèle la noblesse de ce diamant noir. Une symphonie gustative orchestrée par notre chef étoilé. Réservation conseillée. #TruffesNoires #MenuDégustation #GastronomieExceptionnelle"
                    }
                ]
            },
            'en-US': {
                systemPrompt: "You are an American food marketing expert who creates engaging content for US restaurants. You understand regional American cuisines and use enthusiastic, casual language.",
                examples: [
                    {
                        input: "Promote our Texas BBQ ribs special",
                        output: "🔥 Get ready for some serious BBQ action! Our Texas-style ribs are slow-smoked for 12 hours with our secret dry rub, then slathered in tangy bourbon BBQ sauce. These bad boys fall right off the bone! Come hungry, leave happy! #TexasBBQ #SlowSmoked #FallOffTheBone #BBQLife"
                    }
                ]
            },
            'en-CA': {
                systemPrompt: "You are a Canadian food marketing expert who creates friendly, authentic content for Canadian restaurants. You understand Canadian food culture and use polite, warm language with subtle Canadian expressions.",
                examples: [
                    {
                        input: "Feature our maple-glazed salmon dish",
                        output: "🍁 Our Atlantic salmon gets the true Canadian treatment, eh! Fresh-caught salmon glazed with pure Canadian maple syrup and finished with sea salt from the Maritimes. It's a coast-to-coast flavor journey that'll make you proud to be Canadian! #CanadianSalmon #PureMaple #CoastToCoast #ProudlyCanadian"
                    }
                ]
            }
        };

        const spec = regionalSpecs[region];
        if (!spec) return [];

        spec.examples.forEach((example, index) => {
            examples.push({
                id: `${region}_advanced_${index}`,
                region: region,
                category: 'advanced_content',
                systemPrompt: spec.systemPrompt,
                input: example.input,
                output: example.output,
                metadata: {
                    contentType: 'social_media',
                    complexity: 'advanced',
                    culturalContext: region,
                    createdAt: new Date().toISOString()
                }
            });
        });

        return examples;
    }

    formatForOpenAI(samples, region) {
        return samples.map(sample => {
            const systemPrompt = sample.systemPrompt || this.getRegionalSystemPrompt(region);
            
            return {
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user", 
                        content: sample.input || sample.content
                    },
                    {
                        role: "assistant",
                        content: sample.output || this.generateOutput(sample)
                    }
                ]
            };
        });
    }

    getRegionalSystemPrompt(region) {
        const prompts = {
            'fr-CA': "Tu es ChefSocial IA, un expert en marketing culinaire québécois. Tu crées du contenu authentique pour les restaurants du Québec en utilisant les expressions locales, la culture alimentaire québécoise, et les hashtags appropriés pour le marché francophone canadien.",
            'fr-FR': "Vous êtes ChefSocial IA, un expert en gastronomie et marketing culinaire français. Vous créez du contenu raffiné et authentique pour les restaurants français en utilisant un langage sophistiqué et les codes de la gastronomie française.",
            'en-US': "You are ChefSocial AI, an American food marketing expert. You create engaging, enthusiastic content for US restaurants using casual, energetic language and understanding regional American cuisines and social media trends.",
            'en-CA': "You are ChefSocial AI, a Canadian food marketing expert. You create friendly, authentic content for Canadian restaurants using warm, polite language with subtle Canadian expressions and understanding of Canadian food culture."
        };
        
        return prompts[region] || prompts['en-US'];
    }

    generateOutput(sample) {
        // Fallback output generation based on sample content
        return `${sample.content} #delicious #restaurant #foodie`;
    }

    // Upload training files to OpenAI
    async uploadTrainingFiles() {
        console.log('📤 Uploading training files to OpenAI...');
        
        // Fix Node.js compatibility issue
        if (!globalThis.File) {
            globalThis.File = (await import('node:buffer')).File;
        }
        
        const trainingFiles = new Map();
        const outputPath = path.join(__dirname, 'openai-training-files');
        
        for (const region of this.trainingConfig.regions) {
            const fileName = `${region}-training.jsonl`;
            const filePath = path.join(outputPath, fileName);
            
            if (fs.existsSync(filePath)) {
                try {
                    const fileStream = fs.createReadStream(filePath);
                    
                    const file = await this.openai.files.create({
                        file: fileStream,
                        purpose: 'fine-tune'
                    });
                    
                    trainingFiles.set(region, file.id);
                    console.log(`✅ Uploaded ${region} training file: ${file.id}`);
                } catch (error) {
                    console.error(`❌ Error uploading ${region} file:`, error);
                }
            }
        }
        
        return trainingFiles;
    }

    // Create fine-tuned models for each region
    async createFineTunedModels(trainingFiles) {
        console.log('🚀 Starting fine-tuning jobs...');
        
        const fineTuningJobs = new Map();
        
        for (const [region, fileId] of trainingFiles.entries()) {
            try {
                const fineTuningJob = await this.openai.fineTuning.jobs.create({
                    training_file: fileId,
                    model: this.trainingConfig.model,
                    hyperparameters: {
                        n_epochs: this.trainingConfig.epochs,
                        batch_size: this.trainingConfig.batchSize,
                        learning_rate_multiplier: this.trainingConfig.learningRate
                    },
                    suffix: `chefsocial-${region}-v1`
                });
                
                fineTuningJobs.set(region, fineTuningJob.id);
                console.log(`✅ Started fine-tuning for ${region}: ${fineTuningJob.id}`);
            } catch (error) {
                console.error(`❌ Error starting fine-tuning for ${region}:`, error);
            }
        }
        
        return fineTuningJobs;
    }

    // Monitor fine-tuning progress
    async monitorFineTuning(jobIds) {
        console.log('📊 Monitoring fine-tuning progress...');
        
        const completedModels = new Map();
        
        for (const [region, jobId] of jobIds.entries()) {
            try {
                const job = await this.openai.fineTuning.jobs.retrieve(jobId);
                
                console.log(`\n🌍 ${region} (${jobId}):`);
                console.log(`   Status: ${job.status}`);
                console.log(`   Progress: ${job.trained_tokens || 0} tokens`);
                
                if (job.status === 'succeeded') {
                    completedModels.set(region, job.fine_tuned_model);
                    console.log(`   ✅ Model ready: ${job.fine_tuned_model}`);
                } else if (job.status === 'failed') {
                    console.log(`   ❌ Training failed: ${job.error?.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.error(`❌ Error checking ${region} job:`, error);
            }
        }
        
        return completedModels;
    }

    // Test fine-tuned models
    async testFineTunedModels(models) {
        console.log('🧪 Testing fine-tuned models...');
        
        const testPrompts = {
            'fr-CA': "Crée du contenu Instagram pour notre tourtière du Lac-Saint-Jean",
            'fr-FR': "Rédigez une description pour notre bouillabaisse marseillaise",
            'en-US': "Create TikTok content for our Nashville hot chicken",
            'en-CA': "Write about our butter tart special with maple syrup"
        };
        
        for (const [region, modelId] of models.entries()) {
            if (!modelId) continue;
            
            try {
                const response = await this.openai.chat.completions.create({
                    model: modelId,
                    messages: [
                        {
                            role: "system",
                            content: this.getRegionalSystemPrompt(region)
                        },
                        {
                            role: "user",
                            content: testPrompts[region]
                        }
                    ],
                    max_tokens: 200,
                    temperature: 0.8
                });
                
                console.log(`\n🌍 ${region} Model Test:`);
                console.log(`Input: ${testPrompts[region]}`);
                console.log(`Output: ${response.choices[0].message.content}`);
                console.log('---');
            } catch (error) {
                console.error(`❌ Error testing ${region} model:`, error);
            }
        }
    }

    // Main training pipeline
    async runTrainingPipeline() {
        console.log('🚀 Starting ChefSocial AI Fine-Tuning Pipeline...\n');
        
        try {
            // Step 1: Prepare training data
            await this.prepareTrainingData();
            
            // Step 2: Upload training files
            const trainingFiles = await this.uploadTrainingFiles();
            
            // Step 3: Start fine-tuning
            const jobIds = await this.createFineTunedModels(trainingFiles);
            
            // Step 4: Save job information
            const jobInfo = {
                startTime: new Date().toISOString(),
                jobs: Object.fromEntries(jobIds),
                config: this.trainingConfig
            };
            
            fs.writeFileSync(
                path.join(__dirname, 'fine-tuning-jobs.json'),
                JSON.stringify(jobInfo, null, 2)
            );
            
            console.log('\n✅ Fine-tuning pipeline started successfully!');
            console.log('📋 Job information saved to fine-tuning-jobs.json');
            console.log('\n⏱️  Fine-tuning typically takes 1-4 hours per model');
            console.log('🔄 Run checkTrainingStatus() to monitor progress');
            
            return jobIds;
        } catch (error) {
            console.error('❌ Training pipeline error:', error);
            throw error;
        }
    }

    // Check training status (separate method)
    async checkTrainingStatus() {
        try {
            const jobInfo = JSON.parse(
                fs.readFileSync(path.join(__dirname, 'fine-tuning-jobs.json'), 'utf8')
            );
            
            const jobIds = new Map(Object.entries(jobInfo.jobs));
            const completedModels = await this.monitorFineTuning(jobIds);
            
            if (completedModels.size > 0) {
                console.log('\n🎉 Testing completed models...');
                await this.testFineTunedModels(completedModels);
                
                // Save completed models
                const modelInfo = {
                    completedAt: new Date().toISOString(),
                    models: Object.fromEntries(completedModels),
                    originalJobs: jobInfo
                };
                
                fs.writeFileSync(
                    path.join(__dirname, 'completed-models.json'),
                    JSON.stringify(modelInfo, null, 2)
                );
                
                console.log('💾 Model information saved to completed-models.json');
            }
            
            return completedModels;
        } catch (error) {
            console.error('❌ Error checking training status:', error);
            throw error;
        }
    }
}

module.exports = ChefSocialModelTrainer;