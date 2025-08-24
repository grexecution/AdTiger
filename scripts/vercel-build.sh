#!/bin/bash

echo "🚀 Starting Vercel build process..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# For migrations, we need to use direct connection if available
# Vercel should have DIRECT_URL for migrations and DATABASE_URL for runtime
if [ ! -z "$DIRECT_URL" ]; then
  echo "🔧 Using direct connection for migrations..."
  DATABASE_URL="$DIRECT_URL" npx prisma db push --accept-data-loss
else
  echo "🔧 Using default connection for migrations..."
  npx prisma db push --accept-data-loss
fi

# Run seed script
echo "🌱 Seeding database..."
node scripts/vercel-setup.js

# Build Next.js
echo "🏗️ Building Next.js application..."
next build

echo "✅ Build complete!"