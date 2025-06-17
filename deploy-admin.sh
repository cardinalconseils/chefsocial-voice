#!/bin/bash

# Deploy Admin Panel to Main App
# This script builds the admin panel and integrates it with the main app

set -e

echo "🔧 Building and deploying admin panel to /admin route..."
echo "======================================================"

# Build admin panel
echo "📦 Building admin panel..."
cd admin-panel
npm install
NODE_ENV=production npm run build

# Check if build was successful
if [ ! -d "out" ]; then
    echo "❌ Admin panel build failed - no 'out' directory found"
    exit 1
fi

echo "✅ Admin panel build completed"

# Create admin directory in main app
echo "📁 Setting up admin directory in main app..."
cd ..
mkdir -p public/admin

# Copy admin panel build output
echo "📋 Copying admin panel files..."
cp -r admin-panel/out/* public/admin/

# Verify deployment
echo "🔍 Verifying deployment..."
if [ -f "public/admin/index.html" ]; then
    echo "✅ Admin panel successfully deployed to public/admin/"
    echo "🌐 Admin panel will be accessible at /admin"
else
    echo "❌ Deployment verification failed"
    exit 1
fi

echo ""
echo "🎉 Admin panel deployment completed!"
echo "📋 Next steps:"
echo "1. Start the main server: npm start"
echo "2. Access admin panel at: http://localhost:3000/admin"
echo "3. For production: Deploy main app with integrated admin panel"