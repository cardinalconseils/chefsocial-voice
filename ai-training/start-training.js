#!/usr/bin/env node

// ChefSocial AI Training Execution Script
const ChefSocialDataCollector = require('./data-collector');
const ChefSocialModelTrainer = require('./model-trainer');

async function main() {
    console.log('🍽️ ChefSocial AI Fine-Tuning Pipeline');
    console.log('=====================================\n');
    
    try {
        // Phase 1: Collect and prepare training data
        console.log('📊 Phase 1: Data Collection & Preparation');
        const dataCollector = new ChefSocialDataCollector();
        
        await dataCollector.collectTrainingData();
        const dataset = dataCollector.generateTrainingDataset();
        
        console.log(`✅ Training dataset prepared: ${Object.keys(dataset.datasets).length} regions`);
        
        // Phase 2: Initialize model trainer
        console.log('\n🧠 Phase 2: Model Training Setup');
        const trainer = new ChefSocialModelTrainer();
        
        // Phase 3: Start fine-tuning pipeline
        console.log('\n🚀 Phase 3: Starting Fine-Tuning Process');
        const jobIds = await trainer.runTrainingPipeline();
        
        console.log('\n🎉 Training pipeline started successfully!');
        console.log('\n📋 Next Steps:');
        console.log('1. Wait 1-4 hours for training to complete');
        console.log('2. Run: node check-training-status.js');
        console.log('3. Test the fine-tuned models');
        console.log('4. Deploy to production');
        
        return jobIds;
        
    } catch (error) {
        console.error('❌ Training pipeline failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = main;