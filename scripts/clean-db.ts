import { prisma } from "@/lib/prisma"

async function cleanDatabase() {
  console.log("🧹 Cleaning database...")
  
  try {
    // Delete in correct order to avoid foreign key constraints
    await prisma.feedback.deleteMany()
    await prisma.recommendation.deleteMany()
    await prisma.insight.deleteMany()
    await prisma.ad.deleteMany()
    await prisma.adGroup.deleteMany()
    await prisma.campaign.deleteMany()
    await prisma.adAccount.deleteMany()
    await prisma.providerConnection.deleteMany()
    
    console.log("✅ Database cleaned successfully")
    
    // Show current state
    const accounts = await prisma.account.findMany()
    const users = await prisma.user.findMany()
    
    console.log(`\n📊 Current state:`)
    console.log(`- Accounts: ${accounts.length}`)
    console.log(`- Users: ${users.length}`)
    console.log(`- Provider Connections: 0`)
    console.log(`- Ad Accounts: 0`)
    
  } catch (error) {
    console.error("❌ Error cleaning database:", error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanDatabase()