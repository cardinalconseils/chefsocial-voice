// Direct test of fine-tuned models
require('dotenv').config();
const OpenAI = require('openai');

async function testDirectModels() {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    const models = {
        'fr-CA': 'ft:gpt-4o-2024-08-06:personal:chefsocial-fr-ca-v1:BitoZaGh',
        'fr-FR': 'ft:gpt-4o-2024-08-06:personal:chefsocial-fr-fr-v1:BitoVPJK',
        'en-US': 'ft:gpt-4o-2024-08-06:personal:chefsocial-en-us-v1:BitoWoKA'
    };

    console.log('🧪 Direct Testing of Fine-Tuned Models');
    console.log('======================================\n');

    for (const [region, modelId] of Object.entries(models)) {
        console.log(`🌍 Testing ${region} model: ${modelId}`);
        
        try {
            const response = await openai.chat.completions.create({
                model: modelId,
                messages: [
                    {
                        role: "user",
                        content: region === 'fr-CA' ? 
                            "Crée du contenu Instagram pour notre poutine signature" :
                            region === 'fr-FR' ?
                            "Rédigez une description pour notre bouillabaisse marseillaise" :
                            "Create TikTok content for our Texas BBQ ribs"
                    }
                ],
                max_tokens: 300,
                temperature: 0.7
            });

            const content = response.choices[0].message.content;
            console.log('✅ Response:');
            console.log(content);
            console.log('\n---\n');

        } catch (error) {
            console.error(`❌ Error with ${region}:`, error.message);
            console.log('\n---\n');
        }
    }
}

testDirectModels();