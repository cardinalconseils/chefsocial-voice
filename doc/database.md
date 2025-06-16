# ChefSocial Voice Database Schema Documentation

## 🗄️ **Database Overview**

**Database Type**: SQLite3
**Location**: `chefsocial.db` (local development)
**ORM**: None (raw SQL queries)
**Schema Management**: Programmatic initialization in `database.js`

## 📊 **Current Table Structure**

### **1. `users` Table**
**Purpose**: Core user accounts and authentication

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,           -- UUID v4
    email TEXT UNIQUE NOT NULL,    -- User email (login)
    password_hash TEXT NOT NULL,   -- bcrypt hashed password
    name TEXT NOT NULL,            -- Full name
    restaurant_name TEXT,          -- Restaurant/business name
    stripe_customer_id TEXT,       -- Stripe customer reference
    
    -- Brand & Content Settings
    brand_colors TEXT,             -- JSON: primary/secondary colors
    brand_fonts TEXT,              -- Font preferences
    specialties TEXT,              -- Restaurant specialties
    ambiance TEXT,                 -- Restaurant ambiance description
    target_audience TEXT,          -- Target customer description
    unique_selling_points TEXT,    -- USPs for content generation
    brand_personality TEXT,        -- Brand voice personality
    content_tone TEXT,             -- Content tone preferences
    key_messages TEXT,             -- Key marketing messages
    
    -- Localization & Subscription
    preferred_language TEXT DEFAULT 'en',  -- en/fr language preference
    
    -- Billing & Account Status
    trial_ends_at DATETIME,        -- Trial expiration
    status TEXT DEFAULT 'active',  -- active/inactive/suspended
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    email_verified BOOLEAN DEFAULT FALSE
);
```

**Key Relationships**:
- One-to-many with `conversations`
- One-to-many with `content`
- One-to-many with `usage_tracking`

### **2. `conversations` Table**
**Purpose**: Voice conversation history and transcripts

```sql
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                    -- Foreign key to users
    transcript TEXT NOT NULL,                 -- Voice-to-text transcript
    image_analysis TEXT,                      -- AI image analysis
    generated_content TEXT,                   -- JSON: social media content
    language TEXT DEFAULT 'en',               -- Conversation language
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

**Usage**: Stores complete voice interaction history for user reference and improvement

### **3. `content` Table**
**Purpose**: Generated social media content library

```sql
CREATE TABLE content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                    -- Foreign key to users
    title TEXT,                               -- Content title/description
    platform TEXT,                           -- instagram/tiktok/facebook/etc
    content_text TEXT,                        -- Generated caption/text
    hashtags TEXT,                           -- Platform-specific hashtags
    media_url TEXT,                          -- Associated image/video URL
    
    -- Performance & Scheduling
    viral_score INTEGER,                     -- AI viral potential (1-10)
    scheduled_for DATETIME,                  -- Scheduled post time
    published_at DATETIME,                   -- Actual publish time
    engagement_data TEXT,                    -- JSON: likes/shares/comments
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

**Usage**: Content library for scheduling, tracking, and performance analysis

### **4. `features` Table**
**Purpose**: Feature flags and plan-based access control

```sql
CREATE TABLE features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,                -- Feature identifier
    name TEXT NOT NULL,                      -- Human-readable name
    description TEXT,                        -- Feature description
    
    -- Plan Access Levels
    starter BOOLEAN DEFAULT FALSE,           -- Available in starter plan
    professional BOOLEAN DEFAULT FALSE,      -- Available in pro plan
    enterprise BOOLEAN DEFAULT FALSE,       -- Available in enterprise plan
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Current Features** (9 total):
1. `voice_content_creation` - Core voice-to-content functionality
2. `natural_conversation` - Advanced conversation mode
3. `multi_platform_optimization` - Cross-platform content optimization
4. `brand_voice_learning` - AI learns restaurant personality
5. `analytics_insights` - Performance analytics
6. `team_collaboration` - Multi-user access
7. `priority_support` - Enhanced customer support
8. `white_label` - Agency white-labeling
9. `custom_integrations` - API and webhook access

