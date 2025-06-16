// ChefSocial Realtime Conversation Handler
require('dotenv').config();
const WebSocket = require('ws');
const OpenAI = require('openai');

class ChefSocialRealtimeHandler {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.restaurantMarketingExpert = {
            instructions: `You are ChefSocial AI, the world's leading restaurant marketing strategist and social media expert. You help chefs and restaurant owners create viral social media content through natural conversation.

PERSONALITY:
- Expert consultant with deep restaurant industry knowledge
- Enthusiastic about food marketing and social media strategy
- Practical and results-focused
- Warm but professional tone
- Ask strategic questions to understand their needs

EXPERTISE:
- Platform-specific content optimization (Instagram, TikTok, Facebook, LinkedIn)
- Restaurant marketing psychology and customer behavior
- Food photography and presentation guidance
- Seasonal marketing and event promotion
- Crisis management and reputation handling
- ROI tracking and performance optimization

CONVERSATION STYLE:
- Lead with strategic questions
- Provide specific, actionable advice
- Reference industry best practices
- Suggest platform-specific optimizations
- Offer content creation assistance

CAPABILITIES:
- Analyze food photos and suggest marketing angles
- Create platform-specific content (captions, hashtags, timing)
- Develop marketing campaigns and content calendars
- Provide competitive analysis and positioning advice
- Help with crisis communication and reputation management

WORKFLOW:
1. Understand their restaurant/brand
2. Assess their specific marketing needs
3. Create tailored content strategies
4. Generate platform-optimized content
5. Suggest optimal posting times and engagement tactics

Always ask clarifying questions to better understand their brand, target audience, and specific goals before creating content.`,

            voice: 'alloy',
            modalities: ['text', 'audio'],
            instructions_type: 'system'
        };
    }

    async createRealtimeSession() {
        try {
            console.log('🎙️ Creating OpenAI Realtime session...');
            
            // Note: Using chat completion for now as Realtime API requires beta access
            // This will be updated to actual realtime when available
            const session = {
                id: `session_${Date.now()}`,
                status: 'active',
                instructions: this.restaurantMarketingExpert.instructions,
                voice: this.restaurantMarketingExpert.voice,
                created_at: new Date().toISOString()
            };
            
            console.log('✅ Realtime session created:', session.id);
            return session;
            
        } catch (error) {
            console.error('❌ Failed to create realtime session:', error);
            throw error;
        }
    }

    async processAudioInput(audioBuffer, session) {
        try {
            console.log('🎵 Processing audio input...');
            
            // For now, use existing Whisper transcription
            const transcript = await this.transcribeAudio(audioBuffer);
            console.log('📝 Transcript:', transcript);
            
            // Process with restaurant marketing expert
            const response = await this.generateMarketingResponse(transcript, session);
            console.log('💬 AI Response:', response.substring(0, 100) + '...');
            
            // TODO: Convert response to audio using TTS
            const audioResponse = await this.synthesizeResponse(response);
            
            return {
                transcript,
                response,
                audioResponse,
                session_id: session.id
            };
            
        } catch (error) {
            console.error('❌ Audio processing error:', error);
            throw error;
        }
    }

    async transcribeAudio(audioBuffer) {
        try {
            const tempPath = `/tmp/audio_${Date.now()}.wav`;
            require('fs').writeFileSync(tempPath, audioBuffer);
            
            const transcription = await this.openai.audio.transcriptions.create({
                file: require('fs').createReadStream(tempPath),
                model: "whisper-1",
                language: "en"
            });
            
            // Cleanup
            require('fs').unlinkSync(tempPath);
            
            return transcription.text || transcription;
            
        } catch (error) {
            console.error('❌ Transcription error:', error);
            return "I'm having trouble hearing you. Could you try again?";
        }
    }

    async generateMarketingResponse(userInput, session) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: this.restaurantMarketingExpert.instructions
                    },
                    {
                        role: "user", 
                        content: userInput
                    }
                ],
                max_tokens: 500,
                temperature: 0.8
            });
            
            return response.choices[0].message.content;
            
        } catch (error) {
            console.error('❌ Response generation error:', error);
            return "I'm having a technical issue. Let me help you with your restaurant marketing - what would you like to work on today?";
        }
    }

    async synthesizeResponse(text) {
        try {
            console.log('🔊 Synthesizing audio response...');
            
            const response = await this.openai.audio.speech.create({
                model: "tts-1",
                voice: "alloy",
                input: text,
                response_format: "mp3"
            });
            
            const audioBuffer = Buffer.from(await response.arrayBuffer());
            return audioBuffer;
            
        } catch (error) {
            console.error('❌ Audio synthesis error:', error);
            return null;
        }
    }

    // Content creation helper
    async createPlatformContent(conversation_context, platform_request) {
        try {
            const prompt = `Based on our conversation: "${conversation_context}"
            
Create ${platform_request.platform} content for their restaurant with:
- Platform-specific optimization
- Engaging caption with their brand voice
- Relevant hashtags
- Optimal posting strategy

Format as JSON:
{
    "platform": "${platform_request.platform}",
    "caption": "engaging caption here",
    "hashtags": ["#relevant", "#hashtags"],
    "best_time": "optimal posting time",
    "engagement_strategy": "specific tactics"
}`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: this.restaurantMarketingExpert.instructions
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 600
            });
            
            return JSON.parse(response.choices[0].message.content);
            
        } catch (error) {
            console.error('❌ Content creation error:', error);
            return {
                platform: platform_request.platform,
                caption: "Delicious food, made with passion! Come taste the difference.",
                hashtags: ["#restaurant", "#foodie", "#delicious"],
                best_time: "6:00 PM",
                engagement_strategy: "Ask customers to share their favorite dishes"
            };
        }
    }
}

module.exports = ChefSocialRealtimeHandler;