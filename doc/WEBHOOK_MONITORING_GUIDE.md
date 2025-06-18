# 🔍 ChefSocial SMS Webhook Monitoring & Debugging Guide

## Overview

Enhanced logging and monitoring for Twilio SMS webhooks to detect configuration issues, track webhook calls, and debug SMS scheduling workflow problems.

## 📋 Webhook Configuration Check

### Required Twilio Console Settings

**Phone Number**: `+8193006691`

**Webhook URLs to Configure:**
```bash
# For MMS (food images)
https://api.chefsocial.io/api/sms/webhook/image-received

# For SMS (scheduling responses)  
https://api.chefsocial.io/api/sms/webhook/schedule-response
```

**HTTP Method**: `POST`  
**Content Type**: `application/x-www-form-urlencoded`

## 🔧 Monitoring Endpoints

### 1. Webhook Logs API
```bash
GET /api/sms/webhook-logs?hours=24&limit=50
```

**Response:**
```json
{
  "success": true,
  "webhookLogs": [
    {
      "action": "webhook_image_received",
      "target_id": "SM123abc...",
      "metadata": {
        "fromNumber": "1234",
        "hasImage": true,
        "numMedia": 1,
        "twilioData": {
          "messageSid": "SM123abc...",
          "accountSid": "AC123abc...",
          "toNumber": "6691"
        }
      },
      "created_at": "2024-06-17T15:30:00Z"
    }
  ],
  "workflowSteps": [
    {
      "session_id": "session_123...",
      "workflow_step": "image_received",
      "status": "completed",
      "metadata": "{\"imageUrl\":\"https://...\"}",
      "started_at": "2024-06-17T15:30:05Z"
    }
  ],
  "timeframe": "Last 24 hours",
  "total": 25
}
```

### 2. Webhook Testing Endpoint
```bash
POST /api/sms/test-webhook?format=json
Content-Type: application/x-www-form-urlencoded

From=+15551234567&To=+8193006691&MessageSid=TEST123&Body=1&NumMedia=0
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook endpoint is working correctly",
  "receivedData": {
    "From": "+15551234567",
    "To": "+8193006691",
    "MessageSid": "TEST123",
    "Body": "1",
    "NumMedia": "0"
  },
  "parsedCorrectly": true,
  "webhookUrls": {
    "imageReceived": "https://api.chefsocial.io/api/sms/webhook/image-received",
    "scheduleResponse": "https://api.chefsocial.io/api/sms/webhook/schedule-response"
  }
}
```

## 📊 Enhanced Logging Details

### Image Received Webhook Logs
```json
{
  "level": "info",
  "message": "Twilio webhook /image-received called",
  "data": {
    "method": "POST",
    "contentType": "application/x-www-form-urlencoded",
    "userAgent": "TwilioProxy/1.1",
    "twilioSignature": "base64signature...",
    "bodySize": 542,
    "rawBodyPreview": "From=%2B15551234567&To=%2B8193006691..."
  }
}
```

```json
{
  "level": "info", 
  "message": "MMS webhook parsed data",
  "data": {
    "fromNumber": "4567",
    "toNumber": "6691", 
    "messageSid": "SM123abc...",
    "accountSid": "AC123abc...",
    "hasImage": true,
    "imageUrl": "https://api.twilio.com/2010-04-01/Accounts/...",
    "numMedia": 1,
    "messageBodyLength": 0,
    "allMediaUrls": ["present"]
  }
}
```

### Schedule Response Webhook Logs
```json
{
  "level": "info",
  "message": "Schedule response webhook parsed data",
  "data": {
    "fromNumber": "4567",
    "toNumber": "6691",
    "messageSid": "SM456def...",
    "accountSid": "AC123abc...",
    "messageBody": "1",
    "messageLength": 1
  }
}
```

## 🚨 Error Detection & Debugging

### Common Webhook Issues

#### 1. Missing Required Fields
```json
{
  "level": "error",
  "message": "Invalid Twilio webhook - missing required fields",
  "data": {
    "hasFrom": false,
    "hasMessageSid": true,
    "hasAccountSid": true,
    "contentType": "application/json",
    "bodyPreview": "{\"test\": \"data\"}"
  }
}
```

**Fix**: Verify Twilio webhook is sending proper form data, not JSON.

