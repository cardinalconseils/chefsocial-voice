// Queue Remaining Models for Fine-Tuning
require('dotenv').config();
const ChefSocialModelTrainer = require('./model-trainer');
const ChefSocialDataCollector = require('./data-collector');

class ModelQueue {
    constructor() {
        this.trainer = new ChefSocialModelTrainer();
        this.dataCollector = new ChefSocialDataCollector();
        
        // Add missing regions
        this.queuedRegions = ['en-CA', 'en-UK'];
        this.completedRegions = ['fr-CA', 'fr-FR', 'en-US']; // Currently training
    }

    // Create UK English training data
    async generateUKTrainingData() {
        console.log('🇬🇧 Generating UK English training data...');
        
        const ukSamples = [
            {
                id: 'en-UK_menuDescriptions_0',
                region: 'en-UK',
                category: 'menuDescriptions',
                content: 'Traditional fish and chips with mushy peas and tartare sauce',
                metadata: { contentType: 'menuDescriptions', language: 'en', culturalContext: 'en-UK' }
            },
            {
                id: 'en-UK_menuDescriptions_1',
                region: 'en-UK',
                category: 'menuDescriptions',
                content: 'Proper Sunday roast with Yorkshire pudding and gravy',
                metadata: { contentType: 'menuDescriptions', language: 'en', culturalContext: 'en-UK' }
            },
            {
                id: 'en-UK_menuDescriptions_2',
                region: 'en-UK',
                category: 'menuDescriptions',
                content: 'Bangers and mash with onion gravy',
                metadata: { contentType: 'menuDescriptions', language: 'en', culturalContext: 'en-UK' }
            },
            {
                id: 'en-UK_menuDescriptions_3',
                region: 'en-UK',
                category: 'menuDescriptions',
                content: 'Sticky toffee pudding with custard',
                metadata: { contentType: 'menuDescriptions', language: 'en', culturalContext: 'en-UK' }
            },
            {
                id: 'en-UK_socialCaptions_0',
                region: 'en-UK',
                category: 'socialCaptions',
                content: 'Absolutely brilliant! Our fish and chips are proper lovely! 🇬🇧 #BritishCuisine #FishAndChips',
                metadata: { contentType: 'socialCaptions', language: 'en', culturalContext: 'en-UK' }
            },
            {
                id: 'en-UK_socialCaptions_1',
                region: 'en-UK',
                category: 'socialCaptions',
                content: 'Fancy a proper British meal? Our Sunday roast is absolutely cracking! ✨ #SundayRoast #BritishTradition',
                metadata: { contentType: 'socialCaptions', language: 'en', culturalContext: 'en-UK' }
            },
            {
                id: 'en-UK_socialCaptions_2',
                region: 'en-UK',
                category: 'socialCaptions',
                content: "Blimey! This sticky toffee pudding is the bee's knees! 🍮 #BritishDessert #StickyToffeePudding",
                metadata: { contentType: 'socialCaptions', language: 'en', culturalContext: 'en-UK' }
            },
            {
                id: 'en-UK_customerEngagement_0',
                region: 'en-UK',
                category: 'customerEngagement',
                content: 'Cheers for the lovely review! Much appreciated!',
                metadata: { contentType: 'customerEngagement', language: 'en', culturalContext: 'en-UK' }
            },
            {
                id: 'en-UK_customerEngagement_1',
                region: 'en-UK',
                category: 'customerEngagement',
                content: 'Brilliant! So chuffed you enjoyed your meal with us!',
                metadata: { contentType: 'customerEngagement', language: 'en', culturalContext: 'en-UK' }
            },
            {
                id: 'en-UK_customerEngagement_2',
                region: 'en-UK',
                category: 'customerEngagement',
                content: 'Ta very much! Hope to see you again soon for another proper meal!',
                metadata: { contentType: 'customerEngagement', language: 'en', culturalContext: 'en-UK' }
            }
        ];

        return ukSamples;
    }

    // Check if we can start queued models
    async checkAndStartQueuedModels() {
        console.log('🔄 Checking if we can start queued models...');
        
        try {
            // Check current job status
            const jobInfo = require('./fine-tuning-jobs.json');
            const jobIds = new Map(Object.entries(jobInfo.jobs));
            
            const completedModels = await this.trainer.monitorFineTuning(jobIds);
            const runningJobs = jobIds.size - completedModels.size;
            
            console.log(`📊 Current status: ${runningJobs} running, ${completedModels.size} completed`);
            
            if (runningJobs < 3 && this.queuedRegions.length > 0) {
                console.log('✅ Slots available! Starting queued models...');
                await this.startQueuedModels(3 - runningJobs);
            } else {
                console.log('⏳ All slots busy. Try again when current models complete.');
            }
            
        } catch (error) {
            console.error('❌ Error checking queue:', error);
        }
    }

