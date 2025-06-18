# ChefSocial Component Management Guide

## 🏗️ **Architecture Overview**

ChefSocial uses a **4-component architecture** optimized for development efficiency and deployment simplicity:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHEFSOCIAL ECOSYSTEM                     │
├─────────────────────────────────────────────────────────────────┤
│  📱 chefsocial.io          │  🚀 app.chefsocial.io              │
│  Marketing Site            │  Main Application                   │
│  (Separate Deployment)     │  (Integrated Deployment)           │
│                           │                                     │
│  • Landing Page           │  • 🔧 Backend API (/src/)          │
│  • Features               │  • 📊 User Dashboard (/dashboard/) │
│  • Pricing                │  • 👨‍💼 Admin Panel (/admin/)        │
│  • Blog                   │  • 🔐 Authentication (/auth/)      │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 **Component Breakdown**

### 1. **Backend API** (`/src/`)
- **Technology**: Node.js + Express
- **Purpose**: Core business logic, API endpoints, voice processing
- **Deployment**: Integrated with main app
- **Development**: `npm run dev` (Port 3004)
- **Files**: `src/server.js`, `src/routes/`, `src/services/`

### 2. **User Dashboard** (`/dashboard/`)
- **Technology**: Static HTML/CSS/JS with modular components
- **Purpose**: User interface, profile management, analytics
- **Deployment**: Served directly by backend
- **Development**: Edit files directly, no build step needed
- **Files**: `dashboard/index.html`, `dashboard/shared/`

### 3. **Admin Panel** (`/admin-panel/`)
- **Technology**: Next.js 14 (React + TypeScript)
- **Purpose**: Admin management, user oversight, analytics
- **Deployment**: Built and integrated via script
- **Development**: `npm run dev:admin` (Port 3005)
- **Files**: `admin-panel/app/`, `admin-panel/components/`

### 4. **Marketing Site** (`/marketing-site/`)
- **Technology**: Static HTML/CSS/JS
- **Purpose**: Lead generation, SEO, conversion
- **Deployment**: Separate Vercel project
- **Development**: `npm run dev:marketing` (Port 3006)
- **Files**: `marketing-site/pages/`, `marketing-site/styles/`

## 🔄 **Development Workflow**

### **Daily Development Commands**

```bash
# Start backend development server
npm run dev                    # Main API server on PORT 3004

# Start admin panel development (separate terminal)
npm run dev:admin             # Next.js dev server on PORT 3005

# Start marketing site development (separate terminal)  
npm run dev:marketing         # Static server on PORT 3006

# View user dashboard
# Open browser: http://localhost:3004/dashboard
```

### **Component-Specific Development**

#### **🔧 Backend Development**
```bash
# Location: /src/
# Files to edit: server.js, routes/*.js, services/*.js

# Start development
npm run dev                   # Runs on PORT 3004

# Test API endpoints
curl http://localhost:3004/api/health
curl http://localhost:3004/api/auth/status
```

#### **📊 Dashboard Development**
```bash
# Location: /dashboard/
# Files to edit: *.html, shared/*.js, shared/*.css

# No build step needed - edit files directly
# Refresh browser to see changes
# Access: http://localhost:3004/dashboard
```

#### **👨‍💼 Admin Panel Development**
```bash
# Location: /admin-panel/
# Files to edit: app/*.tsx, components/*.tsx

# Start development server
cd admin-panel
PORT=3005 npm run dev         # Runs on PORT 3005

# Access: http://localhost:3005 (separate Next.js server)
# API calls go to: http://localhost:3004/api (main server)
```

#### **📱 Marketing Site Development**
```bash
# Location: /marketing-site/
# Files to edit: pages/*.html, styles/*.css

# Start development server
cd marketing-site
python3 -m http.server 3006   # Runs on PORT 3006

# Access: http://localhost:3006
```

## 🚀 **Deployment Strategy**

### **Option 1: Integrated Deployment (Current)**

**Single command deployment:**
```bash
# Deploy everything together
npm run deploy:all
```

**What happens:**
1. Builds admin panel (`admin-panel/out/`)
2. Copies admin build to main app (`public/admin/`)
3. Deploys main app with integrated admin panel
4. Result: All components accessible from `app.chefsocial.io`

**URLs:**
- Backend API: `app.chefsocial.io/api/*`
- User Dashboard: `app.chefsocial.io/dashboard`
- Admin Panel: `app.chefsocial.io/admin`
- Auth Pages: `app.chefsocial.io/auth/*`

### **Option 2: Separate Marketing Deployment**

```bash
# Deploy marketing site separately
npm run deploy:marketing

# Result: chefsocial.io (separate domain)
```

### **Manual Deployment Steps**

