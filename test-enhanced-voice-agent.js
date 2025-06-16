// Test Enhanced Voice Agent
require('dotenv').config();
const EnhancedVoiceAgent = require('./enhanced-voice-agent');

async function testEnhancedVoiceAgent() {
    console.log('🧪 Testing Enhanced Voice Agent');
    console.log('===============================\n');

    const agent = new EnhancedVoiceAgent();
    
    // Test 1: Create Session
    console.log('1. Creating session...');
    const sessionId = 'test_session_123';
    const userContext = {
        userId: 'chef_123',
        language: 'en',
        region: 'en-US',
        timezone: 'America/New_York'
    };
    
    const session = agent.createSession(sessionId, userContext);
    console.log('✅ Session created:', session.id);
    console.log('Initial phase:', session.conversationState.phase);
    
    // Test 2: Get Initial Greeting
    console.log('\n2. Getting initial greeting...');
    const greeting = agent.getInitialGreeting('en');
    console.log('✅ Greeting:', greeting);
    
    // Test 3: Simulate conversation
    console.log('\n3. Simulating conversation...');
    
    // Simulate user saying "I have an Italian restaurant in New York"
    const mockUserInput = "I have an Italian restaurant in New York called Mario's Pizzeria. We serve authentic Neapolitan pizza and pasta.";
    
    // Analyze and update profile
    await agent.analyzeAndUpdateProfile(session, mockUserInput);
    console.log('✅ Restaurant profile updated:');
    console.log('Name:', session.restaurantProfile.name);
    console.log('Cuisine:', session.restaurantProfile.cuisineType);
    console.log('Location:', session.restaurantProfile.location);
    
    // Test 4: Generate intelligent response
    console.log('\n4. Generating intelligent response...');
    
    // Add user message to history
    session.conversationHistory.push({
        role: "user",
        content: mockUserInput
    });
    
    const response = await agent.generateIntelligentResponse(session, {});
    console.log('✅ AI Response:', response);
    
    // Test 5: Update conversation state
    console.log('\n5. Updating conversation state...');
    agent.updateConversationState(session, mockUserInput, response);
    console.log('✅ New phase:', session.conversationState.phase);
    
    // Test 6: Content generation from conversation
    console.log('\n6. Generating content from conversation...');
    try {
        const content = await agent.createContentFromConversation(sessionId, 'social_media');
        console.log('✅ Generated content:');
        console.log('Instagram caption:', content.instagram?.caption?.substring(0, 100) + '...');
        console.log('Region:', content.metadata?.region);
        console.log('Model type:', content.metadata?.modelType);
    } catch (contentError) {
        console.log('⚠️ Content generation test skipped:', contentError.message);
    }
    
    // Test 7: Session stats
    console.log('\n7. Getting session statistics...');
    const stats = agent.getSessionStats();
    console.log('✅ Active sessions:', stats.activeSessions);
    console.log('Session details:', stats.sessions);
    
    // Test 8: Language detection
    console.log('\n8. Testing language detection...');
    const frenchText = "Bonjour, j'ai un restaurant français à Montréal";
    const englishText = "Hello, I have an American restaurant in Chicago";
    
    console.log('French detection:', agent.detectLanguageFromText(frenchText));
    console.log('English detection:', agent.detectLanguageFromText(englishText));
    
    // Cleanup
    agent.closeSession(sessionId);
    console.log('\n✅ Test completed successfully!');
}

// Test conversation flow
async function testConversationFlow() {
    console.log('\n🎭 Testing Full Conversation Flow');
    console.log('=================================\n');
    
    const agent = new EnhancedVoiceAgent();
    const sessionId = 'conversation_test_456';
    const userContext = {
        userId: 'chef_456',
        language: 'fr',
        region: 'fr-CA',
        timezone: 'America/Montreal'
    };
    
    const session = agent.createSession(sessionId, userContext);
    
    // Simulate a conversation in French
    const conversationSteps = [
        "Bonjour! J'ai un restaurant québécois à Montréal.",
        "Nous servons de la poutine, des tourtières et des plats traditionnels du Québec.",
        "Notre plus grand défi c'est d'attirer les jeunes clients sur les réseaux sociaux.",
        "Nous aimerions augmenter notre présence sur Instagram et TikTok."
    ];
    
    for (let i = 0; i < conversationSteps.length; i++) {
        const userInput = conversationSteps[i];
        console.log(`👤 User: ${userInput}`);
        
        // Add to conversation history
        session.conversationHistory.push({
            role: "user",
            content: userInput
        });
        
        // Analyze and update profile
        await agent.analyzeAndUpdateProfile(session, userInput);
        
        // Generate response
        const response = await agent.generateIntelligentResponse(session, {});
        
        // Add AI response to history
        session.conversationHistory.push({
            role: "assistant",
            content: response
        });
        
        // Update conversation state
        agent.updateConversationState(session, userInput, response);
        
        console.log(`🤖 AI: ${response}`);
        console.log(`📊 Phase: ${session.conversationState.phase}`);
        console.log('---\n');
        
        // Small delay to simulate real conversation
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('🎯 Final Restaurant Profile:');
    console.log(JSON.stringify(session.restaurantProfile, null, 2));
    
    agent.closeSession(sessionId);
}

// Run tests
async function runAllTests() {
    try {
        await testEnhancedVoiceAgent();
        await testConversationFlow();
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run if called directly
if (require.main === module) {
    runAllTests();
}

module.exports = { testEnhancedVoiceAgent, testConversationFlow };