#### 2. No Image in MMS
```json
{
  "level": "warn",
  "message": "MMS received without image - sending help message",
  "data": {
    "fromNumber": "4567",
    "numMedia": 0,
    "hasImageUrl": false,
    "messageSid": "SM789ghi..."
  }
}
```

**Fix**: User sent text message to image endpoint. System sends help message.

#### 3. N8N Workflow Trigger Failed
```json
{
  "level": "error",
  "message": "N8N workflow trigger failed",
  "data": {
    "sessionId": "session_123...",
    "fromNumber": "4567",
    "errorMessage": "ECONNREFUSED",
    "errorStack": "Error: connect ECONNREFUSED..."
  }
}
```

**Fix**: Check N8N instance URL and API key configuration.

## 🔍 Troubleshooting Workflow

### Step 1: Verify Webhook Configuration
1. Check Twilio Console phone number configuration
2. Verify webhook URLs point to `api.chefsocial.io`
3. Test webhook connectivity with test endpoint

### Step 2: Monitor Webhook Calls
```bash
# Watch logs in real-time
curl -H "Authorization: Bearer <token>" \
  "https://api.chefsocial.io/api/sms/webhook-logs?hours=1" | jq
```

### Step 3: Test SMS Flow
1. Send MMS with food photo to `+8193006691`
2. Check logs for `webhook_image_received` entry
3. Verify scheduling options SMS sent
4. Reply with "1" for immediate scheduling
5. Check logs for `webhook_schedule_response` entry

### Step 4: Validate Workflow Steps
```bash
# Get specific session details
curl -H "Authorization: Bearer <token>" \
  "https://api.chefsocial.io/api/sms/session/session_123..." | jq
```

## 📈 Monitoring Metrics

### Webhook Success Rates
- **Image Received**: Track successful MMS processing
- **Schedule Response**: Track successful scheduling choices
- **N8N Triggers**: Track workflow automation success
- **SMS Delivery**: Track outbound message success

### Common Failure Patterns
1. **Webhook Timeouts**: API response > 15 seconds
2. **Invalid Data**: Missing Twilio fields
3. **Authentication Issues**: Invalid API tokens
4. **N8N Connectivity**: External service failures

## 🛠️ Configuration Validation

### Environment Variables Check
```bash
# Required for SMS workflows
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+8193006691
CHEFSOCIAL_API_URL=https://api.chefsocial.io
N8N_WEBHOOK_URL=https://your-n8n-instance.com
```

### Health Check
```bash
curl https://api.chefsocial.io/health
```

### SMS Service Test
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  https://api.chefsocial.io/api/sms/test
```

## 📝 Log Analysis Commands

### Recent Webhook Activity
```bash
# Last 24 hours of webhook calls
grep "webhook.*called" logs/app.log | tail -50

# Failed webhook processing
grep "webhook.*failed" logs/app.log | tail -20

# Successful workflow completions
grep "workflow completed successfully" logs/app.log | tail -10
```

### Database Queries
```sql
-- Recent briefing sessions
SELECT * FROM sms_briefing_sessions 
WHERE created_at >= datetime('now', '-24 hours')
ORDER BY created_at DESC;

-- Workflow status tracking
SELECT * FROM sms_workflow_status 
WHERE started_at >= datetime('now', '-24 hours')
ORDER BY started_at DESC;

-- Audit trail for webhooks
SELECT * FROM audit_logs 
WHERE action LIKE 'webhook_%'
AND created_at >= datetime('now', '-24 hours')
ORDER BY created_at DESC;
```

## 🎯 Success Indicators

### ✅ Healthy Webhook Flow
1. `webhook_image_received` log entry appears
2. `MMS webhook parsed data` shows valid image URL
3. `Briefing session created` log appears
4. User receives scheduling options SMS
5. `webhook_schedule_response` log entry appears
6. `N8N workflow triggered successfully` log appears

### ❌ Common Issues to Watch
1. **No webhook logs**: Twilio not reaching your server
2. **Missing image data**: MMS parsing failure
3. **Session creation failed**: Database or user lookup issues  
4. **N8N trigger failed**: External service connectivity
5. **SMS sending failed**: Twilio credentials or phone issues

---

**Enhanced monitoring ensures reliable SMS scheduling workflow and quick issue resolution! 🔍📱**