#### **Deploy Admin Panel Integration**
```bash
./deploy-admin.sh              # Build and integrate admin panel
vercel --prod                  # Deploy main app
```

#### **Deploy Marketing Site**
```bash
cd marketing-site
vercel --prod                  # Deploy to separate project
```

## 🔧 **Component Interaction**

### **Data Flow**
```
Marketing Site → Redirects → Main App Registration
Main App → Authentication → User Dashboard
User Dashboard → API Calls → Backend Services
Admin Panel → API Calls → Backend Admin Routes
```

### **Shared Resources**
- **Authentication**: JWT tokens shared across main app
- **Database**: Single SQLite database for all components
- **API**: Backend serves all components
- **Styling**: Shared CSS variables and components

## 🛠️ **Development Tools & Scripts**

### **Package.json Scripts**
```json
{
  "start": "PORT=3004 node src/server.js",           // Production server
  "dev": "PORT=3004 nodemon src/server.js",          // Backend development
  "dev:admin": "cd admin-panel && PORT=3005 npm run dev",    // Admin development
  "dev:marketing": "cd marketing-site && python3 -m http.server 3006",
  "build:admin": "cd admin-panel && npm run build",
  "deploy:admin": "./deploy-admin.sh",
  "deploy:marketing": "cd marketing-site && vercel --prod",
  "deploy:all": "npm run deploy:admin && vercel --prod"
}
```

### **Port Configuration**
- **Main Backend**: Port 3004 (never use 3000-3003 - always busy)
- **Admin Panel Dev**: Port 3005
- **Marketing Site Dev**: Port 3006

### **Useful Development Commands**
```bash
# Check all processes
ps aux | grep node

# Kill development servers
pkill -f "nodemon\|next\|python3"

# Check port usage
lsof -i :3004
lsof -i :3005
lsof -i :3006

# Fresh start (clean all builds)
rm -rf admin-panel/.next admin-panel/out public/admin

# Rebuild everything
npm run build:admin && npm run deploy:admin
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **Port Conflicts**
```bash
# Never use ports 3000-3003 - they're always busy
# All development is configured for ports 3004-3006
# If you see port conflicts, check:
lsof -i :3004
lsof -i :3005
lsof -i :3006
```

#### **Admin Panel Not Loading**
```bash
# Solution: Rebuild and redeploy
./deploy-admin.sh
vercel --prod
```

#### **API Endpoints Not Working**
```bash
# Check if backend is running on correct port
curl http://localhost:3004/api/health

# Restart backend
npm run dev
```

#### **Dashboard Styling Issues**
```bash
# Check shared CSS files
ls -la dashboard/shared/
# Verify CSS is being served
curl http://localhost:3004/dashboard/shared/styles.css
```

#### **Marketing Site Not Updating**
```bash
# Redeploy marketing site
cd marketing-site
vercel --prod
```

## 📊 **Monitoring & Maintenance**

### **Health Checks**
- **Main App**: `https://app.chefsocial.io/api/health`
- **Admin Panel**: `https://app.chefsocial.io/admin`
- **Dashboard**: `https://app.chefsocial.io/dashboard`
- **Marketing**: `https://chefsocial.io`

### **Development Health Checks**
- **Main App**: `http://localhost:3004/api/health`
- **Admin Panel**: `http://localhost:3005`
- **Dashboard**: `http://localhost:3004/dashboard`
- **Marketing**: `http://localhost:3006`

### **Log Monitoring**
```bash
# View server logs
tail -f logs/server.log

# View Vercel logs
vercel logs https://your-deployment-url.vercel.app
```

### **Performance Monitoring**
- **Backend**: Monitor API response times
- **Admin Panel**: Check Next.js build sizes
- **Dashboard**: Monitor page load times
- **Marketing**: Track conversion rates

## 🎯 **Best Practices**

### **Development**
1. **Always test locally** before deploying
2. **Use correct ports** (3004 for backend, 3005 for admin, 3006 for marketing)
3. **Test admin panel integration** after changes
4. **Verify API endpoints** work across all components

### **Deployment**
1. **Deploy admin panel first** (`./deploy-admin.sh`)
2. **Then deploy main app** (`vercel --prod`)
3. **Test all components** after deployment
4. **Monitor logs** for errors

### **Code Organization**
1. **Keep components modular** and independent
2. **Share common utilities** in `/src/utils/`
3. **Use consistent naming** across components
4. **Document API changes** that affect multiple components

## 🚀 **Future Enhancements**

### **Potential Improvements**
1. **Docker containerization** for consistent development
2. **CI/CD pipeline** for automated deployments
3. **Component-specific testing** suites
4. **Shared component library** for UI consistency
5. **Monitoring dashboard** for all components

This architecture provides the perfect balance of development efficiency and deployment simplicity while maintaining clear separation of concerns. 