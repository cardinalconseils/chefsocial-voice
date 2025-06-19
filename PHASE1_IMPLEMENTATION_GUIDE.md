# Phase 1: Core Platform Foundation - Implementation Guide

## 🎯 Overview

This guide documents the complete implementation of **Phase 1: Core Platform Foundation** for ChefSocial Voice, providing robust backend infrastructure with persistent database, JWT authentication, and comprehensive user management APIs.

## 📋 Implementation Summary

### ✅ Completed Features

1. **Database Infrastructure** 
   - SQLite for development (PostgreSQL-ready architecture)
   - Optimized schema with proper indexes
   - Database connection pooling and error handling

2. **Enhanced Authentication System**
   - JWT access tokens (15-minute expiry)
   - Refresh tokens (7-day expiry) 
   - Secure password hashing with bcrypt
   - Token rotation and revocation

3. **User Management APIs**
   - Complete CRUD operations
   - Input validation with Zod schemas
   - Role-based access control

4. **Rate Limiting Service**
   - Tiered limits: 100 req/min (users), 1000 req/min (admins), 20 req/min (anonymous)
   - Automatic IP detection and user tier identification
   - Comprehensive rate limiting headers

5. **Error Handling & Logging**
   - Standardized error responses
   - Comprehensive logging system
   - Proper HTTP status codes

## 🏗️ Architecture Overview

```
├── src/
│   ├── lib/
│   │   ├── database.ts      # Database operations & schema
│   │   ├── auth.ts          # JWT & authentication services
│   │   └── validation.ts    # Zod schemas & input validation
│   ├── types/
│   │   └── auth.ts          # TypeScript interfaces
│   ├── app/api/
│   │   ├── auth/route.ts    # Login, register, token refresh
│   │   ├── user/route.ts    # User profile management
│   │   └── admin/users/     # Admin user management
│   └── middleware.ts        # Rate limiting middleware
```

## 🚀 Setup Instructions

### 1. Dependencies Installation

All required dependencies are already configured in `package.json`:

```bash
npm install
```

**Key Dependencies Added:**
- `better-sqlite3` - High-performance SQLite database
- `zod` - TypeScript-first schema validation
- `@types/better-sqlite3` - TypeScript definitions

### 2. Environment Configuration

Create `.env.local` file with the following variables:

```env
# Database Configuration
DATABASE_URL="file:./data/chefsocial.db"

# JWT Configuration (CHANGE THESE IN PRODUCTION!)
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here"

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"

# Application Configuration
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3004"

# Rate Limiting Configuration
RATE_LIMIT_ENABLED="true"

# Logging Configuration
LOG_LEVEL="info"
```

### 3. Database Initialization

The database will be automatically initialized on first API call. The system will:
- Create `./data/` directory
- Initialize SQLite database with optimized schema
- Set up proper indexes for performance

### 4. Start Development Server

```bash
npm run dev
```

Server starts on port **3004** (configured to avoid conflicts with busy ports 3000-3003).

## 📡 API Documentation

### Authentication Endpoints

#### POST `/api/auth` - Login/Register

**Login Request:**
```json
{
  "action": "login",
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Register Request:**
```json
{
  "action": "register",
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "restaurantName": "Doe's Kitchen",
  "cuisineType": "Italian",
  "location": "New York, NY",
  "phone": "+1-555-0123",
  "marketingConsent": true
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_12345",
    "email": "user@example.com",
    "name": "John Doe",
    "restaurantName": "Doe's Kitchen",
    "role": "user",
    "subscriptionStatus": "trialing",
    "trialEndDate": "2024-02-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

#### POST `/api/auth` - Token Refresh

**Request:**
```json
{
  "action": "refresh",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

#### DELETE `/api/auth` - Logout

**Request:**
```json
{
  "refreshToken": "a1b2c3d4e5f6...",
  "logoutAll": false
}
```

#### GET `/api/auth/me` - Get Current User

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### User Management Endpoints

#### GET `/api/user` - Get User Profile

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### PUT `/api/user` - Update User Profile

**Request:**
```json
{
  "name": "Updated Name",
  "restaurantName": "Updated Restaurant",
  "cuisineType": "French",
  "location": "Paris, France",
  "phone": "+33-1-23-45-67-89",
  "marketingConsent": false
}
```

### Admin Endpoints

#### GET `/api/admin/users` - List Users (Admin Only)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)

## 🔒 Security Features

### Authentication Security
- **Access Tokens**: 15-minute expiry for security
- **Refresh Tokens**: 7-day expiry, securely hashed in database
- **Password Hashing**: bcrypt with 12 salt rounds
- **Token Rotation**: New refresh token issued on each refresh

### Input Validation
- **Zod Schemas**: Type-safe validation for all inputs
- **Email Sanitization**: Automatic email normalization
- **Password Strength**: Enforced complexity requirements
- **XSS Prevention**: Input sanitization and validation

### Rate Limiting
- **Tiered Limits**: Different limits based on user role
- **IP-based Tracking**: Automatic client identification
- **Graceful Degradation**: Fail-open approach for reliability
- **Standard Headers**: RFC-compliant rate limit headers

## 🎛️ Rate Limiting Configuration

| User Type | Requests/Minute | Window |
|-----------|----------------|---------|
| Anonymous | 20 | 1 minute |
| Authenticated User | 100 | 1 minute |
| Admin | 1000 | 1 minute |
| Auth Endpoints | 10 | 1 minute |

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Timestamp when window resets
- `X-RateLimit-Policy`: Rate limit policy description
- `Retry-After`: Seconds to wait when rate limited

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  cuisine_type TEXT DEFAULT '',
  location TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  subscription_status TEXT DEFAULT 'trialing',
  trial_start_date TEXT,
  trial_end_date TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  marketing_consent BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked BOOLEAN DEFAULT false,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

### Rate Limits Table
```sql
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  requests INTEGER DEFAULT 0,
  window_start TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## 🧪 Testing the Implementation

### 1. Registration Test
```bash
curl -X POST http://localhost:3004/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "action": "register",
    "email": "test@chefsocial.io",
    "password": "TestPassword123",
    "name": "Test User",
    "restaurantName": "Test Restaurant"
  }'
```

### 2. Login Test
```bash
curl -X POST http://localhost:3004/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "email": "test@chefsocial.io",
    "password": "TestPassword123"
  }'
```

### 3. Protected Route Test
```bash
curl -X GET http://localhost:3004/api/user \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Rate Limiting Test
```bash
# Make multiple rapid requests to trigger rate limiting
for i in {1..25}; do
  curl -X GET http://localhost:3004/api/auth/me
  echo "Request $i"
done
```

## 🚨 Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {
    "field": "Specific validation error"
  }
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created (registration)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (user already exists)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `501` - Not Implemented

## 🔄 Next Steps

### Immediate Enhancements
1. **Email Verification System**
   - Email verification tokens
   - SMTP integration
   - Account activation flow

2. **Password Reset Flow**
   - Secure reset tokens
   - Email-based reset process
   - Token expiration handling

3. **Admin Dashboard APIs**
   - User management endpoints
   - Analytics and reporting
   - System health monitoring

4. **Audit Logging**
   - User action tracking
   - Security event logging
   - Compliance reporting

### Performance Optimization
1. **Database Indexing**
   - Query performance analysis
   - Additional indexes for common queries
   - Database query optimization

2. **Caching Layer**
   - Redis integration for session storage
   - API response caching
   - Rate limiting cache optimization

3. **Monitoring & Alerting**
   - Application performance monitoring
   - Error tracking and alerting
   - Database performance monitoring

## 🛡️ Production Deployment Checklist

### Security
- [ ] Change default JWT secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure secure headers
- [ ] Set up proper CORS policies
- [ ] Enable security logging

### Database
- [ ] Migrate to PostgreSQL
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Enable query logging
- [ ] Set up monitoring

### Environment
- [ ] Configure production environment variables
- [ ] Set up load balancing
- [ ] Configure auto-scaling
- [ ] Set up health checks
- [ ] Enable monitoring and alerting

---

## 📞 Support

For questions or issues with this implementation:

1. **Development Issues**: Check console logs and database connection
2. **Authentication Problems**: Verify JWT secrets and token expiry
3. **Rate Limiting**: Check user tier and IP detection
4. **Database Issues**: Verify file permissions and disk space

**Development Server**: [http://localhost:3004](http://localhost:3004)
**API Base URL**: `http://localhost:3004/api`

---

*Phase 1 Complete ✅ - Ready for Phase 2: Voice Integration & Content Pipeline* 