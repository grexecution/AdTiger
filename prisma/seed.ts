import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')
  
  // Check if data already exists
  const existingUser = await prisma.user.findFirst({
    where: { email: 'admin@demo.com' }
  })
  
  if (existingUser) {
    console.log('⚠️  Seed data already exists. Skipping...')
    console.log('\n📝 Demo credentials:')
    console.log('   🛡️  admin@demo.com / admin123')
    console.log('   👑 pro@demo.com / demo123')
    console.log('   👤 free@demo.com / demo123')
    return
  }
  
  // Create demo accounts
  const proAccount = await prisma.account.create({
    data: {
      name: 'Pro Marketing Agency',
    },
  })
  
  const freeAccount = await prisma.account.create({
    data: {
      name: 'Free Tier Company',
    },
  })
  
  console.log(`✅ Created accounts`)
  
  // Create demo users with hashed passwords
  const adminPassword = await bcrypt.hash('admin123', 12)
  const demoPassword = await bcrypt.hash('demo123', 12)
  
  // Admin user (no account - system admin)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      accountId: null, // Admin users don't belong to an account
    },
  })
  
  // Pro tier customer
  const proUser = await prisma.user.create({
    data: {
      email: 'pro@demo.com',
      password: demoPassword,
      name: 'Pro Customer',
      role: 'CUSTOMER',
      accountId: proAccount.id,
    },
  })
  
  // Free tier customer
  const freeUser = await prisma.user.create({
    data: {
      email: 'free@demo.com',
      password: demoPassword,
      name: 'Free Customer',
      role: 'CUSTOMER',
      accountId: freeAccount.id,
    },
  })
  
  console.log(`✅ Created demo users`)
  console.log('\n📝 Demo credentials:')
  console.log('   🛡️  admin@demo.com / admin123 (Admin)')
  console.log('   👑 pro@demo.com / demo123 (Pro Customer)')
  console.log('   👤 free@demo.com / demo123 (Free Customer)')
  
  console.log('\n🎉 Seed completed successfully!')
  console.log('\n🚀 You can now log in at http://localhost:3333 with:')
  console.log('   Email: admin@example.com')
  console.log('   Password: password123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })