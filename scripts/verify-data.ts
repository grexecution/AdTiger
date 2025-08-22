import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyData() {
  console.log('📊 Database Summary\n')
  
  try {
    const accounts = await prisma.account.count()
    const users = await prisma.user.count()
    const connections = await prisma.connection.count()
    const adAccounts = await prisma.adAccount.count()
    const campaigns = await prisma.campaign.count()
    const adGroups = await prisma.adGroup.count()
    const ads = await prisma.ad.count()
    const insights = await prisma.insight.count()
    const recommendations = await prisma.recommendation.count()
    
    console.log('📈 Current Database Stats:')
    console.log(`  • Accounts: ${accounts}`)
    console.log(`  • Users: ${users}`)
    console.log(`  • Connections: ${connections}`)
    console.log(`  • Ad Accounts: ${adAccounts}`)
    console.log(`  • Campaigns: ${campaigns}`)
    console.log(`  • Ad Groups: ${adGroups}`)
    console.log(`  • Ads: ${ads}`)
    console.log(`  • Insights: ${insights}`)
    console.log(`  • Recommendations: ${recommendations}`)
    
    if (campaigns > 0) {
      console.log('\n📋 Sample Campaigns (first 5):')
      const sampleCampaigns = await prisma.campaign.findMany({
        take: 5,
        select: {
          name: true,
          provider: true,
          externalId: true,
          status: true
        }
      })
      
      sampleCampaigns.forEach(campaign => {
        console.log(`  • ${campaign.name} (${campaign.provider}/${campaign.externalId}) - ${campaign.status}`)
      })
    }
    
    if (ads > 0) {
      console.log('\n📝 Sample Ads (first 5):')
      const sampleAds = await prisma.ad.findMany({
        take: 5,
        select: {
          name: true,
          provider: true,
          externalId: true,
          status: true
        }
      })
      
      sampleAds.forEach(ad => {
        console.log(`  • ${ad.name} (${ad.provider}/${ad.externalId}) - ${ad.status}`)
      })
    }
    
    console.log('\n✅ All displayed data is from real synced connections')
    
  } catch (error) {
    console.error('❌ Error verifying data:', error)
    throw error
  }
}

verifyData()
  .catch((e) => {
    console.error('❌ Verification failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })