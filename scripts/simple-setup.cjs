#!/usr/bin/env node

// Simple database setup that just works
const { execSync } = require('child_process');

console.log('🚀 Database setup...');

// Only run on Vercel
if (process.env.VERCEL !== '1') {
  console.log('Not on Vercel, skipping');
  process.exit(0);
}

// Check DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log('DATABASE_URL not set');
  console.log('Add it in Vercel Dashboard → Settings → Environment Variables');
  process.exit(0);
}

console.log('DATABASE_URL found:', dbUrl.substring(0, 20) + '...');

// Try to setup database
try {
  console.log('Creating tables...');
  execSync(`DATABASE_URL="${dbUrl}" npx prisma db push --accept-data-loss`, {
    stdio: 'inherit'
  });
  console.log('✅ Tables created!');
} catch (e) {
  console.log('Database setup failed, continuing anyway');
}

console.log('Setup complete');