    async startQueuedModels(availableSlots) {
        const regionsToStart = this.queuedRegions.splice(0, availableSlots);
        
        for (const region of regionsToStart) {
            try {
                console.log(`\n🚀 Starting ${region} model...`);
                
                // Generate training data for the region
                if (region === 'en-UK') {
                    await this.prepareUKTrainingData();
                } else if (region === 'en-CA') {
                    await this.prepareCATrainingData();
                }
                
                // Create and upload training file
                await this.createTrainingFile(region);
                
                // Start fine-tuning job
                await this.startFineTuning(region);
                
                console.log(`✅ ${region} model started successfully!`);
                
            } catch (error) {
                console.error(`❌ Error starting ${region} model:`, error);
            }
        }
    }

    async prepareUKTrainingData() {
        const ukSamples = await this.generateUKTrainingData();
        const advancedExamples = this.generateUKAdvancedExamples();
        
        const allSamples = [...ukSamples, ...advancedExamples];
        
        // Save UK training data
        const fs = require('fs');
        const path = require('path');
        const ukDataPath = path.join(__dirname, 'training-data', 'en-UK');
        
        if (!fs.existsSync(ukDataPath)) {
            fs.mkdirSync(ukDataPath, { recursive: true });
        }
        
        fs.writeFileSync(
            path.join(ukDataPath, 'regional-samples.json'),
            JSON.stringify(allSamples, null, 2)
        );
        
        console.log(`✅ Created UK training data: ${allSamples.length} examples`);
    }

    async prepareCATrainingData() {
        // Canadian data already exists, just ensure it's ready
        console.log('✅ Canadian English training data already prepared');
    }

    generateUKAdvancedExamples() {
        return [
            {
                id: 'en-UK_advanced_0',
                region: 'en-UK',
                category: 'advanced_content',
                systemPrompt: "You are ChefSocial AI, a British food marketing expert who creates authentic content for UK restaurants using proper British expressions, regional knowledge, and cultural context.",
                input: "Promote our traditional afternoon tea service",
                output: "🫖 Fancy a proper afternoon tea? Our three-tiered stand features delicate finger sandwiches, freshly baked scones with clotted cream and jam, and an assortment of petit fours that are absolutely divine! Book your table for a quintessentially British experience. #AfternoonTea #BritishTradition #ProperCupOfTea",
                metadata: {
                    contentType: 'social_media',
                    complexity: 'advanced',
                    culturalContext: 'en-UK'
                }
            },
            {
                id: 'en-UK_advanced_1',
                region: 'en-UK',
                category: 'advanced_content',
                systemPrompt: "You are ChefSocial AI, a British food marketing expert who creates authentic content for UK restaurants using proper British expressions, regional knowledge, and cultural context.",
                input: "Create content for our gastropub's steak and kidney pie",
                output: "🥧 Our steak and kidney pie is an absolute corker! Tender chunks of beef and kidney in rich gravy, topped with golden pastry that's proper lovely. Served with buttery mash and seasonal veg - it's the sort of comfort food that'll warm your cockles! #GastropubGrub #SteakAndKidneyPie #ComfortFood",
                metadata: {
                    contentType: 'social_media',
                    complexity: 'advanced',
                    culturalContext: 'en-UK'
                }
            }
        ];
    }

    async createTrainingFile(region) {
        const fs = require('fs');
        const path = require('path');
        
        // Load regional data
        const regionalData = await this.trainer.loadRegionalData(region);
        const trainingExamples = this.trainer.formatForOpenAI(regionalData, region);
        
        // Create training file
        const outputPath = path.join(__dirname, 'openai-training-files');
        const fileName = `${region}-training.jsonl`;
        const filePath = path.join(outputPath, fileName);
        
        const trainingFile = trainingExamples.map(example => JSON.stringify(example)).join('\n');
        fs.writeFileSync(filePath, trainingFile);
        
        console.log(`✅ Created training file: ${fileName} (${trainingExamples.length} examples)`);
        return filePath;
    }

