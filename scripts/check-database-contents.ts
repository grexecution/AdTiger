import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

async function checkDatabaseContents() {
  console.log('🔍 Checking database contents...\n')
  
  // Check accounts
  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          users: true,
          campaigns: true,
          ads: true,
          insights: true
        }
      }
    }
  })
  
  console.log(`📊 Found ${accounts.length} accounts:`)
  for (const account of accounts) {
    console.log(`   - ${account.name} (${account.id})`)
    console.log(`     Users: ${account._count.users}, Campaigns: ${account._count.campaigns}, Ads: ${account._count.ads}, Insights: ${account._count.insights}`)
  }
  
  // Check provider connections
  const connections = await prisma.providerConnection.findMany({
    select: {
      provider: true,
      status: true,
      isActive: true,
      lastSyncAt: true,
      account: {
        select: { name: true }
      }
    }
  })
  
  console.log(`\n🔗 Found ${connections.length} provider connections:`)
  for (const conn of connections) {
    console.log(`   - ${conn.provider} for ${conn.account.name}: ${conn.status} (active: ${conn.isActive}, last sync: ${conn.lastSyncAt})`)
  }
  
  // Check campaigns
  const campaigns = await prisma.campaign.findMany({
    select: {
      id: true,
      name: true,
      provider: true,
      status: true,
      externalId: true,
      _count: {
        select: {
          adGroups: true,
          insights: true
        }
      }
    },
    take: 10
  })
  
  console.log(`\n📈 Found ${campaigns.length} campaigns (showing first 10):`)
  for (const campaign of campaigns) {
    console.log(`   - ${campaign.name} (${campaign.provider}, ${campaign.status})`)
    console.log(`     External ID: ${campaign.externalId}`)
    console.log(`     Ad Groups: ${campaign._count.adGroups}, Insights: ${campaign._count.insights}`)
  }
  
  // Check ad groups
  const adGroups = await prisma.adGroup.findMany({
    select: {
      id: true,
      name: true,
      provider: true,
      status: true,
      externalId: true,
      _count: {
        select: {
          ads: true,
          insights: true
        }
      }
    },
    take: 10
  })
  
  console.log(`\n📊 Found ${adGroups.length} ad groups (showing first 10):`)
  for (const adGroup of adGroups) {
    console.log(`   - ${adGroup.name} (${adGroup.provider}, ${adGroup.status})`)
    console.log(`     External ID: ${adGroup.externalId}`)
    console.log(`     Ads: ${adGroup._count.ads}, Insights: ${adGroup._count.insights}`)
  }
  
  // Check ads
  const ads = await prisma.ad.findMany({
    select: {
      id: true,
      name: true,
      provider: true,
      status: true,
      externalId: true,
      creative: true,
      _count: {
        select: {
          insights: true
        }
      }
    },
    take: 10
  })
  
  console.log(`\n🎯 Found ${ads.length} ads (showing first 10):`)
  for (const ad of ads) {
    console.log(`   - ${ad.name} (${ad.provider}, ${ad.status})`)
    console.log(`     External ID: ${ad.externalId}`)
    console.log(`     Insights: ${ad._count.insights}`)
    if (ad.creative) {
      console.log(`     Creative: ${JSON.stringify(ad.creative).substring(0, 100)}...`)
    }
  }
  
  // Check insights
  const insights = await prisma.insight.findMany({
    select: {
      id: true,
      provider: true,
      entityType: true,
      date: true,
      window: true,
      metrics: true
    },
    orderBy: {
      date: 'desc'
    },
    take: 5
  })
  
  console.log(`\n📊 Found ${insights.length} insights (showing first 5):`)
  for (const insight of insights) {
    console.log(`   - ${insight.entityType} (${insight.provider}) on ${insight.date} (${insight.window})`)
    const metrics = insight.metrics as any
    if (metrics && typeof metrics === 'object') {
      const metricKeys = Object.keys(metrics)
      console.log(`     Metrics: ${metricKeys.slice(0, 10).join(', ')}${metricKeys.length > 10 ? '...' : ''}`)
      
      // Show some sample values
      let sampleShown = 0
      for (const [key, value] of Object.entries(metrics)) {
        if (value !== null && value !== undefined && value !== 0 && value !== '0' && sampleShown < 3) {
          console.log(`       ${key}: ${value}`)
          sampleShown++
        }
      }
    }
  }
  
  // Check sync history
  const syncHistory = await prisma.syncHistory.findMany({
    select: {
      provider: true,
      syncType: true,
      status: true,
      startedAt: true,
      campaignsSync: true,
      adGroupsSync: true,
      adsSync: true,
      insightsSync: true,
      errorMessage: true
    },
    orderBy: {
      startedAt: 'desc'
    },
    take: 5
  })
  
  console.log(`\n🔄 Found ${syncHistory.length} sync history entries (showing first 5):`)
  for (const sync of syncHistory) {
    console.log(`   - ${sync.provider} ${sync.syncType} sync on ${sync.startedAt}: ${sync.status}`)
    console.log(`     Campaigns: ${sync.campaignsSync}, Ad Groups: ${sync.adGroupsSync}, Ads: ${sync.adsSync}, Insights: ${sync.insightsSync}`)
    if (sync.errorMessage) {
      console.log(`     Error: ${sync.errorMessage}`)
    }
  }
  
  await prisma.$disconnect()
}

checkDatabaseContents().catch(console.error)