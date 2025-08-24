#!/usr/bin/env node

// Simple database setup that just works
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

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

// Seed demo users
async function seedUsers() {
  console.log('🌱 Seeding demo users...');
  
  const prisma = new PrismaClient();
  
  try {
    // Check if users already exist
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log('✅ Users already exist, skipping seed');
      return;
    }
    
    // Create demo accounts
    const proAccount = await prisma.account.create({
      data: { name: 'Pro Marketing Agency' }
    });
    
    const freeAccount = await prisma.account.create({
      data: { name: 'Free Tier Company' }
    });
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 12);
    const demoPassword = await bcrypt.hash('demo123', 12);
    
    // Create demo users
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
    console.log('   admin@demo.com / admin123');
    console.log('   pro@demo.com / demo123');
    console.log('   free@demo.com / demo123');
    
  } catch (error) {
    console.log('Seeding failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
seedUsers().then(() => {
  console.log('Setup complete');
}).catch(e => {
  console.log('Seed error:', e);
});