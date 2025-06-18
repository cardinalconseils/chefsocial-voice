// Enhanced ChefSocial Voice Agent with Full Conversational Capabilities
require('dotenv').config();
const OpenAI = require('openai');
const axios = require('axios'); // For external integrations
const RegionalModelRouter = require('../../ai-training/regional-model-router');

class EnhancedVoiceAgent {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.regionalRouter = new RegionalModelRouter();
        this.activeSessions = new Map();
        
        // Enhanced system prompt for intelligent conversation
        this.systemPrompt = `You are ChefSocial AI, an expert restaurant marketing consultant with deep knowledge of the food industry. You're having a natural conversation with a chef/restaurant owner.

CORE CAPABILITIES:
- Restaurant marketing strategy and content creation
- Social media optimization (Instagram, TikTok, Facebook)
- Customer engagement and retention strategies
- Menu optimization and pricing advice
- Brand development and voice creation
- Crisis management and reputation building
- Local marketing and community engagement
- Food photography and visual storytelling direction
- Revenue optimization and seasonal promotions

CONVERSATION INTELLIGENCE:
- Remember everything the user tells you about their restaurant
- Ask intelligent follow-up questions to understand their needs
- Provide specific, actionable recommendations
- Adapt your language to their region (Quebec French, France French, American English, Canadian English, UK English)
- Reference their previous conversations and context
- Proactively suggest solutions based on their situation

PERSONALITY:
- Warm, enthusiastic, and genuinely passionate about restaurants
- Expert but approachable - like a seasoned consultant and friend
- Ask clarifying questions: "Tell me more about your target customers..."
- Show excitement: "That sounds incredible! You know what would work perfectly..."
- Reference context: "Based on what you told me about your Italian place..."
- Offer specific advice: "Here's exactly what I'd do for your summer menu..."

QUESTION TYPES YOU ASK:
1. Discovery: "What type of cuisine do you serve? Who are your main customers?"
2. Challenge identification: "What's your biggest marketing challenge right now?"
3. Context gathering: "How long have you been open? What's your busiest day?"
4. Goal setting: "What would success look like for you this quarter?"
5. Implementation: "When would be the best time to launch this campaign?"

RECOMMENDATION FRAMEWORK:
- Always provide 3 specific action items
- Include timeline and expected results
- Mention tools, platforms, or resources they need
- Give examples from similar restaurants
- Explain the 'why' behind each recommendation

RESPONSE STYLE:
- Keep responses conversational (2-4 sentences usually)
- End with questions to continue the conversation
- Show genuine interest in their success
- Use restaurant industry language naturally
- Adapt to their detected language and region`;

