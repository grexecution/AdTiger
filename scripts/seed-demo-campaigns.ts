import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_CAMPAIGNS = [
  {
    name: "Summer Sale Campaign",
    objective: "conversions",
    budgetAmount: 1000,
    adGroups: [
      {
        name: "Target Audience 25-34",
        budgetAmount: 500,
        ads: [
          { name: "Summer Sale Creative A" },
          { name: "Summer Sale Video Creative" },
          { name: "Summer Sale Carousel" }
        ]
      },
      {
        name: "Target Audience 35-44", 
        budgetAmount: 300,
        ads: [
          { name: "Premium Collection Ad" },
          { name: "Discount Banner Creative" }
        ]
      }
    ]
  },
  {
    name: "Holiday Collection Campaign",
    objective: "link_clicks",
    budgetAmount: 1500,
    adGroups: [
      {
        name: "Holiday Shoppers",
        budgetAmount: 800,
        ads: [
          { name: "Holiday Video Ad" },
          { name: "Gift Guide Carousel" },
          { name: "Festive Collection Image" },
          { name: "Limited Time Offer Creative" }
        ]
      },
      {
        name: "Last Minute Gifts",
        budgetAmount: 700,
        ads: [
          { name: "Express Delivery Ad" },
          { name: "Quick Gift Solutions" },
          { name: "Same Day Pickup Creative" }
        ]
      }
    ]
  },
  {
    name: "Brand Awareness Campaign",
    objective: "reach",
    budgetAmount: 800,
    adGroups: [
      {
        name: "Broad Audience",
        budgetAmount: 500,
        ads: [
          { name: "Brand Story Video" },
          { name: "Company Values Creative" },
          { name: "Behind The Scenes" }
        ]
      },
      {
        name: "Lookalike Audience",
        budgetAmount: 300,
        ads: [
          { name: "Customer Testimonial" },
          { name: "Product Showcase" }
        ]
      }
    ]
  },
  {
    name: "Retargeting Campaign",
    objective: "conversions", 
    budgetAmount: 600,
    adGroups: [
      {
        name: "Website Visitors",
        budgetAmount: 400,
        ads: [
          { name: "Cart Abandonment Creative" },
          { name: "Product Reminder Ad" },
          { name: "Special Offer Video" }
        ]
      },
      {
        name: "App Users",
        budgetAmount: 200,
        ads: [
          { name: "Re-engagement Creative" },
          { name: "New Feature Announcement" }
        ]
      }
    ]
  }
]

// Generate random metrics for insights
const generateMetrics = () => ({
  impressions: Math.floor(Math.random() * 50000) + 10000,
  clicks: Math.floor(Math.random() * 2000) + 100,
  spend: Math.random() * 300 + 50,
  conversions: Math.floor(Math.random() * 100) + 5,
  revenue: Math.random() * 1000 + 200,
  ctr: Math.random() * 3 + 0.5,
  cpm: Math.random() * 20 + 5,
  cpc: Math.random() * 3 + 0.3,
  roas: Math.random() * 6 + 1
})

const AD_STATUSES = ['active', 'paused', 'deleted']
const getRandomStatus = () => AD_STATUSES[Math.floor(Math.random() * AD_STATUSES.length)]

async function seedDemoCampaigns() {
  console.log('🌱 Seeding demo campaigns...')
  
  // Get the test account
  const account = await prisma.account.findFirst({
    where: { name: 'Acme Marketing Agency' }
  })
  
  if (!account) {
    throw new Error('Test account not found. Run the main seed first.')
  }
  
  // Get existing ad account
  const adAccount = await prisma.adAccount.findFirst({
    where: { accountId: account.id }
  })
  
  if (!adAccount) {
    throw new Error('Ad account not found. Run the main seed first.')
  }
  
  // Clear existing campaigns (except the original one) to avoid duplicates
  await prisma.insight.deleteMany({
    where: { accountId: account.id }
  })
  
  await prisma.ad.deleteMany({
    where: { accountId: account.id }
  })
  
  await prisma.adGroup.deleteMany({
    where: { accountId: account.id }
  })
  
  await prisma.campaign.deleteMany({
    where: { accountId: account.id }
  })
  
  console.log('🗑️  Cleared existing campaign data')
  
  // Create campaigns with ad groups and ads
  for (const [campaignIndex, campaignData] of DEMO_CAMPAIGNS.entries()) {
    console.log(`📋 Creating campaign: ${campaignData.name}`)
    
    const campaign = await prisma.campaign.create({
      data: {
        accountId: account.id,
        adAccountId: adAccount.id,
        provider: 'meta',
        externalId: `campaign_demo_${campaignIndex + 1}`,
        name: campaignData.name,
        status: campaignIndex === 0 ? 'active' : getRandomStatus(),
        objective: campaignData.objective,
        budgetAmount: campaignData.budgetAmount,
        budgetCurrency: 'USD',
      }
    })
    
    // Create insights for the campaign (last 7 days)
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      await prisma.insight.create({
        data: {
          accountId: account.id,
          provider: 'meta',
          entityType: 'campaign',
          entityId: campaign.id,
          date: date,
          window: 'day',
          metrics: generateMetrics(),
          campaignId: campaign.id,
        }
      })
    }
    
    // Create ad groups for this campaign
    for (const [adGroupIndex, adGroupData] of campaignData.adGroups.entries()) {
      console.log(`  📁 Creating ad group: ${adGroupData.name}`)
      
      const adGroup = await prisma.adGroup.create({
        data: {
          accountId: account.id,
          campaignId: campaign.id,
          provider: 'meta',
          externalId: `adset_demo_${campaignIndex + 1}_${adGroupIndex + 1}`,
          name: adGroupData.name,
          status: getRandomStatus(),
          budgetAmount: adGroupData.budgetAmount,
          budgetCurrency: 'USD',
        }
      })
      
      // Create ads for this ad group
      for (const [adIndex, adData] of adGroupData.ads.entries()) {
        console.log(`    🎨 Creating ad: ${adData.name}`)
        
        // Generate creative data based on ad name
        const isVideo = adData.name.toLowerCase().includes('video')
        const isCarousel = adData.name.toLowerCase().includes('carousel')
        
        await prisma.ad.create({
          data: {
            accountId: account.id,
            adGroupId: adGroup.id,
            provider: 'meta',
            externalId: `ad_demo_${campaignIndex + 1}_${adGroupIndex + 1}_${adIndex + 1}`,
            name: adData.name,
            status: getRandomStatus(),
            creative: {
              headline: isVideo ? 'Watch Our Latest Video!' : 
                       isCarousel ? 'Swipe to See More' : 
                       'Limited Time Offer!',
              body: isVideo ? 'See our products in action with this engaging video.' :
                    isCarousel ? 'Browse through our complete collection.' :
                    'Don\'t miss out on this amazing deal!',
              imageUrl: `https://picsum.photos/800/600?random=${campaignIndex}${adGroupIndex}${adIndex}`,
              type: isVideo ? 'video' : isCarousel ? 'carousel' : 'image',
            },
            metadata: {
              platform: Math.random() > 0.5 ? 'facebook' : 'instagram',
              format: isVideo ? 'video' : isCarousel ? 'carousel' : 'single_image',
              createdFrom: 'demo_seed'
            }
          }
        })
      }
    }
  }
  
  console.log('✅ Demo campaigns seeded successfully!')
  console.log(`📊 Created ${DEMO_CAMPAIGNS.length} campaigns with multiple ad groups and ads`)
}

async function main() {
  try {
    await seedDemoCampaigns()
  } catch (error) {
    console.error('❌ Demo seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()