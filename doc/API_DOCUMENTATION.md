# ChefSocial Voice AI API Documentation
## Base URL: https://api.chefsocial.io

### 🔐 Authentication
All API endpoints require authentication via JWT token or API key.

```bash
# JWT Authentication (for user endpoints)
Authorization: Bearer <jwt_token>

# API Key Authentication (for N8N/external integrations)
Authorization: Bearer <api_token>
```

---

## 📱 SMS Scheduling & Briefing Endpoints

### POST /api/sms/webhook/image-received
**Handle MMS with food images from Twilio**

**Description:** Receives MMS messages with food photos and initiates the briefing scheduling workflow.

**Request Body:**
```javascript
{
  "From": "+15551234567",        // Phone number
  "MediaUrl0": "https://...",    // Image URL from Twilio
  "MessageSid": "SM123...",      // Twilio message ID
  "NumMedia": "1",               // Number of media attachments
  "Body": "Optional text"        // Message text (optional)
}
```

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

**Flow:**
1. Creates briefing session in database
2. Sends scheduling options SMS to chef
3. Tracks workflow progress

---

### POST /api/sms/webhook/schedule-response
**Handle chef's scheduling responses**

**Description:** Processes chef's reply to scheduling options (1, 2, 3, 4).

**Request Body:**
```javascript
{
  "From": "+15551234567",        // Phone number
  "Body": "1",                   // Chef's choice (1=now, 2=30min, 3=1hr, 4=custom)
  "MessageSid": "SM123..."       // Twilio message ID
}
```

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

**Scheduling Options:**
- `1` or `"now"` → Call in 2 minutes
- `2` or `"30"` → Call in 30 minutes  
- `3` or `"1 hour"` → Call in 1 hour
- `4` or `"15:30"` → Call at specific time

---

### GET /api/sms/sessions
**Get user's briefing sessions** 🔐

**Description:** Retrieve briefing sessions for authenticated user.

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `scheduled`, `completed`)
- `limit` (optional): Number of results (default: 50)

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session_123...",
      "phone_number": "+1555****567",
      "image_url": "https://...",
      "status": "scheduled",
      "scheduled_time": "2024-06-17T15:30:00Z",
      "created_at": "2024-06-17T14:00:00Z",
      "response_type": "delay_30min"
    }
  ],
  "total": 5
}
```

---

### GET /api/sms/session/:sessionId
**Get specific briefing session** 🔐

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "session_123...",
    "status": "completed",
    "phone_number": "+1555****567",
    "image_url": "https://...",
    "scheduled_time": "2024-06-17T15:30:00Z",
    "actual_call_time": "2024-06-17T15:32:00Z"
  },
  "workflowSteps": [
    {
      "workflow_step": "image_received",
      "status": "completed",
      "started_at": "2024-06-17T14:00:00Z"
    },
    {
      "workflow_step": "schedule_set", 
      "status": "completed",
      "started_at": "2024-06-17T14:05:00Z"
    }
  ],
  "briefingContext": {
    "dish_story": "Homemade pasta with truffle oil...",
    "target_audience": "Food enthusiasts",
    "desired_mood": "Elegant and sophisticated",
    "platform_preferences": "[\"instagram\", \"tiktok\"]"
  }
}
```

---

### POST /api/sms/session/:sessionId/reschedule
**Reschedule a briefing session** 🔐

**Request Body:**
```json
{
  "scheduledTime": "2024-06-17T16:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session rescheduled successfully",
  "scheduledTime": "2024-06-17T16:00:00Z"
}
```

---

## 🎙️ LiveKit Voice Integration

### POST /api/voice/start-briefing
**Start voice briefing session** 🔐

**Description:** Initiates LiveKit voice session for SMS-scheduled briefings.

**Request Body:**
```json
{
  "sessionId": "session_123...",
  "phoneNumber": "+15551234567",
  "imageUrl": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "briefingRoom": {
    "sessionId": "briefing_456...",
    "roomName": "briefing_room_456...",
    "phoneAccessToken": "eyJ...",
    "liveKitUrl": "wss://..."
  },
  "phoneConnection": {
    "connectionId": "phone_789...",
    "status": "connecting"
  }
}
```

---

### POST /api/voice/complete-briefing
**Complete briefing and extract context** 🔐

**Request Body:**
```json
{
  "sessionId": "session_123...",
  "transcript": "I made this amazing pasta with truffle oil...",
  "extractedContext": {
    "dishStory": "Homemade pasta with truffle oil",
    "targetAudience": "Food enthusiasts", 
    "desiredMood": "Elegant",
    "platformPreferences": ["instagram", "tiktok"],
    "postingUrgency": "today",
    "brandPersonality": "sophisticated"
  }
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_123...",
  "duration": 180000,
  "status": "completed"
}
```

---

## 🔄 N8N Integration Endpoints

### POST /api/n8n/pre-call-notification
**Send pre-call SMS notification**

**Request Body:**
```json
{
  "phoneNumber": "+15551234567",
  "sessionId": "session_123..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pre-call notification sent"
}
```

---

### POST /api/n8n/start-briefing
**Start briefing from N8N workflow**

**Request Body:**
```json
{
  "sessionId": "session_123...",
  "phoneNumber": "+15551234567", 
  "imageUrl": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "briefingRoom": {
    "sessionId": "briefing_456...",
    "roomName": "briefing_room_456..."
  },
  "phoneConnection": {
    "connectionId": "phone_789...",
    "status": "connecting"
  }
}
```

---

### POST /api/n8n/content-ready
**Send content ready SMS notification**

