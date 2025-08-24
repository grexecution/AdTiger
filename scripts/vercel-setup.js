const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting Vercel database setup...')
  
  try {
    // Check if tables exist by trying to query
    const userCount = await prisma.user.count().catch(() => null)
    
    if (userCount === null) {
      console.log('❌ Tables do not exist. Please run: npx prisma db push')
      process.exit(1)
    }
    
    // Check if data already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: 'admin@demo.com' }
    })
    
    if (existingUser) {
      console.log('✅ Demo data already exists. Skipping seed.')
      return
    }
    
    console.log('📦 Creating demo accounts and users...')
    
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
    
    // Create demo users with hashed passwords
    const adminPassword = await bcrypt.hash('admin123', 12)
    const demoPassword = await bcrypt.hash('demo123', 12)
    
    // Admin user (no account - system admin)
    await prisma.user.create({
      data: {
        email: 'admin@demo.com',
        password: adminPassword,
        name: 'Admin User',
        role: 'ADMIN',
        accountId: null,
      },
    })
    
    // Pro tier customer
    await prisma.user.create({
      data: {
        email: 'pro@demo.com',
        password: demoPassword,
        name: 'Pro Customer',
        role: 'CUSTOMER',
        accountId: proAccount.id,
      },
    })
    
    // Free tier customer  
    await prisma.user.create({
      data: {
        email: 'free@demo.com',
        password: demoPassword,
        name: 'Free Customer',
        role: 'CUSTOMER',
        accountId: freeAccount.id,
      },
    })
    
    console.log('✅ Demo users created successfully!')
    console.log('📝 Login credentials:')
    console.log('   🛡️  admin@demo.com / admin123')
    console.log('   👑 pro@demo.com / demo123')
    console.log('   👤 free@demo.com / demo123')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })