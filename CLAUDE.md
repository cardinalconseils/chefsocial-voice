# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChefSocial Voice is a full-stack Node.js application that provides AI-powered voice conversation tools for restaurant marketing. The codebase consists of a main monolithic backend application and a separate Next.js admin panel.

## Development Commands

### Main Application (Node.js Backend)
```bash
# Start development server
npm run dev
# or
npm start

# Both commands run: node src/server.js
# Server runs on port 3001 by default
```

### Admin Panel (Next.js Frontend)
```bash
cd admin-panel/

# Development
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint checking
npm run export       # Static export for deployment
```

### AI Training System
```bash
# Train custom models
node ai-training/start-training.js

# Check training status
node ai-training/check-training-status.js

# Test models
node ai-training/test-direct-models.js
```

### Utility Scripts
```bash
# Create admin user
node create-admin.js

# Test specific systems
node test-enhanced-voice-agent.js
node test-multilingual.js
node test-pricing.js
node test-rate-limiting.js
node test-validation.js
```

## Core Architecture

### Service Layer Architecture
The application follows a modular service-based architecture where each major feature is encapsulated in its own service class:

- **AuthSystem** (`auth-system.js`) - JWT authentication, Stripe integration, user management
- **Database** (`database.js`) - SQLite database layer with comprehensive user, subscription, and audit tables
- **ValidationSystem** (`validation-system.js`) - Input validation and sanitization
- **RateLimitService** (`rate-limit-service.js`) - API rate limiting with Redis backing
- **CacheService** (`cache-service.js`) - Redis-based caching for performance
- **SMSService** (`sms-service.js`) - Twilio SMS integration for workflows
- **LiveKitService** (`livekit-service.js`) - Real-time voice conversation handling
- **LoggingSystem** (`logging-system.js`) - Winston-based logging with database persistence

### Main Server Structure
The main server (`src/server.js`) initializes all services and provides:
- RESTful API endpoints for voice processing
- WebSocket connections for real-time communication
- Admin API endpoints for user management
- Static file serving for frontend pages
- Comprehensive middleware stack (security, CORS, rate limiting, validation)

### Database Schema
SQLite database with key tables:
- `users` - User accounts with restaurant profiles and subscription data
- `subscriptions` - Stripe subscription management
- `generated_content` - AI-generated social media content
- `audit_logs` - Admin action tracking
- `user_sessions` - JWT session management with security tracking
- `usage_tracking` - Feature usage monitoring
- `voice_sessions` - LiveKit conversation session data

### Frontend Architecture
- **Static HTML pages** in `public/` for main user interface
- **Separate Next.js admin panel** in `admin-panel/` for administrative functions
- **Multilingual support** via `i18n/` with English and French translations

## Key Integration Points

### External Services
- **OpenAI API** - AI conversation and content generation
- **Stripe** - Payment processing and subscription management
- **Twilio** - SMS communications
- **LiveKit** - Real-time voice conversation infrastructure
- **Redis** - Caching and rate limiting (ioredis client)

### Authentication Flow
1. JWT-based authentication with access/refresh token pattern
2. Stripe customer creation on registration
3. Role-based access control (user/admin)
4. Session tracking with IP and device information
5. Failed login attempt monitoring and IP blocking

### AI Training System
Located in `ai-training/`, this subsystem handles:
- Custom model fine-tuning for regional dialects (en-CA, en-UK, en-US, fr-CA, fr-FR)
- Training data collection and management
- Model deployment and testing
- Performance monitoring and iteration

## Environment Configuration

Required environment variables:
```bash
# Core API Keys
OPENAI_API_KEY=          # OpenAI API access
STRIPE_SECRET_KEY=       # Stripe payment processing
TWILIO_ACCOUNT_SID=      # Twilio SMS service
TWILIO_AUTH_TOKEN=       # Twilio authentication

# LiveKit Configuration
LIVEKIT_API_KEY=         # Real-time voice service
LIVEKIT_API_SECRET=      # LiveKit authentication
LIVEKIT_URL=             # LiveKit server URL

# Redis Configuration
REDIS_URL=               # Redis cache/queue service

# Security
JWT_SECRET=              # JWT token signing key

# Application Settings
NODE_ENV=production      # Environment mode
PORT=3001               # Server port
```

## Admin Panel Integration

The admin panel (`admin-panel/`) is a separate Next.js application that communicates with the main backend via API calls. It provides:
- Admin authentication and role management
- User account oversight and management
- Platform analytics and usage reports
- Audit log review and security monitoring
- Subscription and billing management interface

The admin panel is configured for deployment to `app.chefsocial.io/admin` with automated GitHub Actions deployment to Vercel.

## Development Patterns

### Error Handling
- Comprehensive try-catch blocks with detailed error logging
- User-friendly error messages with appropriate HTTP status codes
- Audit trail logging for admin actions and security events

### Security Implementation
- Helmet.js for security headers
- Express rate limiting with Redis backing
- Input validation using express-validator
- CORS configuration for production domains
- SQL injection prevention via parameterized queries

### Performance Optimization
- Redis caching for frequently accessed user data and features
- Database indexing on critical lookup fields
- Compression middleware for response optimization
- Connection pooling and proper resource cleanup

### Multilingual Support
The I18n system supports English and French with:
- Automatic language detection
- Translation file management in `i18n/translations/`
- Middleware integration for request-level language setting
- Content generation in user's preferred language