### **5. `user_features` Table**
**Purpose**: Junction table for user feature access

```sql
CREATE TABLE user_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                   -- Foreign key to users
    feature_key TEXT NOT NULL,               -- Foreign key to features
    enabled BOOLEAN DEFAULT TRUE,            -- Feature enabled for user
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (feature_key) REFERENCES features (key),
    UNIQUE(user_id, feature_key)
);
```

**Usage**: Controls which features each user can access based on their subscription

### **6. `usage_tracking` Table**
**Purpose**: Monthly usage consumption for billing

```sql
CREATE TABLE usage_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                   -- Foreign key to users
    month_year TEXT NOT NULL,                -- YYYY-MM format
    
    -- Usage Counters
    voice_minutes_used INTEGER DEFAULT 0,    -- Voice processing minutes
    images_generated INTEGER DEFAULT 0,      -- AI image generations
    videos_created INTEGER DEFAULT 0,        -- Video content created
    api_calls_made INTEGER DEFAULT 0,        -- API calls consumed
    extra_locations INTEGER DEFAULT 0,       -- Additional locations
    extra_users INTEGER DEFAULT 0,           -- Additional team members
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, month_year)
);
```

**Usage**: Tracks consumption for overage billing in new $79/month + usage model

## 🔗 **Database Relationships**

```
users (1) ──────── (∞) conversations
  │
  ├──── (∞) content
  │
  ├──── (∞) usage_tracking
  │
  └──── (∞) user_features ──── (1) features
```

## 📈 **Current Data Flow**

### **User Registration Flow**
1. Create user in `users` table
2. Grant features based on subscription in `user_features`
3. Initialize usage tracking for current month

### **Voice Processing Flow**
1. Store conversation in `conversations` table
2. Generate content and save to `content` table
3. Update usage counters in `usage_tracking`

### **Feature Access Flow**
1. Check `user_features` for feature availability
2. Validate against current subscription status
3. Enforce usage limits from `usage_tracking`

## ❌ **Critical Issues**

### **1. Schema Conflicts**
- **Duplicate `usage_tracking` definition** in `database.js` (lines 141-149 and 256-276)
- **Immediate fix required** to prevent database errors

### **2. Missing Indexes**
```sql
-- Critical indexes needed for performance:
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_content_user_id ON content(user_id);
CREATE INDEX idx_usage_user_month ON usage_tracking(user_id, month_year);
CREATE INDEX idx_user_features_lookup ON user_features(user_id, feature_key);
```

### **3. Foreign Key Enforcement**
SQLite doesn't enforce foreign keys by default. Need to enable:
```sql
PRAGMA foreign_keys = ON;
```

## 🚫 **Missing Tables for Complete SaaS**

### **1. Admin Panel Tables**

#### **`admin_users` Table**
```sql
CREATE TABLE admin_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- super_admin, admin, support
    permissions TEXT,   -- JSON array of permissions
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### **`audit_logs` Table**
```sql
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,       -- NULL for system events
    admin_id TEXT,      -- NULL for user events
    action TEXT NOT NULL, -- login, subscription_change, etc.
    entity_type TEXT,   -- user, subscription, content
    entity_id TEXT,     -- ID of affected entity
    details TEXT,       -- JSON with event details
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **2. Enhanced User Management**

