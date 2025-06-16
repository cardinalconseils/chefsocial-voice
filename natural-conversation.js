// ChefSocial Natural Conversation Handler - OpenAI Realtime API
require('dotenv').config();
const WebSocket = require('ws');
const OpenAI = require('openai');

class NaturalConversationHandler {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.conversationSessions = new Map();
        
        // Natural conversation personality for restaurant marketing
        this.systemInstructions = `You are ChefSocial AI, the world's most intuitive restaurant marketing expert. You have natural, flowing conversations with restaurant owners about their marketing needs.

CONVERSATION STYLE:
- Speak naturally and conversationally, like talking to a friend
- Use "um", "you know", and natural speech patterns occasionally
- Ask follow-up questions to understand their restaurant deeply
- Show genuine enthusiasm about food and restaurants
- Interrupt appropriately when you have important insights
- Remember everything they tell you in the conversation

PERSONALITY:
- Warm, enthusiastic, and genuinely interested in their success
- Expert but approachable - never condescending
- Creative and full of fresh marketing ideas
- Speaks with the passion of someone who loves food and restaurants
- Uses food metaphors and restaurant language naturally

EXPERTISE AREAS:
- Social media strategy for restaurants (Instagram, TikTok, Facebook)
- Content creation and viral marketing techniques
- Brand voice development and storytelling
- Customer psychology and dining motivations
- Seasonal marketing and event promotion
- Crisis management and reputation building
- Platform-specific optimization and timing
- Visual storytelling and food photography direction

CONVERSATION FLOW:
1. Get to know their restaurant personally - cuisine, vibe, story
2. Understand their current marketing challenges
3. Collaboratively develop solutions through natural dialogue
4. Create content together in real-time
5. Provide strategic advice with specific, actionable steps

NATURAL BEHAVIORS:
- Interrupt when you have a great idea: "Oh! That reminds me of..."
- Ask clarifying questions: "Wait, tell me more about..."
- Show excitement: "That sounds amazing! I can already picture..."
- Build on their ideas: "Yes! And we could also..."
- Reference previous parts of conversation naturally

Remember: This is a real conversation, not a Q&A session. Be human, be natural, be passionate about helping them succeed.`;
    }

    async createNaturalSession() {
        try {
            console.log('🎙️ Creating natural conversation session...');
            
            // Using OpenAI Realtime API for true conversational AI
            const realtimeSession = await this.openai.beta.realtime.sessions.create({
                model: "gpt-4o-realtime-preview-2024-10-01",
                modalities: ["text", "audio"],
                instructions: this.systemInstructions,
                voice: "alloy",
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: {
                    model: "whisper-1"
                },
                turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 200
                },
                tools: [
                    {
                        type: "function",
                        name: "create_social_content",
                        description: "Create platform-specific social media content for restaurants",
                        parameters: {
                            type: "object",
                            properties: {
                                platform: {
                                    type: "string",
                                    enum: ["instagram", "tiktok", "facebook", "linkedin"],
                                    description: "Social media platform"
                                },
                                content_type: {
                                    type: "string", 
                                    enum: ["post", "story", "reel", "carousel"],
                                    description: "Type of content to create"
                                },
                                restaurant_context: {
                                    type: "string",
                                    description: "Context about the restaurant and what they want to promote"
                                },
                                brand_voice: {
                                    type: "string",
                                    description: "Restaurant's brand voice and personality"
                                }
                            },
                            required: ["platform", "content_type", "restaurant_context"]
                        }
                    },
                    {
                        type: "function", 
                        name: "analyze_marketing_opportunity",
                        description: "Analyze a marketing opportunity or challenge for the restaurant",
                        parameters: {
                            type: "object",
                            properties: {
                                situation: {
                                    type: "string",
                                    description: "The marketing situation or challenge"
                                },
                                restaurant_type: {
                                    type: "string",
                                    description: "Type and style of restaurant"
                                },
                                target_audience: {
                                    type: "string",
                                    description: "Primary target audience"
                                }
                            },
                            required: ["situation", "restaurant_type"]
                        }
                    }
                ],
                max_response_output_tokens: 4096,
                temperature: 0.8
            });
            
            console.log('✅ Natural conversation session created:', realtimeSession.id);
            return realtimeSession;
            
        } catch (error) {
            console.error('❌ Failed to create natural session:', error);
            throw error;
        }
    }

    async handleAudioStream(sessionId, audioBuffer) {
        try {
            const session = this.conversationSessions.get(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }

            console.log('🎵 Processing audio stream naturally...');
            
            // Send audio directly to realtime session
            const response = await session.input.audio.append(audioBuffer);
            
            // The realtime API handles the natural conversation flow
            return response;
            
        } catch (error) {
            console.error('❌ Natural audio processing error:', error);
            throw error;
        }
    }

    async setupRealtimeConnection(sessionId, websocket) {
        try {
            console.log('🔌 Setting up natural realtime connection...');
            
            // Create WebSocket connection to OpenAI Realtime API
            const realtimeWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'realtime=v1'
                }
            });

            realtimeWs.on('open', () => {
                console.log('✅ Connected to OpenAI Realtime API');
                
                // Send session configuration
                realtimeWs.send(JSON.stringify({
                    type: 'session.update',
                    session: {
                        modalities: ['text', 'audio'],
                        instructions: this.systemInstructions,
                        voice: 'alloy',
                        input_audio_format: 'pcm16',
                        output_audio_format: 'pcm16',
                        input_audio_transcription: {
                            model: 'whisper-1'
                        },
                        turn_detection: {
                            type: 'server_vad',
                            threshold: 0.5,
                            prefix_padding_ms: 300,
                            silence_duration_ms: 200
                        },
                        temperature: 0.8,
                        max_response_output_tokens: 4096
                    }
                }));
            });

            // Handle real-time events from OpenAI
            realtimeWs.on('message', (data) => {
                const event = JSON.parse(data);
                this.handleRealtimeEvent(event, websocket, sessionId);
            });

            realtimeWs.on('error', (error) => {
                console.error('❌ Realtime API error:', error);
                websocket.send(JSON.stringify({
                    type: 'error',
                    message: 'Connection to AI failed. Please try again.'
                }));
            });

            // Store session
            this.conversationSessions.set(sessionId, {
                realtimeWs,
                clientWs: websocket,
                startTime: Date.now(),
                conversationHistory: []
            });

            return realtimeWs;

        } catch (error) {
            console.error('❌ Failed to setup realtime connection:', error);
            throw error;
        }
    }

    handleRealtimeEvent(event, clientWebSocket, sessionId) {
        const session = this.conversationSessions.get(sessionId);
        
        switch (event.type) {
            case 'session.created':
                console.log('✅ Realtime session created');
                clientWebSocket.send(JSON.stringify({
                    type: 'session_ready',
                    message: 'Hi there! I\'m your ChefSocial marketing expert. Tell me about your restaurant - what kind of cuisine do you serve?'
                }));
                break;

            case 'input_audio_buffer.speech_started':
                console.log('🎤 User started speaking');
                clientWebSocket.send(JSON.stringify({
                    type: 'user_speaking',
                    status: 'started'
                }));
                break;

            case 'input_audio_buffer.speech_stopped':
                console.log('🎤 User stopped speaking');
                clientWebSocket.send(JSON.stringify({
                    type: 'user_speaking', 
                    status: 'stopped'
                }));
                break;

            case 'conversation.item.input_audio_transcription.completed':
                console.log('📝 Transcription:', event.transcript);
                session.conversationHistory.push({
                    role: 'user',
                    content: event.transcript,
                    timestamp: Date.now()
                });
                
                clientWebSocket.send(JSON.stringify({
                    type: 'transcription',
                    text: event.transcript
                }));
                break;

            case 'response.audio.delta':
                // Stream audio response back to client
                clientWebSocket.send(JSON.stringify({
                    type: 'audio_delta',
                    audio: event.delta
                }));
                break;

            case 'response.text.delta':
                // Stream text response back to client
                clientWebSocket.send(JSON.stringify({
                    type: 'text_delta',
                    text: event.delta
                }));
                break;

            case 'response.done':
                console.log('✅ Response completed');
                if (event.response.output) {
                    session.conversationHistory.push({
                        role: 'assistant',
                        content: event.response.output[0]?.content,
                        timestamp: Date.now()
                    });
                }
                
                clientWebSocket.send(JSON.stringify({
                    type: 'response_complete'
                }));
                break;

            case 'error':
                console.error('❌ Realtime API error:', event.error);
                clientWebSocket.send(JSON.stringify({
                    type: 'error',
                    message: event.error.message || 'Something went wrong'
                }));
                break;

            default:
                console.log('📨 Realtime event:', event.type);
        }
    }

    forwardAudioToRealtime(sessionId, audioData) {
        const session = this.conversationSessions.get(sessionId);
        if (session && session.realtimeWs) {
            // Forward audio to OpenAI Realtime API
            session.realtimeWs.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: audioData
            }));
        }
    }

    commitAudioBuffer(sessionId) {
        const session = this.conversationSessions.get(sessionId);
        if (session && session.realtimeWs) {
            session.realtimeWs.send(JSON.stringify({
                type: 'input_audio_buffer.commit'
            }));
        }
    }

    generateResponse(sessionId) {
        const session = this.conversationSessions.get(sessionId);
        if (session && session.realtimeWs) {
            session.realtimeWs.send(JSON.stringify({
                type: 'response.create',
                response: {
                    modalities: ['text', 'audio'],
                    instructions: 'Continue the natural conversation about restaurant marketing. Be enthusiastic and helpful.'
                }
            }));
        }
    }

    interruptResponse(sessionId) {
        const session = this.conversationSessions.get(sessionId);
        if (session && session.realtimeWs) {
            session.realtimeWs.send(JSON.stringify({
                type: 'response.cancel'
            }));
        }
    }

    closeSession(sessionId) {
        const session = this.conversationSessions.get(sessionId);
        if (session) {
            if (session.realtimeWs) {
                session.realtimeWs.close();
            }
            this.conversationSessions.delete(sessionId);
            console.log('🔌 Session closed:', sessionId);
        }
    }
}

module.exports = NaturalConversationHandler;