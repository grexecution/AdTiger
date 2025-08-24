#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Starting database setup for deployment...');

// Check if we're in production (Vercel)
const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

if (!isProduction) {
  console.log('⚠️  Not in production environment, skipping automatic setup');
  process.exit(0);
}

// Debug: Log environment info
console.log('📍 Environment check:');
console.log('   VERCEL:', process.env.VERCEL);
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('   DATABASE_URL starts with:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'NOT SET');

if (!process.env.DATABASE_URL) {
  console.log('⚠️  DATABASE_URL not set, skipping database setup');
  console.log('   Please set DATABASE_URL in Vercel environment variables');
  process.exit(0);
}

// Validate DATABASE_URL format
if (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
  console.log('⚠️  DATABASE_URL must start with postgresql:// or postgres://');
  console.log('   Current value starts with:', process.env.DATABASE_URL.substring(0, 20));
  console.log('   Skipping database setup');
  process.exit(0);
}

try {
  // Step 1: Push database schema
  console.log('📊 Creating database tables...');
  console.log('   Using DATABASE_URL:', process.env.DATABASE_URL.substring(0, 30) + '...');
  
  execSync('npx prisma db push --skip-generate --accept-data-loss', { 
    stdio: 'inherit',
    env: { 
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL 
    }
  });
  
  console.log('✅ Database tables created successfully!');
  
  // Step 2: Run seed script
  console.log('🌱 Seeding database with demo data...');
  const seedScript = `
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    
    const prisma = new PrismaClient();
    
    async function seed() {
      // Check if already seeded
      const userCount = await prisma.user.count();
      if (userCount > 0) {
        console.log('✅ Database already seeded');
        return;
      }
      
      // Create demo accounts
      const proAccount = await prisma.account.create({
        data: { name: 'Pro Marketing Agency' }
      });
      
      const freeAccount = await prisma.account.create({
        data: { name: 'Free Tier Company' }
      });
      
      // Create demo users
      const adminPassword = await bcrypt.hash('admin123', 12);
      const demoPassword = await bcrypt.hash('demo123', 12);
      
      await prisma.user.create({
        data: {
          email: 'admin@demo.com',
          password: adminPassword,
          name: 'Admin User',
          role: 'ADMIN',
          accountId: null
        }
      });
      
      await prisma.user.create({
        data: {
          email: 'pro@demo.com',
          password: demoPassword,
          name: 'Pro Customer',
          role: 'CUSTOMER',
          accountId: proAccount.id
        }
      });
      
      await prisma.user.create({
        data: {
          email: 'free@demo.com',
          password: demoPassword,
          name: 'Free Customer',
          role: 'CUSTOMER',
          accountId: freeAccount.id
        }
      });
      
      console.log('✅ Demo users created!');
    }
    
    seed()
      .catch(e => {
        console.error('Seed error:', e);
        process.exit(1);
      })
      .finally(() => prisma.$disconnect());
  `;
  
  // Write temporary seed file and run it
  const fs = require('fs');
  const path = require('path');
  const tempFile = path.join(__dirname, 'temp-seed.js');
  fs.writeFileSync(tempFile, seedScript);
  
  try {
    execSync(`node ${tempFile}`, { 
      stdio: 'inherit',
      env: { ...process.env }
    });
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
  
  console.log('✅ Database setup complete!');
  console.log('📝 Demo credentials:');
  console.log('   admin@demo.com / admin123');
  console.log('   pro@demo.com / demo123');
  console.log('   free@demo.com / demo123');
  
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  // Don't fail the build if database setup fails
  // This allows the app to deploy even if DB isn't ready
  console.log('⚠️  Continuing build despite database setup failure');
  process.exit(0);
}