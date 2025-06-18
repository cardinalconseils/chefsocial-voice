# ChefSocial Environment Configuration

## Overview
This document outlines all environment variables and configuration settings required for the ChefSocial platform, including Stripe integration for subscription management and license control.

## Environment Variables

### Core Application Settings
```bash
# Application Environment
NODE_ENV=production
PORT=3004

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=7d

# Database Configuration (when implemented)
DATABASE_URL=your-database-connection-string
DATABASE_POOL_SIZE=10
DATABASE_CONNECTION_TIMEOUT=30000
```

### Stripe Integration (Required for License Management)
```bash
# Stripe API Keys
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key

# Stripe Product Configuration
STRIPE_PRICE_ID=price_your-monthly-subscription-price-id
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-endpoint-secret

# Subscription Settings
MONTHLY_PRICE_CENTS=7900  # $79.00 USD
TRIAL_PERIOD_DAYS=14
GRACE_PERIOD_DAYS=3
```

### Authentication & Security
```bash
# Admin Panel Access
ADMIN_EMAIL=admin@chefsocial.io
ADMIN_PASSWORD=your-secure-admin-password

# Security Settings
BCRYPT_SALT_ROUNDS=12
SESSION_SECRET=your-session-secret-key
CORS_ORIGIN=https://chefsocial-voice.vercel.app
```

### External Services
```bash
# Twilio (Voice & SMS)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# LiveKit (Voice Processing)
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
LIVEKIT_WS_URL=wss://your-livekit-server.com

# OpenAI (AI Services)
OPENAI_API_KEY=your-openai-api-key
OPENAI_ORG_ID=your-openai-organization-id
```

### Email & Notifications
```bash
# Email Service (for notifications)
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
FROM_EMAIL=noreply@chefsocial.io

# Notification Settings
TRIAL_REMINDER_DAYS=3
PAYMENT_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_ATTEMPTS=5
```

### Monitoring & Logging
```bash
# Sentry (Error Tracking)
SENTRY_DSN=your-sentry-dsn-url

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/chefsocial.log
```

## Vercel Environment Variables Setup

### Production Environment (.env.production)
```bash
# Copy these to your Vercel dashboard under Settings > Environment Variables

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application Security
JWT_SECRET=production-jwt-secret-key
ADMIN_PASSWORD=secure-admin-password

# External Services
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
OPENAI_API_KEY=sk-...
```

### Development Environment (.env.local)
```bash
# For local development
NODE_ENV=development
PORT=3004

# Stripe Test Keys
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Development Settings
JWT_SECRET=dev-jwt-secret
ADMIN_PASSWORD=admin123
```

## Stripe Configuration Setup

### 1. Create Stripe Account
1. Sign up at https://stripe.com
2. Complete business verification
3. Enable webhooks in dashboard

### 2. Create Products & Prices
```bash
# Create monthly subscription product
stripe products create \
  --name "ChefSocial Pro" \
  --description "AI-powered restaurant marketing platform"

# Create recurring price
stripe prices create \
  --unit-amount 7900 \
  --currency usd \
  --recurring[interval]=month \
  --product=prod_YOUR_PRODUCT_ID
```

### 3. Configure Webhooks
**Webhook URL:** `https://chefsocial-voice.vercel.app/api/admin/stripe/webhook`

**Required Events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `payment_method.attached`

### 4. Test Webhook Locally
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3004/api/admin/stripe/webhook

# Test webhook
stripe trigger customer.subscription.created
```

## License Management Configuration

### Trial Settings
```javascript
const TRIAL_CONFIG = {
  defaultTrialDays: 14,
  extensionDays: 7,
  reminderDays: [7, 3, 1], // Days before trial ends
  gracePeriodDays: 3
};
```

### Subscription Tiers
```javascript
const SUBSCRIPTION_TIERS = {
  starter: {
    priceId: 'price_starter_monthly',
    amount: 7900, // $79.00
    features: ['AI Voice Content', 'Image Generation', 'Basic Analytics']
  },
  pro: {
    priceId: 'price_pro_monthly', 
    amount: 15900, // $159.00
    features: ['Everything in Starter', 'Advanced Analytics', 'Priority Support']
  }
};
```

## Security Best Practices

### API Key Management
- Never commit API keys to version control
- Use different keys for development/production
- Rotate keys regularly (quarterly)
- Monitor API key usage in Stripe dashboard

### Webhook Security
- Always verify webhook signatures
- Use HTTPS endpoints only
- Implement idempotency for webhook handlers
- Log all webhook events for debugging

### User Data Protection
- Hash all passwords with bcrypt (12+ rounds)
- Encrypt sensitive user data at rest
- Implement proper session management
- Follow GDPR compliance for EU users

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured in Vercel
- [ ] Stripe webhooks tested and verified
- [ ] Database schema migrated (when implemented)
- [ ] SSL certificates configured
- [ ] Domain DNS properly configured

### Post-Deployment
- [ ] Test user registration flow
- [ ] Verify trial period functionality
- [ ] Test subscription creation process
- [ ] Confirm webhook delivery
- [ ] Monitor error logs for 24 hours

### Monitoring Setup
- [ ] Configure Sentry for error tracking
- [ ] Set up Stripe dashboard alerts
- [ ] Create health check endpoints
- [ ] Implement uptime monitoring

## Troubleshooting

### Common Issues

**Stripe Webhook Failures:**
```bash
# Check webhook logs in Stripe dashboard
# Verify webhook URL is accessible
curl -X POST https://chefsocial-voice.vercel.app/api/admin/stripe/webhook
```

**Authentication Issues:**
```bash
# Verify JWT secret is consistent
# Check token expiration settings
# Confirm CORS configuration
```

**Trial Period Problems:**
```bash
# Check date calculations
# Verify timezone handling
# Confirm trial extension logic
```

### Debug Commands
```bash
# Test API endpoints
curl -H "Authorization: Bearer TOKEN" \
  https://chefsocial-voice.vercel.app/api/auth/verify-token

# Check Stripe customer
stripe customers retrieve cus_CUSTOMER_ID

# View subscription details
stripe subscriptions retrieve sub_SUBSCRIPTION_ID
```

## Support & Documentation

### Resources
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

### Getting Help
- Stripe Support: https://support.stripe.com
- Vercel Support: https://vercel.com/support
- ChefSocial Issues: Create GitHub issue in repository

---

**Note:** Replace all placeholder values (your-*, test-*, etc.) with actual production values before deployment. Keep this configuration secure and never share production credentials.