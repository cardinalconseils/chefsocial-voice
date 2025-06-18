// ChefSocial Voice AI - Modular Server Entry Point
require('dotenv').config();

const app = require('./app');
// const WebSocketService = require('./websocket'); // TODO: Implement WebSocket service

// Server configuration
const PORT = process.env.PORT || 3001;

// Validate required environment variables
const requiredEnvVars = [
    'OPENAI_API_KEY',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
}

// Start HTTP server
const server = app.listen(PORT, () => {
    console.log(`🚀 ChefSocial Voice AI server running on port ${PORT}`);
    console.log(`📱 Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`🎙️ Voice Interface: http://localhost:${PORT}/index.html`);
    console.log(`🎤 LiveKit Voice: http://localhost:${PORT}/livekit-voice.html`);
    console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Initialize WebSocket services
// const webSocketService = new WebSocketService(server); // TODO: Implement WebSocket service

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    try {
        // Close WebSocket connections
        console.log('🔌 Closing WebSocket connections...');
        // await webSocketService.shutdown(); // TODO: Implement WebSocket service
        
        // Close HTTP server
        console.log('🌐 Closing HTTP server...');
        server.close(() => {
            console.log('✅ Server closed successfully');
            process.exit(0);
        });
        
        // Force shutdown after 30 seconds
        setTimeout(() => {
            console.error('❌ Forced shutdown after timeout');
            process.exit(1);
        }, 30000);
        
    } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

module.exports = server;