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
  
  // Create some sample provider connections (inactive for now)
  const metaConnection = await prisma.providerConnection.create({
    data: {
      accountId: account.id,
      provider: 'meta',
      externalAccountId: 'meta_test_account',
      isActive: false,
      metadata: {
        note: 'Not configured yet - will be set up in Phase 2',
      },
    },
  })
  
  console.log(`✅ Created provider connection: ${metaConnection.provider}`)
  
  // Create a sample ad account
  const adAccount = await prisma.adAccount.create({
    data: {
      accountId: account.id,
      provider: 'meta',
      externalId: 'act_123456789',
      name: 'Test Ad Account',
      currency: 'USD',
      timezone: 'America/New_York',
      status: 'active',
    },
  })
  
  console.log(`✅ Created ad account: ${adAccount.name}`)
  
  // Create a sample campaign
  const campaign = await prisma.campaign.create({
    data: {
      accountId: account.id,
      adAccountId: adAccount.id,
      provider: 'meta',
      externalId: 'campaign_123',
      name: 'Summer Sale Campaign',
      status: 'active',
      objective: 'conversions',
      budgetAmount: 1000,
      budgetCurrency: 'USD',
    },
  })
  
  console.log(`✅ Created campaign: ${campaign.name}`)
  
  // Create a sample ad group
  const adGroup = await prisma.adGroup.create({
    data: {
      accountId: account.id,
      campaignId: campaign.id,
      provider: 'meta',
      externalId: 'adset_123',
      name: 'Target Audience 25-34',
      status: 'active',
      budgetAmount: 500,
      budgetCurrency: 'USD',
    },
  })
  
  console.log(`✅ Created ad group: ${adGroup.name}`)
  
  // Create a sample ad
  const ad = await prisma.ad.create({
    data: {
      accountId: account.id,
      adGroupId: adGroup.id,
      provider: 'meta',
      externalId: 'ad_123',
      name: 'Summer Sale Creative A',
      status: 'active',
      creative: {
        headline: 'Summer Sale - 50% Off',
        body: 'Limited time offer!',
        imageUrl: 'https://example.com/image.jpg',
      },
    },
  })
  
  console.log(`✅ Created ad: ${ad.name}`)
  
  // Create sample insights for the last 7 days
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    
    const insight = await prisma.insight.create({
      data: {
        accountId: account.id,
        provider: 'meta',
        entityType: 'campaign',
        entityId: campaign.id,
        date: date,
        window: 'day',
        metrics: {
          impressions: Math.floor(Math.random() * 10000) + 1000,
          clicks: Math.floor(Math.random() * 500) + 50,
          spend: Math.random() * 100 + 20,
          conversions: Math.floor(Math.random() * 50) + 5,
          revenue: Math.random() * 500 + 100,
          ctr: Math.random() * 2 + 0.5,
          cpm: Math.random() * 10 + 5,
          cpc: Math.random() * 2 + 0.5,
        },
        campaignId: campaign.id,
      },
    })
  }
  
  console.log(`✅ Created 7 days of sample insights`)
  
  // Create a sample recommendation
  const recommendation = await prisma.recommendation.create({
    data: {
      accountId: account.id,
      provider: 'meta',
      scopeType: 'campaign',
      scopeId: campaign.id,
      entityType: 'campaign', // Deprecated but kept
      entityId: campaign.id, // Deprecated but kept
      ruleKey: 'low-ctr-warning',
      playbookKey: 'ctr-optimization',
      ruleId: 'low-ctr-warning', // Deprecated
      playbookId: 'ctr-optimization', // Deprecated
      type: 'creative_fatigue',
      category: 'performance',
      priority: 'high',
      status: 'proposed',
      title: 'Low CTR Detected',
      description: 'Your campaign CTR is below the recommended threshold. Consider refreshing your creative.',
      estimatedImpact: {
        metric: 'ctr',
        current: 0.5,
        projected: 1.5,
        change: '+200%',
      },
      payload: {
        suggestedAction: {
          type: 'refresh_creative',
          description: 'Upload new creative assets to combat ad fatigue',
        },
        playbookId: 'ctr-optimization',
        ruleId: 'low-ctr-warning',
        aiExplanation: 'Based on the last 7 days of data, your click-through rate has been consistently below 0.5%, which is significantly lower than the industry average of 1.91% for your vertical.',
      },
      score: 85,
      confidence: 0.9,
    },
  })
  
  console.log(`✅ Created sample recommendation: ${recommendation.title}`)
  
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