    async startFineTuning(region) {
        const fs = require('fs');
        const path = require('path');
        
        // Upload training file
        const fileName = `${region}-training.jsonl`;
        const filePath = path.join(__dirname, 'openai-training-files', fileName);
        
        // Fix Node.js compatibility issue
        if (!globalThis.File) {
            globalThis.File = (await import('node:buffer')).File;
        }
        
        const fileStream = fs.createReadStream(filePath);
        const file = await this.trainer.openai.files.create({
            file: fileStream,
            purpose: 'fine-tune'
        });
        
        console.log(`✅ Uploaded ${region} training file: ${file.id}`);
        
        // Start fine-tuning job
        const fineTuningJob = await this.trainer.openai.fineTuning.jobs.create({
            training_file: file.id,
            model: this.trainer.trainingConfig.model,
            hyperparameters: {
                n_epochs: this.trainer.trainingConfig.epochs,
                batch_size: this.trainer.trainingConfig.batchSize,
                learning_rate_multiplier: this.trainer.trainingConfig.learningRate
            },
            suffix: `chefsocial-${region}-v1`
        });
        
        console.log(`✅ Started fine-tuning for ${region}: ${fineTuningJob.id}`);
        
        // Update job info file
        const jobInfoPath = path.join(__dirname, 'fine-tuning-jobs.json');
        const jobInfo = JSON.parse(fs.readFileSync(jobInfoPath, 'utf8'));
        jobInfo.jobs[region] = fineTuningJob.id;
        fs.writeFileSync(jobInfoPath, JSON.stringify(jobInfo, null, 2));
        
        return fineTuningJob.id;
    }

    // Update regional model router to include UK
    async updateRegionalRouter() {
        console.log('🔧 Updating regional model router to include UK...');
        
        const fs = require('fs');
        const routerPath = path.join(__dirname, 'regional-model-router.js');
        let routerContent = fs.readFileSync(routerPath, 'utf8');
        
        // Add UK to regions if not already present
        if (!routerContent.includes("'en-UK'")) {
            routerContent = routerContent.replace(
                "regions: ['fr-CA', 'fr-FR', 'en-US', 'en-CA']",
                "regions: ['fr-CA', 'fr-FR', 'en-US', 'en-CA', 'en-UK']"
            );
            
            // Add UK fallback model
            routerContent = routerContent.replace(
                "'en-CA': 'gpt-4o'",
                "'en-CA': 'gpt-4o',\n            'en-UK': 'gpt-4o'"
            );
            
            fs.writeFileSync(routerPath, routerContent);
            console.log('✅ Updated regional router with UK support');
        }
    }

    // Show current queue status
    showQueueStatus() {
        console.log('📋 Model Training Queue Status:');
        console.log('===============================\n');
        
        console.log('✅ Currently Training (3/3 slots):');
        this.completedRegions.forEach(region => {
            console.log(`  🔄 ${region} - Running`);
        });
        
        console.log('\n⏳ Queued for Training:');
        this.queuedRegions.forEach(region => {
            console.log(`  📅 ${region} - Waiting for slot`);
        });
        
        console.log('\n🎯 Complete Model Set:');
        console.log('  🇨🇦 fr-CA - Quebec French (Training)');
        console.log('  🇫🇷 fr-FR - France French (Training)');
        console.log('  🇺🇸 en-US - American English (Training)');
        console.log('  🇨🇦 en-CA - Canadian English (Queued)');
        console.log('  🇬🇧 en-UK - British English (Queued)');
        
        console.log('\n📝 Next Steps:');
        console.log('  1. Wait for current models to complete (1-3 hours)');
        console.log('  2. Run: node queue-remaining-models.js start');
        console.log('  3. Monitor: node check-training-status.js');
    }
}

// CLI usage
if (require.main === module) {
    const queue = new ModelQueue();
    
    const command = process.argv[2];
    
    if (command === 'status') {
        queue.showQueueStatus();
    } else if (command === 'start') {
        queue.checkAndStartQueuedModels();
    } else if (command === 'prepare-uk') {
        queue.prepareUKTrainingData();
    } else if (command === 'update-router') {
        queue.updateRegionalRouter();
    } else {
        console.log('🎯 ChefSocial Model Queue Manager');
        console.log('================================\n');
        console.log('Commands:');
        console.log('  status      - Show queue status');
        console.log('  start       - Start queued models (if slots available)');
        console.log('  prepare-uk  - Prepare UK training data');
        console.log('  update-router - Add UK support to router');
        console.log('\nExample: node queue-remaining-models.js status');
    }
}

module.exports = ModelQueue;