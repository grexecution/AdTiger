#!/bin/bash

echo "🔧 Initializing database for production..."

# Run Prisma migrations
echo "📊 Pushing database schema..."
npx prisma db push --accept-data-loss

# Run seed script
echo "🌱 Seeding database..."
node scripts/vercel-setup.js

echo "✅ Database initialization complete!"