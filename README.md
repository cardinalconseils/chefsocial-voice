# ChefSocial Voice

A modern voice-to-content platform for restaurants, built with Next.js 14 and TypeScript.

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open in Browser**
   ```
   http://localhost:3000
   ```

## 🎯 Features

- 🎤 **Voice-to-Content**: Transform restaurant descriptions into engaging social media content
- 🏪 **Restaurant Management**: Manage restaurant profiles and content
- 👤 **User Authentication**: Secure JWT-based authentication system
- 📊 **Dashboard**: Comprehensive dashboard for managing content and analytics
- 🎨 **Modern UI**: Beautiful glass morphism design with Tailwind CSS
- 📱 **Mobile-First**: Responsive design optimized for all devices

## 🛠 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: JWT with bcrypt
- **Database**: SQLite (easily replaceable)
- **Deployment**: Vercel

## 📁 Project Structure

```
chefsocial-voice/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/            # API routes
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # User dashboard
│   │   ├── demo/           # Demo page
│   │   └── apps/           # Voice applications
│   ├── components/         # Reusable components
│   ├── lib/               # Utility libraries
│   └── types/             # TypeScript type definitions
├── public/                # Static assets
├── doc/                   # Documentation
├── .env.example          # Environment variables template
└── README.md             # This file
```

## 📖 Documentation

- [Platform Access Guide](PLATFORM_ACCESS_GUIDE.md) - How to access different parts of the platform
- [Component Management Guide](COMPONENT_MANAGEMENT_GUIDE.md) - Managing UI components
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Deployment instructions
- [Migration Guide](MIGRATION.md) - Migration from old architecture
- [API Documentation](doc/API_DOCUMENTATION.md) - API endpoints and usage

## 🔧 Development

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# Required
JWT_SECRET=your-jwt-secret-key
DATABASE_URL=./chefsocial.db

# Optional (for full functionality)
OPENAI_API_KEY=your-openai-key
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:e2e:ui` - Run Playwright tests in UI mode
- `npm run test:e2e:headed` - Run Playwright tests in headed mode (visible browser)
- `npm run test:e2e:debug` - Debug Playwright tests

### Testing

The project uses Playwright for end-to-end testing. Tests are located in the `e2e/` directory.

To run tests:
```bash
# Run all e2e tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests with visible browser
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug
```

Tests run automatically on pull requests via GitHub Actions. All tests must pass before merging.

### Database

The project uses SQLite for development. The database file (`chefsocial.db`) is created automatically when you first run the application.

## 🚀 Deployment

The project is configured for Vercel deployment. See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

## 📝 License

This project is proprietary and confidential.
