# ChefSocial Admin Panel

Modern React admin dashboard for managing the ChefSocial platform. Built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Admin Authentication** - Secure JWT-based admin login
- **User Management** - View, search, and manage user accounts
- **Analytics Dashboard** - Platform metrics and insights
- **Usage Reports** - Detailed user activity and content generation stats
- **Audit Logging** - Complete admin activity tracking
- **Responsive Design** - Mobile-friendly interface
- **Real-time Updates** - Live data with automatic refresh

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Deployment**: Vercel

## 🏗️ Architecture

```
app.chefsocial.io/admin/
├── /login          # Admin authentication
├── /dashboard      # Overview and key metrics
├── /users          # User management
├── /analytics      # Platform analytics
├── /usage          # Usage reports
├── /audit          # Audit logs
└── /settings       # Admin settings
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Access to ChefSocial API

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/USERNAME/chefsocial-admin-panel.git
   cd chefsocial-admin-panel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your API URLs:
   ```env
   NEXT_PUBLIC_API_URL=https://api.chefsocial.io
   NEXT_PUBLIC_APP_URL=https://app.chefsocial.io
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🔑 Admin Setup

Create an admin user using the backend script:

```bash
# In the main ChefSocial backend
node create-admin.js
```

Default credentials (change after first login):
- Email: `admin@chefsocial.io`
- Password: `admin123`

## 📊 API Integration

The admin panel integrates with these ChefSocial API endpoints:

- `POST /api/admin/auth/login` - Admin authentication
- `GET /api/admin/users` - User management
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/analytics` - Platform analytics
- `GET /api/admin/usage-reports` - Usage reports
- `GET /api/admin/audit-log` - Audit logs

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to GitHub**
   - Fork this repository
   - Connect to Vercel
   - Import the project

2. **Configure Environment**
   ```env
   NEXT_PUBLIC_API_URL=https://api.chefsocial.io
   NEXT_PUBLIC_APP_URL=https://app.chefsocial.io
   ```

3. **Deploy**
   - Vercel will automatically deploy on push to main
   - Access at: `https://your-project.vercel.app`

### Manual Build

```bash
# Build for production
npm run build

# Export static files
npm run export

# Serve the 'out' directory
```

## 🔐 Security Features

- **JWT Authentication** - Secure admin sessions
- **Role-based Access** - Admin-only routes
- **HTTPS Enforced** - All API calls over SSL
- **Audit Trail** - Complete activity logging
- **Session Management** - Automatic token refresh
- **CSRF Protection** - Request validation
- **Content Security Policy** - XSS prevention

## 📱 Responsive Design

The admin panel is fully responsive and works on:

- **Desktop** - Optimal experience on large screens
- **Tablet** - Touch-friendly interface
- **Mobile** - Collapsible sidebar and mobile navigation

## 🎨 UI Components

- **Dashboard Cards** - Key metrics and KPIs
- **Data Tables** - Sortable, filterable user lists
- **Charts & Graphs** - Visual analytics with Recharts
- **Modal Dialogs** - User actions and confirmations
- **Toast Notifications** - Success/error feedback
- **Loading States** - Skeleton loaders and spinners

## 🔧 Configuration

### API Configuration

Update `lib/api.ts` to configure:
- Base API URL
- Request timeouts
- Default headers
- Error handling

### Styling

Customize the theme in `tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      'chef-orange': '#FF6B35',
      'chef-dark': '#2C3E50',
      // ... other colors
    }
  }
}
```

## 📈 Performance

- **Static Generation** - Pre-built pages for fast loading
- **Code Splitting** - Automatic route-based splitting
- **Image Optimization** - Next.js optimized images
- **Bundle Analysis** - Monitor build size
- **Caching** - API response caching

## 🧪 Development

### Code Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable UI components
├── lib/                # Utilities and API client
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

### Available Scripts

```bash
npm run dev             # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript checks
```

## 🔍 Monitoring

The admin panel includes:

- **Error Boundaries** - Graceful error handling
- **Performance Metrics** - Core Web Vitals
- **API Monitoring** - Request/response logging
- **User Analytics** - Admin usage tracking

## 📚 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [ChefSocial API Docs](https://docs.chefsocial.io)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📄 License

This project is private and proprietary to ChefSocial.

## 🆘 Support

For technical support:
- Email: dev@chefsocial.io
- Documentation: https://docs.chefsocial.io
- Issues: GitHub Issues (private repo)

---

**ChefSocial Admin Panel** - Built with ❤️ for restaurant success