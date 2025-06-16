# ChefSocial Architecture & Deployment Strategy

## 🏗️ **Current Architecture Overview**

### **Single Monolith Application**
Currently, ChefSocial Voice is built as a **single Node.js application** that serves multiple purposes:
- Backend API for voice processing
- Frontend web application
- Authentication system
- Marketing landing page

## 🌐 **Proposed Domain Structure**

### **Marketing Site: chefsocial.io**
**Purpose**: Convert visitors to customers
- **Technology**: Static site (Next.js, Gatsby, or static HTML)
- **Content**: 
  - Hero section with value proposition
  - Feature showcases
  - Pricing page (fetches from app.chefsocial.io/api/pricing)
  - Testimonials and case studies
  - Blog/resources section
  - CTA buttons leading to app.chefsocial.io/register

### **Application Backend: app.chefsocial.io**
**Purpose**: Core SaaS application and API
- **Technology**: Current Node.js application
- **Functions**:
  - User authentication and management
  - Voice processing API
  - Content generation
  - Usage tracking and billing
  - Admin dashboard
  - User dashboard/profile

## 📁 **Current Codebase Analysis**

### ✅ **What Exists**
```
/Users/pierre-marccardinal/Documents/chefsocial-voice/
├── Backend & API
│   ├── simple_voice_backend.js     # Main server
│   ├── auth-system.js              # Authentication & Stripe
│   ├── database.js                 # Database layer
│   ├── realtime-handler.js         # WebSocket handling
│   └── sms-service.js              # SMS integration
├── Frontend Pages
│   ├── public/index.html           # Homepage (marketing)
│   ├── public/demo.html            # Free demo
│   ├── public/register.html        # Registration
│   ├── public/login.html           # Login
│   └── public/conversation.html    # Voice interface
├── Configuration
│   ├── .env                        # Environment variables
│   ├── package.json               # Dependencies
│   └── vercel.json                # Deployment config
└── Documentation
    ├── doc/pricing.md             # Pricing structure
    └── doc/journey.md             # User journey
```

### ❌ **What's Missing**

#### **1. User Profile & Dashboard**
```
Missing Files:
├── public/dashboard.html          # User dashboard (exists but basic)
├── public/profile.html            # User profile management
├── public/billing.html            # Billing & usage management
├── public/settings.html           # Account settings
└── public/usage-stats.html       # Usage analytics
```

#### **2. Admin Panel**
```
Missing Files:
├── public/admin/                  # Admin directory
│   ├── dashboard.html            # Admin overview
│   ├── users.html                # User management
│   ├── licenses.html             # License management
│   ├── analytics.html            # Platform analytics
│   └── billing.html              # Revenue & billing oversight
```

#### **3. API Endpoints for User Management**
```
Missing API Routes:
├── /api/user/profile             # Get/update user profile
├── /api/user/billing             # Billing information
├── /api/user/subscription        # Manage subscription
├── /api/admin/users              # Admin user management
├── /api/admin/analytics          # Platform analytics
└── /api/admin/licenses           # License management
```

#### **4. Marketing Site Components**
```
Missing Marketing Files:
├── marketing-site/               # Separate marketing codebase
│   ├── pages/index.html         # Landing page
│   ├── pages/features.html      # Feature showcase
│   ├── pages/pricing.html       # Pricing page
│   ├── pages/about.html         # About us
│   └── pages/blog/              # Blog section
```

## 🔧 **Required Implementation Plan**

### **Phase 1: Separate Marketing Site (chefsocial.io)**
1. **Create separate repository** for marketing site
2. **Static site generator** (recommended: Next.js or Astro)
3. **Content management** for easy updates
4. **API integration** to fetch pricing from app.chefsocial.io
5. **SEO optimization** for organic traffic
6. **Domain setup** and DNS configuration

### **Phase 2: User Dashboard (app.chefsocial.io)**
1. **User Profile Management**
   - Personal information
   - Restaurant details
   - Brand voice settings
   - Team member management

2. **Usage Dashboard**
   - Current month usage
   - Usage history
   - Overage predictions
   - Usage analytics

3. **Billing Management**
   - Subscription details
   - Payment methods
   - Billing history
   - Invoice downloads

### **Phase 3: Admin Panel (app.chefsocial.io/admin)**
1. **User Management**
   - User list and search
   - Account details
   - Subscription management
   - Usage monitoring

2. **License Management**
   - Active subscriptions
   - Usage tracking
   - Billing oversight
   - Support tickets

3. **Platform Analytics**
   - Revenue metrics
   - User growth
   - Feature usage
   - Performance monitoring

## 🚀 **Deployment Strategy**

### **Option A: Separate Deployments (Recommended)**
- **chefsocial.io**: Vercel/Netlify (static marketing)
- **app.chefsocial.io**: Current Vercel deployment (application)

### **Option B: Subdirectory Routing**
- **chefsocial.io**: Marketing site
- **chefsocial.io/app**: Application (reverse proxy)

## 🔒 **Authentication Flow**

### **Current State**
- Users register/login directly on app.chefsocial.io
- JWT-based authentication
- Stripe integration for billing

### **Proposed Flow**
1. **Marketing site** (chefsocial.io) → CTA buttons
2. **Redirect** to app.chefsocial.io/register
3. **After registration** → app.chefsocial.io/dashboard
4. **Session management** across subdomains

## 📊 **Database Requirements**

### **Current Tables**
- `users` - User accounts and profiles
- `conversations` - Voice conversation history
- `content` - Generated social media content
- `features` - Feature flags and limits
- `usage_tracking` - Consumption monitoring

### **Missing Tables**
- `admin_users` - Admin accounts
- `support_tickets` - Customer support
- `audit_logs` - Security and activity tracking
- `billing_events` - Detailed billing history

## 🛠️ **Technical Recommendations**

### **Immediate Priority (Week 1-2)**
1. ✅ **User Dashboard**: Build comprehensive user interface
2. ✅ **Admin Panel**: Basic user and license management
3. ✅ **API Expansion**: User management endpoints

### **Medium Priority (Week 3-4)**
1. 🔄 **Marketing Site**: Separate repository and deployment
2. 🔄 **Domain Setup**: DNS and SSL configuration
3. 🔄 **Analytics**: User behavior and platform metrics

### **Long-term (Month 2+)**
1. 📈 **Advanced Analytics**: Revenue and growth tracking
2. 🎯 **A/B Testing**: Marketing and conversion optimization
3. 📱 **Mobile App**: Native mobile experience

## 🔗 **Integration Points**

### **Marketing → App**
- Pricing data API
- Registration redirects
- Feature information
- Customer testimonials

### **App → Marketing**
- User success stories
- Usage statistics (anonymized)
- Feature usage data
- Conversion tracking

## 💡 **Next Steps**

1. **Choose deployment strategy** (separate vs. subdirectory)
2. **Create marketing site repository**
3. **Build user dashboard interface**
4. **Implement admin panel**
5. **Set up domain configuration**
6. **Plan database migrations**

Would you like me to prioritize any specific component or create detailed implementation guides for any of these areas?