        // Integration endpoints
        this.integrations = {
            n8n: process.env.N8N_WEBHOOK_URL,
            analytics: process.env.ANALYTICS_API_URL,
            social_media: process.env.SOCIAL_MEDIA_API_URL
        };
    }

    createSession(sessionId, userContext = {}) {
        const session = {
            id: sessionId,
            conversationHistory: [
                {
                    role: "system",
                    content: this.systemPrompt
                }
            ],
            userContext: {
                userId: userContext.userId,
                language: userContext.language || 'en',
                region: userContext.region || 'en-US',
                timezone: userContext.timezone || 'UTC'
            },
            restaurantProfile: {
                name: null,
                cuisineType: null,
                location: null,
                customerBase: null,
                challenges: [],
                goals: [],
                currentCampaigns: []
            },
            conversationState: {
                phase: 'discovery', // discovery, problem_solving, implementation, follow_up
                lastQuestionType: null,
                awaitingSpecificInfo: null,
                recommendations: []
            },
            startTime: Date.now(),
            lastActivity: Date.now()
        };
        
        this.activeSessions.set(sessionId, session);
        return session;
    }

    async processVoiceInput(sessionId, audioBuffer, userContext = {}) {
        try {
            const session = this.activeSessions.get(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }

            console.log('🎵 Processing voice input with enhanced intelligence...');
            
            // Enhanced transcription with language detection
            const transcriptionResult = await this.transcribeWithLanguageDetection(audioBuffer, session.userContext.language);
            const transcript = transcriptionResult.text;
            const detectedLanguage = transcriptionResult.detectedLanguage;
            
            if (!transcript || transcript.trim().length === 0) {
                return this.createResponse(session, '', this.getLanguageSpecificResponse('no_audio', detectedLanguage));
            }

            console.log('📝 User said:', transcript);
            console.log('🌐 Detected language:', detectedLanguage);

            // Update session language if detected differently
            if (detectedLanguage !== session.userContext.language) {
                session.userContext.language = detectedLanguage;
                session.userContext.region = this.mapLanguageToRegion(detectedLanguage);
                console.log('🔄 Updated session language to:', detectedLanguage);
            }

            // Add user message to conversation history
            session.conversationHistory.push({
                role: "user",
                content: transcript
            });

            // Analyze user input and update restaurant profile
            await this.analyzeAndUpdateProfile(session, transcript);

            // Get external data if needed
            const externalData = await this.fetchExternalRecommendations(session);

            // Generate intelligent response
            const response = await this.generateIntelligentResponse(session, externalData);
            
            // Add AI response to conversation history
            session.conversationHistory.push({
                role: "assistant", 
                content: response
            });

            // Generate audio response in detected language
            const audioResponse = await this.synthesizeRegionalResponse(response, detectedLanguage);

            // Update session activity and state
            session.lastActivity = Date.now();
            this.updateConversationState(session, transcript, response);

            return this.createResponse(session, transcript, response, audioResponse);

        } catch (error) {
            console.error('❌ Enhanced voice processing error:', error);
            const session = this.activeSessions.get(sessionId);
            const language = session?.userContext?.language || 'en';
            return this.createResponse(session, '', this.getLanguageSpecificResponse('error', language));
        }
    }

    async transcribeWithLanguageDetection(audioBuffer, preferredLanguage = null) {
        try {
            const tempPath = `/tmp/enhanced_audio_${Date.now()}.wav`;
            require('fs').writeFileSync(tempPath, audioBuffer);
            
            // First pass: Auto-detect if no preference
            let firstPass = null;
            if (!preferredLanguage) {
                firstPass = await this.openai.audio.transcriptions.create({
                    file: require('fs').createReadStream(tempPath),
                    model: "whisper-1"
                });
            }
            
            // Detect language from first pass or use preference
            const detectedLanguage = preferredLanguage || this.detectLanguageFromText(firstPass?.text || '');
            const whisperLanguage = detectedLanguage === 'fr' ? 'fr' : 'en';
            
            // Second pass with detected language for accuracy
            const finalTranscription = await this.openai.audio.transcriptions.create({
                file: require('fs').createReadStream(tempPath),
                model: "whisper-1",
                language: whisperLanguage
            });
            
            // Cleanup
            require('fs').unlinkSync(tempPath);
            
            return {
                text: finalTranscription.text || finalTranscription,
                detectedLanguage: detectedLanguage
            };
            
        } catch (error) {
            console.error('❌ Enhanced transcription error:', error);
            return {
                text: "Could not understand the audio",
                detectedLanguage: preferredLanguage || 'en'
            };
        }
    }

    detectLanguageFromText(text) {
        if (!text || text.length < 3) return 'en';
        
        const frenchWords = ['le', 'la', 'les', 'de', 'du', 'et', 'avec', 'pour', 'dans', 'restaurant', 'plat', 'cuisine', 'délicieux', 'bon', 'très', 'bien', 'bonjour', 'merci'];
        const englishWords = ['the', 'and', 'to', 'for', 'in', 'restaurant', 'food', 'good', 'great', 'hello', 'thank', 'please'];
        
        const words = text.toLowerCase().split(/\s+/);
        let frenchScore = 0;
        let englishScore = 0;
        
        words.forEach(word => {
            if (frenchWords.includes(word)) frenchScore++;
            if (englishWords.includes(word)) englishScore++;
        });
        
        return frenchScore > englishScore * 0.8 ? 'fr' : 'en';
    }

    mapLanguageToRegion(language) {
        const mapping = {
            'fr': 'fr-CA', // Default to Quebec for French
            'en': 'en-US'  // Default to US for English
        };
        return mapping[language] || 'en-US';
    }

    async analyzeAndUpdateProfile(session, transcript) {
        try {
            // Use AI to extract restaurant information
            const analysisPrompt = `Analyze this restaurant owner's message and extract key information:
            
Message: "${transcript}"

Extract and return JSON with any mentioned:
- restaurantName
- cuisineType 
- location
- challenges (array)
- goals (array)
- customerType
- specialDishes (array)

Only include fields that are clearly mentioned. Return empty object if nothing is found.`;

            const analysis = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: analysisPrompt
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 200,
                temperature: 0.3
            });

            const extractedInfo = JSON.parse(analysis.choices[0].message.content);
            
            // Update restaurant profile with extracted information
            Object.keys(extractedInfo).forEach(key => {
                if (extractedInfo[key] && extractedInfo[key] !== '') {
                    if (Array.isArray(extractedInfo[key])) {
                        session.restaurantProfile[key] = [
                            ...(session.restaurantProfile[key] || []),
                            ...extractedInfo[key]
                        ];
                    } else {
                        session.restaurantProfile[key] = extractedInfo[key];
                    }
                }
            });

            console.log('📊 Updated restaurant profile:', session.restaurantProfile);

        } catch (error) {
            console.error('❌ Profile analysis error:', error);
        }
    }

    async fetchExternalRecommendations(session) {
        try {
            const externalData = {};

            // N8N Integration - Get personalized recommendations
            if (this.integrations.n8n && session.userContext.userId) {
                try {
                    const n8nData = await axios.post(this.integrations.n8n, {
                        userId: session.userContext.userId,
                        restaurantProfile: session.restaurantProfile,
                        conversationPhase: session.conversationState.phase
                    }, {
                        timeout: 3000,
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    externalData.recommendations = n8nData.data.recommendations;
                    externalData.accountInsights = n8nData.data.accountInsights;
                    console.log('📡 N8N recommendations received');
                } catch (n8nError) {
                    console.log('⚠️ N8N integration unavailable, using internal recommendations');
                }
            }

            // Analytics Integration - Get performance data
            if (this.integrations.analytics && session.userContext.userId) {
                try {
                    const analyticsData = await axios.get(`${this.integrations.analytics}/user/${session.userContext.userId}/performance`, {
                        timeout: 2000
                    });
                    
                    externalData.performance = analyticsData.data;
                    console.log('📈 Analytics data received');
                } catch (analyticsError) {
                    console.log('⚠️ Analytics integration unavailable');
                }
            }

            return externalData;

        } catch (error) {
            console.error('❌ External data fetch error:', error);
            return {};
        }
    }

    async generateIntelligentResponse(session, externalData = {}) {
        try {
            console.log('🧠 Generating intelligent response...');
            
            // Build context-aware prompt
            const contextPrompt = this.buildIntelligentPrompt(session, externalData);
            
            // Add context to conversation
            const messagesWithContext = [
                ...session.conversationHistory,
                {
                    role: "system",
                    content: contextPrompt
                }
            ];

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: messagesWithContext,
                max_tokens: 400,
                temperature: 0.8,
                frequency_penalty: 0.3,
                presence_penalty: 0.3
            });
            
            const responseText = response.choices[0].message.content;
            console.log('💬 Intelligent response generated:', responseText.substring(0, 100) + '...');
            
            return responseText;
            
        } catch (error) {
            console.error('❌ Intelligent response generation error:', error);
            return this.getLanguageSpecificResponse('fallback', session.userContext.language);
        }
    }

    buildIntelligentPrompt(session, externalData) {
        const profile = session.restaurantProfile;
        const state = session.conversationState;
        const language = session.userContext.language;
        
        let prompt = `CONTEXT FOR THIS RESPONSE:

Restaurant Profile:
- Name: ${profile.name || 'Not specified'}
- Cuisine: ${profile.cuisineType || 'Not specified'}
- Location: ${profile.location || 'Not specified'}
- Customer Base: ${profile.customerType || 'Not specified'}
- Known Challenges: ${profile.challenges.join(', ') || 'None identified yet'}
- Goals: ${profile.goals.join(', ') || 'None specified yet'}

Conversation Phase: ${state.phase}
Language: ${language}`;

        // Add external data context
        if (externalData.recommendations) {
            prompt += `\n\nPersonalized Recommendations from Account:
${JSON.stringify(externalData.recommendations, null, 2)}`;
        }

        if (externalData.performance) {
            prompt += `\n\nAccount Performance Data:
${JSON.stringify(externalData.performance, null, 2)}`;
        }

        // Add phase-specific guidance
        switch (state.phase) {
            case 'discovery':
                prompt += `\n\nFOCUS: Ask 1-2 smart questions to learn more about their restaurant. Show genuine interest in their story.`;
                break;
            case 'problem_solving':
                prompt += `\n\nFOCUS: Provide 2-3 specific, actionable recommendations based on their challenges. Explain the 'why' behind each suggestion.`;
                break;
            case 'implementation':
                prompt += `\n\nFOCUS: Give step-by-step guidance on implementing solutions. Include timelines and expected results.`;
                break;
            case 'follow_up':
                prompt += `\n\nFOCUS: Check on progress, celebrate wins, and suggest next steps for continuous improvement.`;
                break;
        }

        prompt += `\n\nRespond naturally in ${language === 'fr' ? 'French' : 'English'} with enthusiasm and expertise. End with a question to continue the conversation.`;

        return prompt;
    }

    async synthesizeRegionalResponse(text, language) {
        try {
            console.log('🔊 Synthesizing regional audio response...');
            
            // Choose voice based on language
            const voiceMap = {
                'fr': 'alloy', // Warm voice for French
                'en': 'nova'   // Friendly voice for English
            };
            
            const response = await this.openai.audio.speech.create({
                model: "tts-1-hd", // Higher quality for better conversation
                voice: voiceMap[language] || 'nova',
                input: text,
                response_format: "mp3",
                speed: 1.0 // Natural conversation pace
            });
            
            const audioBuffer = Buffer.from(await response.arrayBuffer());
            return audioBuffer;
            
        } catch (error) {
            console.error('❌ Regional audio synthesis error:', error);
            return null;
        }
    }

    updateConversationState(session, userInput, aiResponse) {
        const state = session.conversationState;
        
        // Analyze conversation progress
        const hasRestaurantBasics = session.restaurantProfile.name && session.restaurantProfile.cuisineType;
        const hasChallenges = session.restaurantProfile.challenges.length > 0;
        const hasGoals = session.restaurantProfile.goals.length > 0;
        
        // Update phase based on information gathered
        if (!hasRestaurantBasics) {
            state.phase = 'discovery';
        } else if (!hasChallenges || !hasGoals) {
            state.phase = 'problem_solving';
        } else if (aiResponse.includes('step') || aiResponse.includes('implement')) {
            state.phase = 'implementation';
        } else {
            state.phase = 'follow_up';
        }
        
        console.log('📊 Conversation phase updated to:', state.phase);
    }

    getLanguageSpecificResponse(type, language) {
        const responses = {
            'no_audio': {
                'fr': "Je n'ai pas bien entendu. Pouvez-vous répéter s'il vous plaît?",
                'en': "I didn't catch that. Could you try again?"
            },
            'error': {
                'fr': "J'ai eu un petit problème technique. De quoi parliez-vous concernant votre restaurant?",
                'en': "I had a technical hiccup there. What were you saying about your restaurant?"
            },
            'fallback': {
                'fr': "C'est passionnant! Parlez-moi plus de votre restaurant - quel type de cuisine servez-vous?",
                'en': "That's exciting! Tell me more about your restaurant - what kind of cuisine do you serve?"
            }
        };
        
        return responses[type]?.[language] || responses[type]?.['en'] || "Let's talk about your restaurant!";
    }

    getInitialGreeting(language = 'en') {
        const greetings = {
            'fr': [
                "Bonjour! Je suis votre expert en marketing ChefSocial et je suis ravi de vous parler! Parlez-moi de votre restaurant - quel type de cuisine servez-vous?",
                "Salut! Je suis passionné d'aider les restaurants à réussir leur marketing. Comment est votre restaurant? J'aimerais tout savoir!",
                "Bonjour! Je suis votre spécialiste marketing dédié aux restaurants. Qu'est-ce qui rend votre restaurant spécial?"
            ],
            'en': [
                "Hey there! I'm your ChefSocial marketing expert, and I'm so excited to talk with you! Tell me about your restaurant - what kind of cuisine do you serve?",
                "Hi! I'm absolutely passionate about helping restaurants succeed with their marketing. What's your restaurant like? I'd love to hear all about it!",
                "Hello! I'm your dedicated restaurant marketing specialist, and I can't wait to learn about your place. What makes your restaurant special?"
            ]
        };
        
        const languageGreetings = greetings[language] || greetings['en'];
        return languageGreetings[Math.floor(Math.random() * languageGreetings.length)];
    }

    createResponse(session, transcript, response, audioResponse = null) {
        return {
            transcript: transcript,
            response: response,
            audioResponse: audioResponse,
            sessionId: session.id,
            conversationState: session.conversationState,
            restaurantProfile: session.restaurantProfile,
            metadata: {
                language: session.userContext.language,
                region: session.userContext.region,
                phase: session.conversationState.phase,
                timestamp: new Date().toISOString()
            }
        };
    }

    closeSession(sessionId) {
        this.activeSessions.delete(sessionId);
        console.log('🔌 Enhanced conversation session closed:', sessionId);
    }

    getSessionStats() {
        return {
            activeSessions: this.activeSessions.size,
            sessions: Array.from(this.activeSessions.values()).map(s => ({
                id: s.id,
                phase: s.conversationState.phase,
                language: s.userContext.language,
                restaurantName: s.restaurantProfile.name,
                duration: Date.now() - s.startTime
            }))
        };
    }

    // Integration helpers
    async createContentFromConversation(sessionId, contentType = 'social_media') {
        const session = this.activeSessions.get(sessionId);
        if (!session) throw new Error('Session not found');

        // Use regional router to create content based on conversation context
        const contextualContent = `${session.restaurantProfile.name} serves ${session.restaurantProfile.cuisineType} cuisine in ${session.restaurantProfile.location}. Specialties include: ${session.restaurantProfile.specialDishes?.join(', ')}`;
        
        return await this.regionalRouter.generateRegionalContent(
            contextualContent,
            'Restaurant conversation context',
            {
                language: session.userContext.language,
                location: session.restaurantProfile.location,
                restaurantType: session.restaurantProfile.cuisineType
            }
        );
    }
}

module.exports = EnhancedVoiceAgent;