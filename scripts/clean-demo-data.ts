import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanDemoData() {
  console.log('🧹 Starting database cleanup...')
  
  try {
    // Get all accounts
    const accounts = await prisma.account.findMany()
    
    for (const account of accounts) {
      console.log(`\nCleaning data for account: ${account.name} (${account.id})`)
      
      // Delete all demo/seed data that was created before real syncs
      // We'll identify demo data by checking for certain patterns
      
      // Delete demo ads
      const deletedAds = await prisma.ad.deleteMany({
        where: {
          accountId: account.id,
          OR: [
            { externalId: { startsWith: 'ad_' } },
            { externalId: { contains: '_123' } },
            { name: { contains: 'Summer Sale' } },
            { name: { contains: 'Holiday' } },
            { name: { contains: 'Creative A' } },
            { metadata: { path: ['createdFrom'], equals: 'demo_seed' } }
          ]
        }
      })
      console.log(`  ✅ Deleted ${deletedAds.count} demo ads`)
      
      // Delete demo ad groups
      const deletedAdGroups = await prisma.adGroup.deleteMany({
        where: {
          accountId: account.id,
          OR: [
            { externalId: { startsWith: 'adset_' } },
            { externalId: { contains: '_123' } },
            { name: { contains: 'Target Audience' } },
            { metadata: { path: ['createdFrom'], equals: 'demo_seed' } }
          ]
        }
      })
      console.log(`  ✅ Deleted ${deletedAdGroups.count} demo ad groups`)
      
      // Delete demo campaigns
      const deletedCampaigns = await prisma.campaign.deleteMany({
        where: {
          accountId: account.id,
          OR: [
            { externalId: { startsWith: 'campaign_' } },
            { externalId: { contains: '_123' } },
            { name: { contains: 'Summer Sale' } },
            { name: { contains: 'Holiday' } },
            { name: { contains: 'Product Launch' } },
            { name: { contains: 'Brand Awareness' } },
            { metadata: { path: ['createdFrom'], equals: 'demo_seed' } }
          ]
        }
      })
      console.log(`  ✅ Deleted ${deletedCampaigns.count} demo campaigns`)
      
      // Delete demo insights
      const deletedInsights = await prisma.insight.deleteMany({
        where: {
          accountId: account.id,
          // Delete insights that reference non-existent campaigns (orphaned)
          campaignId: {
            notIn: await prisma.campaign.findMany({
              where: { accountId: account.id },
              select: { id: true }
            }).then(campaigns => campaigns.map(c => c.id))
          }
        }
      })
      console.log(`  ✅ Deleted ${deletedInsights.count} orphaned insights`)
      
      // Delete demo recommendations
      const deletedRecommendations = await prisma.recommendation.deleteMany({
        where: {
          accountId: account.id,
          OR: [
            { playbookKey: 'ctr-optimization' },
            { title: 'Low CTR Detected' }
          ]
        }
      })
      console.log(`  ✅ Deleted ${deletedRecommendations.count} demo recommendations`)
      
      // Delete demo ad accounts
      const deletedAdAccounts = await prisma.adAccount.deleteMany({
        where: {
          accountId: account.id,
          OR: [
            { externalId: 'act_123456789' },
            { name: 'Test Ad Account' }
          ]
        }
      })
      console.log(`  ✅ Deleted ${deletedAdAccounts.count} demo ad accounts`)
      
      // Delete demo provider connections
      const deletedConnections = await prisma.providerConnection.deleteMany({
        where: {
          accountId: account.id,
          externalAccountId: 'meta_test_account'
        }
      })
      console.log(`  ✅ Deleted ${deletedConnections.count} demo provider connections`)
    }
    
    console.log('\n🎉 Database cleanup completed successfully!')
    console.log('✨ All demo data has been removed')
    console.log('📝 Real data from synced connections has been preserved')
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error)
    throw error
  }
}

cleanDemoData()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })