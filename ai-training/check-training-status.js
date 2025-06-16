#!/usr/bin/env node

// Check ChefSocial AI Training Status
const ChefSocialModelTrainer = require('./model-trainer');

async function checkStatus() {
    console.log('📊 ChefSocial AI Training Status Check');
    console.log('====================================\n');
    
    try {
        const trainer = new ChefSocialModelTrainer();
        const completedModels = await trainer.checkTrainingStatus();
        
        if (completedModels.size === 0) {
            console.log('⏳ Training still in progress...');
            console.log('💡 Run this script again in 30-60 minutes');
        } else {
            console.log(`🎉 ${completedModels.size} models completed!`);
            console.log('\n🚀 Ready for production deployment!');
        }
        
    } catch (error) {
        console.error('❌ Error checking training status:', error);
        process.exit(1);
    }
}

checkStatus();