#### **`user_sessions` Table**
```sql
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    jwt_token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

#### **`user_profiles` Table**
```sql
CREATE TABLE user_profiles (
    user_id TEXT PRIMARY KEY,
    avatar_url TEXT,
    bio TEXT,
    website_url TEXT,
    phone_number TEXT,
    timezone TEXT DEFAULT 'UTC',
    notification_preferences TEXT, -- JSON
    onboarding_completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### **3. Advanced Billing Tables**

#### **`subscriptions` Table**
```sql
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    stripe_subscription_id TEXT UNIQUE,
    plan_name TEXT NOT NULL, -- complete
    status TEXT NOT NULL,    -- active, canceled, past_due
    current_period_start DATETIME,
    current_period_end DATETIME,
    trial_start DATETIME,
    trial_end DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

#### **`invoices` Table**
```sql
CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    stripe_invoice_id TEXT UNIQUE,
    amount_due INTEGER NOT NULL,   -- in cents
    amount_paid INTEGER DEFAULT 0, -- in cents
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL,          -- draft, open, paid, void
    due_date DATETIME,
    paid_at DATETIME,
    invoice_pdf TEXT,              -- URL to PDF
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### **4. Team Collaboration Tables**

#### **`teams` Table**
```sql
CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    max_members INTEGER DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users (id)
);
```

#### **`team_members` Table**
```sql
CREATE TABLE team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,    -- owner, admin, member, viewer
    invited_by TEXT,       -- user_id who sent invitation
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(team_id, user_id)
);
```

### **5. Content Management Tables**

#### **`content_calendar` Table**
```sql
CREATE TABLE content_calendar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    content_id INTEGER,
    title TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    status TEXT DEFAULT 'draft', -- draft, scheduled, published
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (content_id) REFERENCES content (id)
);
```

#### **`content_performance` Table**
```sql
CREATE TABLE content_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    reach INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES content (id)
);
```

### **6. Notification System**

#### **`notifications` Table**
```sql
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,     -- usage_warning, billing, feature
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at DATETIME,
    action_url TEXT,        -- Optional action link
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## 🚀 **Performance Optimizations**

### **Recommended Indexes**
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_users_status ON users(status);

-- Content queries
CREATE INDEX idx_content_user_platform ON content(user_id, platform);
CREATE INDEX idx_content_scheduled ON content(scheduled_for);
CREATE INDEX idx_content_viral_score ON content(viral_score DESC);

-- Usage tracking
CREATE INDEX idx_usage_user_month ON usage_tracking(user_id, month_year);
CREATE INDEX idx_usage_month_year ON usage_tracking(month_year);

-- Performance monitoring
CREATE INDEX idx_conversations_created ON conversations(created_at);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

### **Query Optimization**
- Use prepared statements for frequent queries
- Implement connection pooling for concurrent users
- Add EXPLAIN QUERY PLAN analysis for slow queries

## 🔒 **Security Enhancements**

### **1. Data Encryption**
- Encrypt sensitive brand information at rest
- Hash all PII fields in audit logs
- Implement field-level encryption for payment data

### **2. Access Control**
- Row-level security for multi-tenant data
- API rate limiting by user_id
- Session management with automatic expiration

### **3. Backup Strategy**
- Automated daily backups
- Point-in-time recovery capability
- Cross-region backup replication

## 📊 **Migration Strategy**

### **Phase 1: Critical Fixes (Week 1)**
1. Fix `usage_tracking` schema duplication
2. Add essential indexes
3. Enable foreign key constraints
4. Implement backup system

### **Phase 2: Admin Foundation (Week 2)**
1. Add `admin_users` table
2. Implement `audit_logs`
3. Create basic admin endpoints
4. Add user session management

### **Phase 3: User Experience (Week 3-4)**
1. Enhanced user profiles
2. Team collaboration tables
3. Notification system
4. Content calendar

### **Phase 4: Advanced Features (Month 2)**
1. Performance analytics
2. Advanced billing tables
3. Content performance tracking
4. Comprehensive reporting

## 🧪 **Testing & Validation**

### **Data Integrity Tests**
```sql
-- Orphaned records check
SELECT COUNT(*) FROM conversations WHERE user_id NOT IN (SELECT id FROM users);
SELECT COUNT(*) FROM content WHERE user_id NOT IN (SELECT id FROM users);

-- Usage tracking validation
SELECT user_id, COUNT(*) FROM usage_tracking GROUP BY user_id HAVING COUNT(*) > 12;

-- Feature access validation
SELECT COUNT(*) FROM user_features WHERE feature_key NOT IN (SELECT key FROM features);
```

## 💡 **Next Steps**

1. **Immediate**: Fix schema conflicts and add indexes
2. **Short-term**: Implement admin panel tables
3. **Medium-term**: Add team collaboration features
4. **Long-term**: Build comprehensive analytics

The current database provides a solid foundation but requires the identified enhancements to support a complete enterprise SaaS platform.