**Request Body:**
```json
{
  "phoneNumber": "+15551234567",
  "sessionId": "session_123...",
  "preview": {
    "caption": "Amazing pasta with truffle oil...",
    "platforms": ["instagram", "tiktok"],
    "viralScore": 85
  }
}
```

---

### POST /api/n8n/posting-complete
**Send posting completion SMS**

**Request Body:**
```json
{
  "phoneNumber": "+15551234567",
  "sessionId": "session_123...",
  "results": [
    {
      "platform": "instagram",
      "status": "posted",
      "postId": "instagram_123...",
      "engagement": {
        "likes": 75,
        "comments": 12
      }
    }
  ]
}
```

---

## 📊 Content Management

### POST /api/content/store
**Store generated content** 🔐

**Request Body:**
```json
{
  "sessionId": "session_123...",
  "content": {
    "instagram": {
      "caption": "Amazing homemade pasta with truffle oil! 🍝✨",
      "hashtags": ["#homemade", "#pasta", "#truffle"],
      "type": "post"
    },
    "tiktok": {
      "caption": "POV: You make restaurant-quality pasta at home 🤌",
      "hashtags": ["#pasta", "#cooking", "#foodie"],
      "type": "video"
    }
  },
  "preview": {
    "caption": "Amazing pasta with truffle oil...",
    "platforms": ["instagram", "tiktok"],
    "viralScore": 85
  }
}
```

**Response:**
```json
{
  "success": true,
  "contentId": "content_789...",
  "stored": true
}
```

---

### GET /api/content/session/:sessionId
**Get content for session** 🔐

**Response:**
```json
{
  "success": true,
  "content": {
    "id": "content_789...",
    "sessionId": "session_123...",
    "platforms": {
      "instagram": {
        "caption": "Amazing pasta...",
        "hashtags": ["#pasta", "#truffle"]
      },
      "tiktok": {
        "caption": "POV: Restaurant-quality pasta...",
        "hashtags": ["#cooking", "#foodie"]
      }
    },
    "status": "ready_for_approval",
    "viralScore": 85,
    "createdAt": "2024-06-17T15:45:00Z"
  }
}
```

---

## 🔐 Authentication & User Management

### POST /api/auth/login
**User login**

**Request Body:**
```json
{
  "email": "chef@restaurant.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123...",
    "email": "chef@restaurant.com",
    "name": "Chef Mario",
    "restaurant_name": "Mario's Bistro"
  }
}
```

---

### POST /api/auth/register
**User registration**

**Request Body:**
```json
{
  "email": "chef@restaurant.com",
  "password": "securepassword",
  "name": "Chef Mario",
  "restaurant_name": "Mario's Bistro",
  "phone": "+15551234567"
}
```

---

### GET /api/user/profile
**Get user profile** 🔐

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123...",
    "email": "chef@restaurant.com",
    "name": "Chef Mario",
    "restaurant_name": "Mario's Bistro",
    "phone": "+15551234567",
    "preferred_language": "en",
    "plan": "professional",
    "trial_ends_at": "2024-07-01T00:00:00Z"
  }
}
```

---

## 📈 System Health & Monitoring

### GET /api/health
**System health check**

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-06-17T15:00:00Z",
  "uptime": 86400,
  "version": "1.0.0",
  "environment": "production"
}
```

---

### GET /api/features
**Get available features** 🔐

**Response:**
```json
{
  "success": true,
  "features": [
    {
      "feature_key": "voice_content_creation",
      "feature_name": "Voice Content Creation", 
      "has_access": true,
      "description": "Create content using voice commands"
    },
    {
      "feature_key": "sms_briefing",
      "feature_name": "SMS Briefing Scheduling",
      "has_access": true,
      "description": "Schedule voice briefings via SMS"
    }
  ]
}
```

---

## 🚨 Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field": "validation error details"
  }
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## 📝 Rate Limiting

**Standard Limits:**
- **SMS endpoints**: 10 requests/minute
- **Voice endpoints**: 5 requests/minute
- **Content endpoints**: 20 requests/minute
- **Auth endpoints**: 30 requests/minute

**Headers:**
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1634567890
```

---

## 🔗 Webhook Configuration

**Twilio Webhooks:**
```bash
# MMS (image uploads)
POST https://api.chefsocial.io/api/sms/webhook/image-received

# SMS (scheduling responses)  
POST https://api.chefsocial.io/api/sms/webhook/schedule-response
```

**N8N Workflow Webhooks:**
```bash
# Trigger SMS briefing workflow
POST https://your-n8n-instance.com/webhook/sms-schedule

# Handle content approval
POST https://your-n8n-instance.com/webhook/content-approval
```

---

## 📚 SDKs & Examples

### JavaScript/Node.js Example
```javascript
const ChefSocialAPI = require('@chefsocial/api');

const client = new ChefSocialAPI({
  baseURL: 'https://api.chefsocial.io',
  apiKey: 'your_api_key'
});

// Start SMS briefing workflow
const session = await client.sms.createBriefingSession({
  phoneNumber: '+15551234567',
  imageUrl: 'https://...'
});

// Get briefing status
const status = await client.sms.getSession(session.id);
```

### cURL Examples
```bash
# Send MMS image (Twilio webhook simulation)
curl -X POST https://api.chefsocial.io/api/sms/webhook/image-received \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+15551234567&MediaUrl0=https://example.com/pasta.jpg&NumMedia=1"

# Get user's briefing sessions
curl -H "Authorization: Bearer <token>" \
  https://api.chefsocial.io/api/sms/sessions
```

---

*Last updated: June 17, 2024*  
*API Version: 2.0.0*  
*Base URL: https://api.chefsocial.io*