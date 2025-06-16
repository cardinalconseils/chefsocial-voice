# ChefSocial Data Flow & Customer Journey

## 🌊 **Complete Data Flow**

### **Phase 1: Marketing Discovery (chefsocial.io)**
```
Landing Page → Voice Demo → Data Capture → Account Creation
```

**Data Created:**
- `DEMO_SESSIONS` (anonymous session with IP, browser info)
- `VAPI_CONVERSATIONS` (voice chat transcript, extracted data)
- `VISUAL_PREVIEWS` (instant social media mockups)

**Data Flow:**
1. User visits chefsocial.io
2. Clicks voice demo → Creates anonymous `DEMO_SESSIONS` record
3. Talks to AI agent → Creates `VAPI_CONVERSATIONS` with transcript
4. AI generates preview → Creates `VISUAL_PREVIEWS` with Instagram/Facebook mockup
5. User likes it → Captures email → Creates `USERS` record

### **Phase 2: Trial Onboarding (app.chefsocial.io)**
```
Email Link → Account Setup → Business/Person Profile → First Content Creation
```

**Data Created:**
- `USERS` (email, name, user_type: business/person)
- `BUSINESSES` or `PERSONS` (detailed profile)
- `TRIAL_SESSIONS` (14-day trial tracking)
- `ONBOARDING_PROGRESS` (setup steps completed)

**Data Flow:**
1. User clicks email link → Redirects to app.chefsocial.io
2. Completes profile → Updates `USERS` + creates `BUSINESSES`/`PERSONS`
3. Trial starts → Creates `TRIAL_SESSIONS` with limits (3 posts/day)
4. Each setup step → Updates `ONBOARDING_PROGRESS`

### **Phase 3: Content Creation (app.chefsocial.io)**
```
Voice Conversation → AI Generation → Content Preview → Publish/Schedule
```

**Data Created:**
- `VAPI_CONVERSATIONS` (each voice chat)
- `VOICE_CONTENT_SESSIONS` (content creation context)
- `GENERATED_CONTENT` (the actual posts)
- `USAGE_TRACKING` (trial limits tracking)

**Data Flow:**
1. User clicks "Create Post" → Starts new `VAPI_CONVERSATIONS`
2. Talks to AI or uploads photo → Creates `VOICE_CONTENT_SESSIONS`
3. AI generates content → Creates `GENERATED_CONTENT` with caption, hashtags
4. User publishes → Updates `GENERATED_CONTENT.status` = "published"
5. Usage counted → Updates `TRIAL_SESSIONS.daily_posts_used` and `USAGE_TRACKING`

### **Phase 4: Review Management (Businesses Only)**
```
Google Review Received → AI Analysis → Response Generation → Human Review (if needed)
```

**Data Created:**
- `GOOGLE_REVIEWS` (customer reviews from Google API)
- `REVIEW_RESPONSES` (AI-generated replies)
- `AI_AGENT_ALERTS` (when human attention needed)

**Data Flow:**
1. Google API fetches reviews → Creates `GOOGLE_REVIEWS`
2. AI analyzes sentiment → Creates `REVIEW_RESPONSES` if positive
3. Negative review → Creates `AI_AGENT_ALERTS` for human intervention
4. Response published → Updates `REVIEW_RESPONSES.status` = "sent"

### **Phase 5: Subscription & Growth**
```
Trial Expiry → Upgrade Decision → Payment → Full Access
```

**Data Created:**
- `SUBSCRIPTIONS` (Stripe subscription data)
- `EMAIL_CAMPAIGNS` (retention emails, upgrade prompts)
- Updated `USAGE_TRACKING` (higher limits)

**Data Flow:**
1. Trial expires → Checks `TRIAL_SESSIONS.expires_at`
2. Upgrade prompt → Creates `EMAIL_CAMPAIGNS` for retention
3. User upgrades → Creates `SUBSCRIPTIONS` with Stripe data
4. Limits increased → Updates `USAGE_TRACKING` limits

## 👥 **Customer Journey Data Flow**

### **Journey 1: Restaurant Owner**
```
chefsocial.io → Demo (Business) → Google Places Verification → Trial → Review Management → Upgrade
```

**Key Data Points:**
- `DEMO_SESSIONS.user_type` = "business"
- `BUSINESSES` with Google Places data
- `GOOGLE_REVIEWS` + `REVIEW_RESPONSES`
- `PLATFORM_INTEGRATIONS` for Instagram/Facebook

### **Journey 2: Food Content Creator**
```
chefsocial.io → Demo (Person) → Profile Setup → Trial → Content Creation → Upgrade
```

**Key Data Points:**
- `DEMO_SESSIONS.user_type` = "person"
- `PERSONS` with food type and audience
- Focus on `GENERATED_CONTENT` creation
- No review management features

## 🔄 **Critical Data Relationships**

### **Demo to Trial Conversion**
```
DEMO_SESSIONS.voice_extracted_data → USERS.demo_data → BUSINESSES/PERSONS pre-filled
```
Voice conversation data from demo automatically fills trial signup form.

### **Voice Conversations Drive Everything**
```
VAPI_CONVERSATIONS → VOICE_CONTENT_SESSIONS → GENERATED_CONTENT
```
Every piece of content comes from a voice conversation with the AI agent.

### **Usage Tracking Enforces Limits**
```
TRIAL_SESSIONS.daily_posts_used → USAGE_TRACKING → Blocks/Allows new content
```
Real-time checking prevents exceeding 3 posts/day trial limit.

### **Reviews Trigger AI Actions**
```
GOOGLE_REVIEWS → AI_AGENT_ALERTS → Human intervention or auto-response
```
Negative reviews automatically create alerts for human follow-up.

## 📊 **Data Dependencies**

### **Core Dependencies:**
1. **User → Trial Session** (1:1) - Each user gets one trial
2. **Trial Session → Voice Sessions** (1:many) - Multiple conversations per trial
3. **Voice Session → Generated Content** (1:many) - One conversation creates multiple posts
4. **Business → Google Reviews** (1:many) - Restaurants receive multiple reviews
5. **Demo Session → User Conversion** (1:1) - Demo data becomes user profile

### **Critical Data Flows:**
1. **Demo Data Persistence**: Anonymous demo becomes logged-in user data
2. **Usage Enforcement**: Daily limits checked before allowing new content
3. **AI Context Retention**: Previous conversations inform new ones
4. **Platform Sync**: Content publishing updates external social media
5. **Billing Integration**: Usage tracking drives subscription tiers

## 🎯 **Domain-Specific Data Flow**

### **chefsocial.io (Marketing)**
- Creates: `DEMO_SESSIONS`, `VAPI_CONVERSATIONS`, `VISUAL_PREVIEWS`
- Captures: Email, user type, voice preferences
- Converts: Anonymous sessions to registered users

### **app.chefsocial.io (Application)**
- Creates: `USERS`, `BUSINESSES`/`PERSONS`, `TRIAL_SESSIONS`, `GENERATED_CONTENT`
- Manages: Content creation, publishing, review responses
- Tracks: Usage limits, subscription status, feature adoption

This data flow ensures seamless handoff from marketing discovery to active product usage, with the voice AI agent driving all content creation throughout the journey.