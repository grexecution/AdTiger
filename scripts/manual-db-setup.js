#!/usr/bin/env node

/**
 * Manual database setup script
 * Run this if automatic setup didn't work during deployment
 * 
 * Usage:
 * 1. Set DATABASE_URL environment variable
 * 2. Run: node scripts/manual-db-setup.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');

async function setup() {
  console.log('🚀 Manual database setup...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.log('   Set it to your Neon/Supabase connection string');
    process.exit(1);
  }
  
  try {
    // Push schema
    console.log('📊 Creating database tables...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    // Seed data
    console.log('🌱 Seeding database...');
    const prisma = new PrismaClient();
    
    // Check if already seeded
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log('✅ Database already has data');
      await prisma.$disconnect();
      return;
    }
    
    // Create accounts
    const proAccount = await prisma.account.create({
      data: { name: 'Pro Marketing Agency' }
    });
    
    const freeAccount = await prisma.account.create({
      data: { name: 'Free Tier Company' }
    });
    
    // Create users
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
    
    await prisma.$disconnect();
    
    console.log('✅ Setup complete!');
    console.log('\n📝 Demo credentials:');
    console.log('   admin@demo.com / admin123');
    console.log('   pro@demo.com / demo123');
    console.log('   free@demo.com / demo123');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup();