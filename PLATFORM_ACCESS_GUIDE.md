# ChefSocial Platform Access Guide

## 🌐 Current Deployment Status

### Production URL: https://chefsocial-voice.vercel.app

## 📋 Platform Components Overview

ChefSocial consists of **4 main components**:

### 1. 🎯 **User Dashboard** (Currently Live)
- **URL**: https://chefsocial-voice.vercel.app/
- **Purpose**: Main user interface for restaurant owners
- **Features**: Session management, content creation, analytics
- **Status**: ✅ **LIVE** - Dashboard interface accessible

### 2. 🔧 **Admin Panel** (Next.js App - Currently Live)
- **URL**: https://chefsocial-voice.vercel.app/admin/
- **Purpose**: Administrative interface for platform management
- **Tech Stack**: Next.js 14, TypeScript, Tailwind CSS
- **Features**: User management, system monitoring, content moderation
- **Status**: ✅ **LIVE** - Next.js admin interface accessible

### 3. 🚀 **Marketing Site** (Static Site - NOT DEPLOYED)
- **Expected URL**: https://chefsocial-voice.vercel.app/marketing/
- **Purpose**: Public-facing marketing website
- **Features**: Landing pages, demos, pricing, registration
- **Status**: ❌ **MISSING** - Not configured in deployment

### 4. ⚙️ **Backend API** (Serverless Functions - Live)
- **Base URL**: https://chefsocial-voice.vercel.app/api/
- **Purpose**: REST API for all platform functionality
- **Status**: ✅ **LIVE** - Core endpoints working

---

## 🔗 Access URLs

### Main Application URLs
```
🏠 Main Dashboard:     https://chefsocial-voice.vercel.app/
🔧 Admin Panel:        https://chefsocial-voice.vercel.app/admin/
🚀 Marketing Site:     https://chefsocial-voice.vercel.app/marketing/ (NOT WORKING)
🎮 Voice Apps:         https://chefsocial-voice.vercel.app/apps/
```

### Authentication URLs
```
🔐 Login:              https://chefsocial-voice.vercel.app/login.html
📝 Register:           https://chefsocial-voice.vercel.app/register.html
```

### API Endpoints
```
🔍 Health Check:       https://chefsocial-voice.vercel.app/api/health
📊 System Info:        https://chefsocial-voice.vercel.app/api/info
🌐 Languages:          https://chefsocial-voice.vercel.app/api/languages
🔐 Authentication:     https://chefsocial-voice.vercel.app/api/auth/register
```

### Voice Applications
```
🎙️ Natural Voice:      https://chefsocial-voice.vercel.app/apps/natural.html
💬 Conversation:       https://chefsocial-voice.vercel.app/apps/conversation.html
📞 LiveKit Voice:      https://chefsocial-voice.vercel.app/apps/livekit-voice.html
```

---

## 🚨 Current Issues

### ❌ Marketing Site Missing
- **Problem**: Marketing site not deployed
- **Impact**: No public landing page for new users
- **Solution Needed**: Configure marketing-site deployment

### ⚠️ Admin Panel Loading Issue
- **Problem**: Admin panel shows loading screen
- **Likely Cause**: API connection or authentication issue
- **Solution Needed**: Debug admin panel API integration

---

## 🏗️ Architecture Overview

```
ChefSocial Platform
├── Frontend Applications
│   ├── User Dashboard (dashboard/) ✅ LIVE
│   ├── Admin Panel (admin-panel/) ✅ LIVE (loading issue)
│   └── Marketing Site (marketing-site/) ❌ MISSING
├── Authentication System (auth/) ✅ LIVE
├── Voice Applications (apps/) ✅ LIVE
└── Backend API (api/) ✅ LIVE
    ├── /api/health
    ├── /api/info
    ├── /api/languages
    └── /api/auth/*
```

---

## 🔧 Local Development Access

### Start Local Backend Server
```bash
cd /Users/pierre-marccardinal/Documents/chefsocial-voice
npm start
```
**Local Backend**: http://localhost:3004

### Start Admin Panel Development
```bash
cd admin-panel
npm run dev
```
**Local Admin Panel**: http://localhost:3005

### Start Marketing Site Development
```bash
cd marketing-site
# Need to check if dev server is configured
```

---

## 🎯 Next Steps to Fix Missing Components

### 1. Fix Marketing Site Deployment
- Configure vercel.json to include marketing-site
- Add proper routing rules
- Deploy marketing pages

### 2. Debug Admin Panel
- Check API connectivity
- Fix authentication flow
- Resolve loading screen issue

### 3. Complete Integration Testing
- Test all component interactions
- Verify authentication flows
- Validate API endpoints

---

## 📞 Support & Troubleshooting

### Quick Health Checks
```bash
# Check main site
curl -I https://chefsocial-voice.vercel.app/

# Check API health
curl https://chefsocial-voice.vercel.app/api/health

# Check admin panel
curl -I https://chefsocial-voice.vercel.app/admin/
```

### Common Issues
1. **404 Errors**: Check vercel.json routing configuration
2. **Loading Screens**: Check API connectivity and authentication
3. **Missing Assets**: Verify static file serving configuration

---

## 🔄 Deployment Status Summary

| Component | Status | URL | Issues |
|-----------|--------|-----|--------|
| User Dashboard | ✅ Live | `/` | None |
| Admin Panel | ⚠️ Loading | `/admin/` | Stuck on loading screen |
| Marketing Site | ❌ Missing | `/marketing/` | Not deployed |
| Backend API | ✅ Live | `/api/` | Working |
| Authentication | ✅ Live | `/auth/` | Working |
| Voice Apps | ✅ Live | `/apps/` | Working |

**Overall Platform Status**: 🟡 **Partially Functional** - Core features work, missing marketing site and admin panel has issues. 