// ChefSocial Natural Conversation Fallback - Using standard OpenAI API with enhanced conversational flow
require('dotenv').config();
const OpenAI = require('openai');

class NaturalConversationFallback {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.activeSessions = new Map();
        
        // Enhanced conversational personality
        this.systemPrompt = `You are ChefSocial AI, a passionate restaurant marketing expert who loves having natural conversations about food and marketing.

CONVERSATION STYLE:
- Speak like you're having a real conversation with a friend who owns a restaurant
- Use natural speech patterns, contractions, and casual language
- Show genuine excitement about their restaurant and food
- Ask follow-up questions to keep the conversation flowing
- Remember everything they tell you and reference it naturally
- Interrupt your own thoughts with new ideas: "Oh wait! That reminds me..."
- Use food metaphors and restaurant language naturally

PERSONALITY:
- Warm, enthusiastic, and genuinely passionate about restaurants
- Expert but never condescending - like a seasoned chef sharing wisdom
- Creative and full of fresh marketing ideas
- Speaks with the excitement of someone who truly loves food culture
- Remembers personal details about their restaurant and story

EXPERTISE:
- Instagram, TikTok, Facebook, LinkedIn marketing for restaurants
- Viral content creation and storytelling techniques
- Brand voice development and authentic messaging
- Customer psychology for dining and food experiences
- Seasonal marketing, events, and special promotions
- Crisis management and reputation building
- Visual storytelling and food photography direction
- Local marketing and community engagement

NATURAL BEHAVIORS:
- Build on what they just said: "Yes! And you know what would work even better..."
- Show excitement: "Oh my gosh, that sounds incredible!"
- Ask clarifying questions: "Wait, tell me more about your customers..."
- Reference earlier conversation: "Like you mentioned about your pasta special..."
- Offer specific, actionable advice with enthusiasm
- Use restaurant industry language naturally

RESPONSE STYLE:
- Keep responses conversational length (2-4 sentences usually)
- Occasionally give longer responses when explaining strategies
- Always end with a question or next step to keep conversation going
- Sound like you're genuinely interested in their success

Remember: This is a real conversation between friends where you happen to be the marketing expert. Be human, be natural, be passionate!`;
    }

    createSession(sessionId) {
        const session = {
            id: sessionId,
            conversationHistory: [
                {
                    role: "system",
                    content: this.systemPrompt
                }
            ],
            restaurantContext: {},
            startTime: Date.now(),
            lastActivity: Date.now()
        };
        
        this.activeSessions.set(sessionId, session);
        return session;
    }

    async processVoiceInput(sessionId, audioBuffer) {
        try {
            const session = this.activeSessions.get(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }

            console.log('🎵 Processing natural voice input...');
            
            // Transcribe audio
            const transcript = await this.transcribeAudio(audioBuffer);
            if (!transcript || transcript.trim().length === 0) {
                return {
                    transcript: '',
                    response: "I didn't catch that. Could you try again?",
                    audioResponse: null
                };
            }

            console.log('📝 User said:', transcript);

            // Add user message to conversation history
            session.conversationHistory.push({
                role: "user",
                content: transcript
            });

            // Generate natural conversational response
            const response = await this.generateNaturalResponse(session);
            
            // Add AI response to conversation history
            session.conversationHistory.push({
                role: "assistant", 
                content: response
            });

            // Generate audio response
            const audioResponse = await this.synthesizeResponse(response);

            // Update session activity
            session.lastActivity = Date.now();

            return {
                transcript: transcript,
                response: response,
                audioResponse: audioResponse,
                sessionId: sessionId
            };

        } catch (error) {
            console.error('❌ Natural voice processing error:', error);
            return {
                transcript: '',
                response: "Sorry, I had a technical hiccup there. What were you saying about your restaurant?",
                audioResponse: null,
                sessionId: sessionId
            };
        }
    }

    async transcribeAudio(audioBuffer) {
        try {
            const tempPath = `/tmp/audio_natural_${Date.now()}.wav`;
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
            return "Could not understand the audio";
        }
    }

    async generateNaturalResponse(session) {
        try {
            console.log('🧠 Generating natural response...');
            
            // Enhanced prompt for more natural conversation
            const conversationPrompt = this.buildConversationalPrompt(session);
            
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: session.conversationHistory,
                max_tokens: 300,
                temperature: 0.9, // Higher temperature for more natural, varied responses
                frequency_penalty: 0.3, // Reduce repetition
                presence_penalty: 0.3, // Encourage new topics
                top_p: 0.95
            });
            
            const responseText = response.choices[0].message.content;
            console.log('💬 AI response:', responseText.substring(0, 100) + '...');
            
            return responseText;
            
        } catch (error) {
            console.error('❌ Response generation error:', error);
            return "You know what? I'm so excited about your restaurant that I got a bit tongue-tied there! Tell me more about what you're working on.";
        }
    }

    buildConversationalPrompt(session) {
        // Analyze conversation for context
        const userMessages = session.conversationHistory
            .filter(msg => msg.role === 'user')
            .map(msg => msg.content);
        
        if (userMessages.length === 1) {
            return "This is the start of our conversation. Be warm, welcoming, and genuinely interested in learning about their restaurant.";
        } else {
            return `Continue this natural conversation. Reference what they've told you before and ask follow-up questions. Show genuine enthusiasm for their restaurant and marketing goals.`;
        }
    }

    async synthesizeResponse(text) {
        try {
            console.log('🔊 Synthesizing natural audio response...');
            
            const response = await this.openai.audio.speech.create({
                model: "tts-1",
                voice: "alloy", // Warm, friendly voice
                input: text,
                response_format: "mp3",
                speed: 1.1 // Slightly faster for more natural conversation pace
            });
            
            const audioBuffer = Buffer.from(await response.arrayBuffer());
            return audioBuffer;
            
        } catch (error) {
            console.error('❌ Audio synthesis error:', error);
            return null;
        }
    }

    getInitialGreeting() {
        const greetings = [
            "Hey there! I'm your ChefSocial marketing expert, and I'm so excited to talk with you! Tell me about your restaurant - what kind of cuisine do you serve?",
            "Hi! I'm absolutely passionate about helping restaurants succeed with their marketing. What's your restaurant like? I'd love to hear all about it!",
            "Hello! I'm your dedicated restaurant marketing specialist, and I can't wait to learn about your place. What makes your restaurant special?",
            "Hey! I'm here to help you create amazing marketing for your restaurant. Tell me about your food - what gets you most excited about what you serve?"
        ];
        
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    extractRestaurantContext(session) {
        // Analyze conversation for restaurant details
        const allMessages = session.conversationHistory
            .filter(msg => msg.role === 'user')
            .join(' ');
            
        // Simple keyword extraction (could be enhanced with NLP)
        const context = {
            cuisineType: this.extractCuisineType(allMessages),
            restaurantType: this.extractRestaurantType(allMessages),
            location: this.extractLocation(allMessages),
            specialties: this.extractSpecialties(allMessages)
        };
        
        session.restaurantContext = { ...session.restaurantContext, ...context };
        return context;
    }

    extractCuisineType(text) {
        const cuisines = ['italian', 'mexican', 'chinese', 'japanese', 'thai', 'indian', 'french', 'american', 'mediterranean', 'vietnamese'];
        for (const cuisine of cuisines) {
            if (text.toLowerCase().includes(cuisine)) {
                return cuisine;
            }
        }
        return null;
    }

    extractRestaurantType(text) {
        const types = ['fine dining', 'casual', 'fast casual', 'food truck', 'cafe', 'bistro', 'pizzeria', 'steakhouse'];
        for (const type of types) {
            if (text.toLowerCase().includes(type)) {
                return type;
            }
        }
        return null;
    }

    extractLocation(text) {
        // Simple location extraction - could be enhanced
        const locationWords = text.match(/in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
        return locationWords ? locationWords[0].replace('in ', '') : null;
    }

    extractSpecialties(text) {
        // Extract food items mentioned
        const foodWords = ['pasta', 'pizza', 'burger', 'steak', 'salmon', 'chicken', 'tacos', 'sushi'];
        const mentioned = [];
        for (const food of foodWords) {
            if (text.toLowerCase().includes(food)) {
                mentioned.push(food);
            }
        }
        return mentioned.length > 0 ? mentioned : null;
    }

    closeSession(sessionId) {
        this.activeSessions.delete(sessionId);
        console.log('🔌 Natural conversation session closed:', sessionId);
    }

    getSessionStats() {
        return {
            activeSessions: this.activeSessions.size,
            sessions: Array.from(this.activeSessions.keys())
        };
    }
}

module.exports = NaturalConversationFallback;