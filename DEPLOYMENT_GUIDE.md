# ChefSocial Two-Domain Deployment Guide

## 🏗️ Architecture Overview

ChefSocial uses a **two-domain architecture** for optimal user experience and performance:

### 🌐 Domain 1: chefsocial.io (Marketing Site)
- **Purpose**: Convert visitors to customers
- **Technology**: Static HTML/CSS/JS
- **Deployment**: Separate Vercel project
- **Content**: Landing page, features, pricing, blog

### 🎯 Domain 2: app.chefsocial.io (Application)
- **Purpose**: User dashboard, API, admin panel
- **Technology**: Node.js + organized dashboard
- **Deployment**: Main Vercel project
- **Content**: Dashboard, admin panel, voice features

## 📁 Directory Structure

```
chefsocial-voice/
├── marketing-site/              # 🌐 chefsocial.io
│   ├── pages/
│   │   ├── index.html          # Landing page
│   │   ├── pricing.html        # Pricing page
│   │   └── about.html          # About page
│   ├── styles/
│   ├── assets/
│   └── vercel.json             # Marketing deployment config
├── dashboard/                   # 📊 User Dashboard (NEW)
│   ├── index.html              # Main dashboard
│   ├── profile/                # Profile management
│   ├── analytics/              # Usage analytics
│   ├── content/                # Content library
│   └── shared/                 # Shared components
├── admin-panel/                 # 🔧 Admin Panel
├── public/                      # 🎯 App entry points
├── src/                         # 🚀 Backend API
└── vercel.json                  # Main app deployment config
```

## 🚀 Deployment Steps

### Step 1: Deploy Marketing Site (chefsocial.io)

1. **Create new Vercel project for marketing**:
   ```bash
   cd marketing-site
   npx vercel --prod
   ```

2. **Configure custom domain**:
   - Go to Vercel dashboard → Project Settings → Domains
   - Add custom domain: `chefsocial.io`
   - Configure DNS: Point `chefsocial.io` to Vercel

3. **Set up GitHub Actions** (optional):
   ```yaml
   # .github/workflows/deploy-marketing.yml
   name: Deploy Marketing Site
   on:
     push:
       branches: [main]
       paths: ['marketing-site/**']
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Deploy to Vercel
           run: |
             cd marketing-site
             npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
   ```

### Step 2: Deploy Main Application (app.chefsocial.io)

1. **Deploy integrated app**:
   ```bash
   # This deploys main app + integrated dashboard + admin panel
   ./deploy-admin.sh
   npx vercel --prod
   ```

2. **Configure custom domain**:
   - Go to Vercel dashboard → Project Settings → Domains
   - Add custom domain: `app.chefsocial.io`
   - Configure DNS: Point `app.chefsocial.io` to Vercel

### Step 3: Configure DNS

Set up DNS records to point both domains to their respective Vercel deployments:

```
# DNS Configuration
chefsocial.io        → Vercel (marketing site)
app.chefsocial.io    → Vercel (main application)
```

## 🔗 Integration Points

### Marketing → App
- All CTA buttons redirect to `app.chefsocial.io/register`
- Demo links point to `app.chefsocial.io/demo`
- Pricing data fetched from `app.chefsocial.io/api/pricing`

### App → Marketing
- Logo links back to `chefsocial.io`
- Footer links to marketing pages
- Success stories shared with marketing

## 📋 Dashboard Organization

The new dashboard structure eliminates the giant `dashboard.html` file:

### Main Dashboard (`/dashboard/`)
- User overview and quick actions
- Feature access cards
- Recent activity

### Profile Section (`/dashboard/profile/`)
- Personal information management
- Restaurant details
- Brand voice settings
- Account preferences

### Analytics Section (`/dashboard/analytics/`)
- Usage tracking
- Content performance
- Platform metrics

### Content Library (`/dashboard/content/`)
- Generated content history
- Content management
- Export capabilities

## 🔧 Benefits of This Architecture

### ✅ **Marketing Site Benefits**
- **⚡ Fast Loading**: Static files, CDN-optimized
- **🎯 SEO Optimized**: Clean URLs, meta tags
- **💰 Cost Effective**: Static hosting is cheaper
- **🔄 Easy Updates**: Marketing team can update independently

### ✅ **App Domain Benefits**
- **🛡️ Secure**: User data stays on secure app domain
- **🔧 Full Features**: Complex dashboard functionality
- **📊 Real-time**: Dynamic content and live data
- **🚀 Scalable**: Can handle complex backend operations

### ✅ **Organized Dashboard**
- **📁 Modular**: Each section in its own file
- **🔄 Maintainable**: Easy to update individual features
- **⚡ Performance**: Loads only needed components
- **👥 Team Friendly**: Multiple developers can work simultaneously

## 🚧 Migration Path

1. **✅ Phase 1**: Set up organized dashboard structure
2. **🔄 Phase 2**: Deploy marketing site to separate domain
3. **🔄 Phase 3**: Update DNS and domain configuration
4. **🔄 Phase 4**: Test cross-domain integration
5. **🔄 Phase 5**: Monitor and optimize

## 📊 Monitoring & Analytics

- **Marketing Site**: Google Analytics, hotjar
- **App Domain**: Internal analytics + usage tracking
- **Performance**: Vercel analytics for both domains
- **Uptime**: Monitor both domains independently

This architecture provides the best of both worlds: a fast, SEO-optimized marketing site and a powerful, feature-rich application domain.