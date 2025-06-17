# ChefSocial SMS Scheduling - Environment Configuration

## Required Environment Variables

### N8N Configuration
```bash
# N8N instance URL
N8N_WEBHOOK_URL=https://your-n8n-instance.com
N8N_API_KEY=your_n8n_api_key

# ChefSocial API Configuration  
CHEFSOCIAL_API_URL=https://api.chefsocial.io
CHEFSOCIAL_API_TOKEN=your_api_token
```

### Domain Architecture
- **Marketing Site**: `chefsocial.io` - Static marketing pages
- **User Dashboard**: `app.chefsocial.io` - React/Next.js frontend
- **API Backend**: `api.chefsocial.io` - Node.js API server
- **Admin Panel**: `app.chefsocial.io/admin` - Admin interface

### Twilio Webhook Configuration
Set these webhook URLs in your Twilio console:

**For MMS (images):**
```
https://api.chefsocial.io/api/sms/webhook/image-received
```

**For SMS (scheduling responses):**
```
https://api.chefsocial.io/api/sms/webhook/schedule-response
```

### N8N Workflow Endpoints
The workflow will call these ChefSocial API endpoints:

- `POST https://api.chefsocial.io/api/n8n/pre-call-notification`
- `POST https://api.chefsocial.io/api/n8n/start-briefing`
- `POST https://api.chefsocial.io/api/n8n/content-ready`
- `POST https://api.chefsocial.io/api/n8n/posting-complete`

### Complete Environment Setup
Add to your `.env` file:

```bash
# ChefSocial Core
CHEFSOCIAL_API_URL=https://api.chefsocial.io
CHEFSOCIAL_API_TOKEN=your_secure_api_token

# N8N Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com
N8N_API_KEY=your_n8n_api_key

# Existing services (already configured)
OPENAI_API_KEY=sk-your_openai_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
STRIPE_SECRET_KEY=sk_your_stripe_key
```

## Testing the SMS Flow

1. **Send MMS to Twilio number** with food photo
2. **Receive SMS** with scheduling options (1, 2, 3, 4)
3. **Reply with choice** (e.g., "1" for immediate)
4. **N8N workflow triggers** content generation
5. **Receive content** for approval via SMS
6. **Reply "APPROVE"** to post to social media
7. **Receive confirmation** SMS with posting results

## API Token Security

Generate a secure API token for N8N to authenticate with ChefSocial:

```bash
# Generate secure token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add this token to both:
- N8N environment: `CHEFSOCIAL_API_TOKEN`
- ChefSocial backend validation