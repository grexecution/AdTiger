import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')
  
  // Check if data already exists
  const existingUser = await prisma.user.findFirst({
    where: { email: 'admin@example.com' }
  })
  
  if (existingUser) {
    console.log('⚠️  Seed data already exists. Skipping...')
    console.log('\n📝 Test credentials:')
    console.log('   Email: admin@example.com')
    console.log('   Password: password123')
    return
  }
  
  // Create test account
  const account = await prisma.account.create({
    data: {
      name: 'Acme Marketing Agency',
    },
  })
  
  console.log(`✅ Created account: ${account.name}`)
  
  // Create test user with hashed password
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const user = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      accountId: account.id,
    },
  })
  
  console.log(`✅ Created user: ${user.email}`)
  console.log('\n📝 Test credentials:')
  console.log('   Email: admin@example.com')
  console.log('   Password: password123')
  
  // No demo data - will be synced from actual provider connections
  
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