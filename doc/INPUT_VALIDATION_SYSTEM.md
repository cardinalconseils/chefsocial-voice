# ChefSocial Input Validation System Documentation

## Overview

This document provides comprehensive documentation for the ChefSocial input validation system built with express-validator. The system provides enterprise-grade security features including input sanitization, XSS prevention, SQL injection protection, and standardized error handling.

## Table of Contents

- [Architecture](#architecture)
- [Security Features](#security-features)
- [Validation Rules](#validation-rules)
- [API Integration](#api-integration)
- [Testing & Verification](#testing--verification)
- [Configuration](#configuration)

## Architecture

### Core Components

#### 1. ValidationSystem Class (`validation-system.js`)

**Location**: `/validation-system.js`

**Main Methods**:
- `validate(ruleName)` - Apply validation rules to request body
- `validateQuery(ruleName)` - Apply validation to query parameters
- `validateParams(ruleName)` - Apply validation to path parameters
- `handleValidationErrors(req, res, next)` - Process validation errors
- `xssProtection()` - XSS prevention middleware
- `sqlInjectionProtection()` - SQL injection detection
- `createRateLimit(options)` - Configurable rate limiting

#### 2. Integration Layer (`simple_voice_backend.js`)

**Security Middleware Stack**:
```javascript
// Apply security middleware stack
app.use(validationSystem.securityMiddleware());
```

**Endpoint Protection**:
```javascript
app.post('/api/auth/register', 
    authLimiter,
    validationSystem.validate('register'),
    async (req, res) => { ... }
);
```

## Security Features

### 1. Input Sanitization ✅

**Implementation**: Automatic HTML escaping and dangerous pattern removal

**Protected Against**:
- XSS attacks via script injection
- HTML injection attacks
- JavaScript event handler injection
- iframe and object embedding

**Example**:
```javascript
// Input: '<script>alert("XSS")</script>John'
// Output: 'John' (script tags removed)
```

### 2. XSS Prevention ✅

**Security Headers Applied**:
```javascript
'X-Content-Type-Options': 'nosniff'
'X-Frame-Options': 'DENY'
'X-XSS-Protection': '1; mode=block'
'Referrer-Policy': 'strict-origin-when-cross-origin'
```

**Pattern Detection**:
- `<script>` tags with any attributes
- `javascript:` protocols
- Event handlers (`onclick`, `onload`, etc.)
- `<iframe>` embedding attempts

### 3. SQL Injection Protection ✅

**Protected Patterns**:
- SQL keywords (SELECT, INSERT, UPDATE, DELETE, DROP, etc.)
- Comment sequences (`--`, `/*`, `*/`)
- Quote manipulation attempts
- Boolean logic injection (`OR 1=1`, `AND 1=1`)

**Example Protection**:
```javascript
// Input: "'; DROP TABLE users; --"
// Result: Request blocked with 400 error
```

### 4. Rate Limiting ✅

**Configurable Thresholds**:
- Default: 100 requests per 15 minutes
- Authentication: 5 attempts per 15 minutes
- Custom endpoints: Configurable limits

**Response Format**:
```json
{
    "error": "Too many requests",
    "message": "Rate limit exceeded. Please try again later.",
    "retryAfter": 900,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "ip": "192.168.1.1"
}
```

## Validation Rules

### Authentication Validation

#### 1. User Registration (`register`)

```javascript
validationSystem.validate('register')
```

**Rules Applied**:
- **Email**: Valid format, normalized, max 254 chars
- **Password**: 8-128 chars, must contain lowercase, uppercase, number
- **Name**: 1-100 chars, letters/spaces/hyphens only, HTML escaped
- **Restaurant Name**: Optional, max 200 chars, HTML escaped
- **Payment Method ID**: Stripe format validation (`pm_*`)
- **Plan Name**: Must be 'complete'

**Password Security**:
- Rejects common weak passwords
- Enforces complexity requirements
- Length validation (8-128 characters)

#### 2. User Login (`login`)

```javascript
validationSystem.validate('login')
```

**Rules Applied**:
- **Email**: Valid format, normalized, max 254 chars
- **Password**: Required, 1-128 chars, non-empty

#### 3. Token Operations (`tokenVerification`)

```javascript
validationSystem.validate('tokenVerification')
```

**Rules Applied**:
- **Token**: JWT format validation (optional)
- **Refresh Token**: JWT format validation (optional)

### Content Generation Validation

#### 4. Content Creation (`contentGeneration`)

```javascript
validationSystem.validate('contentGeneration')
```

**Rules Applied**:
- **Prompt**: 1-2000 chars, HTML escaped, required
- **Platform**: Must be one of: instagram, facebook, twitter, linkedin, tiktok
- **Content Type**: Must be one of: post, story, reel, video, image
- **Language**: Must be 'en' or 'fr'

### Profile Management Validation

#### 5. Profile Updates (`profileUpdate`)

```javascript
validationSystem.validate('profileUpdate')
```

**Rules Applied**:
- **Name**: 1-100 chars, letters/spaces/hyphens, HTML escaped
- **Restaurant Name**: Max 200 chars, HTML escaped
- **Cuisine Type**: Max 100 chars, HTML escaped
- **Location**: Max 200 chars, HTML escaped
- **Phone**: Valid mobile phone format (US, CA, FR)
- **Description**: Max 1000 chars, HTML escaped

### Query Parameter Validation

#### 6. Pagination (`pagination`)

```javascript
validationSystem.validateQuery('pagination')
```

**Rules Applied**:
- **Page**: Integer 1-1000, converted to number
- **Limit**: Integer 1-100, converted to number
- **Sort**: Must be one of: created_at, updated_at, name, email
- **Order**: Must be 'asc' or 'desc'

#### 7. Search (`search`)

```javascript
validationSystem.validateQuery('search')
```

**Rules Applied**:
- **Query (q)**: 1-100 chars, HTML escaped
- **Filter**: Must be one of: active, inactive, all

### Path Parameter Validation

#### 8. User ID (`userId`)

```javascript
validationSystem.validateParams('userId')
```

**Rules Applied**:
- **User ID**: Must be valid UUIDv4 format

## API Integration

### Protected Endpoints

#### Authentication Endpoints

```javascript
// Registration with comprehensive validation
app.post('/api/auth/register', 
    authLimiter,
    validationSystem.validate('register'),
    async (req, res) => { ... }
);

// Login with email/password validation
app.post('/api/auth/login', 
    authLimiter,
    validationSystem.validate('login'),
    async (req, res) => { ... }
);

// Token refresh with JWT validation
app.post('/api/auth/refresh', 
    authLimiter,
    validationSystem.validate('tokenVerification'),
    async (req, res) => { ... }
);

// Secure logout with token validation
app.post('/api/auth/logout', 
    authLimiter,
    validationSystem.validate('tokenVerification'),
    async (req, res) => { ... }
);
```

#### Content Management Endpoints

```javascript
// Content creation with input sanitization
app.post('/api/content/save', 
    authSystem.authMiddleware(), 
    validationSystem.validate('contentGeneration'),
    async (req, res) => { ... }
);

// Profile updates with comprehensive validation
app.put('/api/user/profile', 
    authSystem.authMiddleware(), 
    validationSystem.validate('profileUpdate'),
    async (req, res) => { ... }
);
```

#### Session Management Endpoints

```javascript
// Get user sessions with pagination
app.get('/api/auth/sessions', 
    authSystem.authMiddleware(),
    validationSystem.validateQuery('pagination'),
    async (req, res) => { ... }
);

// Security status endpoint
app.get('/api/auth/security-status', 
    authSystem.authMiddleware(),
    async (req, res) => { ... }
);
```

### Error Response Format

**Validation Error Response**:
```json
{
    "error": "Validation failed",
    "message": "The request contains invalid data",
    "details": [
        {
            "field": "email",
            "message": "Please provide a valid email address",
            "value": "invalid-email",
            "location": "body"
        },
        {
            "field": "password",
            "message": "Password must be between 8 and 128 characters",
            "value": "weak",
            "location": "body"
        }
    ],
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/auth/register",
    "method": "POST"
}
```

**Security Block Response**:
```json
{
    "error": "Invalid input detected",
    "message": "Request contains potentially harmful content",
    "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Testing & Verification

### Automated Testing

**Test Script**: `/test-validation.js`

**Run Tests**:
```bash
node test-validation.js
```

**Test Coverage**:
- ✅ XSS Protection
- ✅ SQL Injection Protection  
- ✅ Input Sanitization
- ✅ Rate Limiting
- ✅ Custom Validation Rules
- ✅ Error Handling
- ✅ Security Headers

### Manual Testing Examples

#### 1. Test XSS Protection

```bash
curl -X POST http://localhost:3000/api/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "<script>alert(\"XSS\")</script>John",
    "description": "Restaurant <iframe src=\"evil.com\"></iframe> description"
  }'
```

**Expected**: Script tags removed, content sanitized

#### 2. Test SQL Injection Protection

```bash
curl -X GET "http://localhost:3000/api/content?search='; DROP TABLE users; --" \
  -H "Authorization: Bearer <token>"
```

**Expected**: 400 error with "Invalid input detected"

#### 3. Test Rate Limiting

```bash
# Make 6 rapid requests to exceed 5/15min limit
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

**Expected**: 6th request returns 429 Too Many Requests

#### 4. Test Validation Rules

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "weak",
    "name": "",
    "paymentMethodId": "invalid"
  }'
```

**Expected**: 400 error with detailed validation failures

## Configuration

### Environment Variables

**Security Configuration**:
```env
# JWT Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Rate Limiting
MAX_REQUESTS_PER_WINDOW=100
RATE_LIMIT_WINDOW_MS=900000

# Validation Settings
MAX_INPUT_LENGTH=2000
ENABLE_XSS_PROTECTION=true
ENABLE_SQL_INJECTION_PROTECTION=true
```

### Custom Validation Rules

**Add Custom Rules**:
```javascript
const validationSystem = new ValidationSystem();

// Add custom validation
validationSystem.addCustomRule('customEndpoint', [
    body('customField')
        .custom((value) => {
            if (value === 'forbidden') {
                throw new Error('This value is not allowed');
            }
            return true;
        })
        .withMessage('Custom validation failed')
]);

// Use custom rule
app.post('/api/custom', 
    validationSystem.validate('customEndpoint'),
    async (req, res) => { ... }
);
```

### Rate Limiting Configuration

**Custom Rate Limits**:
```javascript
// Create custom rate limiter
const customLimiter = validationSystem.createRateLimit({
    windowMs: 60000, // 1 minute
    max: 10, // 10 requests per minute
    message: {
        error: 'Custom rate limit exceeded',
        message: 'Please slow down your requests'
    }
});

// Apply to specific endpoint
app.post('/api/heavy-operation', 
    customLimiter,
    validationSystem.validate('contentGeneration'),
    async (req, res) => { ... }
);
```

## Security Best Practices

### 1. Input Validation Hierarchy

1. **Rate Limiting** - First line of defense
2. **Security Middleware** - XSS/SQL injection protection
3. **Format Validation** - express-validator rules
4. **Business Logic** - Application-specific validation
5. **Database Layer** - Parameterized queries

### 2. Error Handling

- Never expose internal system details
- Log security violations for monitoring
- Provide helpful but generic error messages
- Rate limit validation error responses

### 3. Monitoring & Alerting

**Security Events to Monitor**:
- Multiple validation failures from same IP
- SQL injection attempt patterns
- XSS attack patterns
- Rate limit violations
- Unusual validation error spikes

### 4. Regular Updates

- Keep express-validator updated
- Review and update validation patterns
- Monitor security advisories
- Test validation rules regularly

## Integration with Authentication System

The validation system integrates seamlessly with the existing authentication system:

**File Relationships**:
- `/validation-system.js` - Core validation logic
- `/auth-system.js` - Authentication with validation hooks
- `/simple_voice_backend.js` - API endpoints with validation
- `/database.js` - Secure database operations

**Security Flow**:
1. Request hits rate limiter
2. Security middleware scans for threats
3. express-validator validates format
4. Authentication middleware verifies tokens
5. Business logic processes request
6. Database queries use parameterization

## Conclusion

The ChefSocial input validation system provides comprehensive protection against common web vulnerabilities while maintaining usability and performance. The system is production-ready and follows security best practices for enterprise applications.

**Key Benefits**:
- ✅ **Comprehensive Protection**: XSS, SQL injection, input validation
- ✅ **Performance Optimized**: Minimal overhead on request processing
- ✅ **Developer Friendly**: Easy to integrate and extend
- ✅ **Production Ready**: Robust error handling and monitoring
- ✅ **Standards Compliant**: Follows OWASP security guidelines