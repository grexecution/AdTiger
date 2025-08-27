import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAdData() {
  // Find ads with "Zahnarzt" in the name
  const ads = await prisma.ad.findMany({
    where: {
      name: {
        contains: 'Zahnarzt'
      }
    },
    include: {
      adGroup: {
        include: {
          campaign: true
        }
      },
      insights: {
        orderBy: {
          date: 'desc'
        },
        take: 1
      }
    }
  })
  
  console.log(`Found ${ads.length} ads with "Zahnarzt" in name\n`)
  
  for (const ad of ads) {
    const metadata = ad.metadata as any
    const latestInsight = ad.insights[0]
    
    console.log('='.repeat(60))
    console.log(`Ad: ${ad.name}`)
    console.log(`Campaign: ${ad.adGroup.campaign.name}`)
    console.log(`Ad ID: ${ad.id}`)
    console.log(`External ID: ${ad.externalId}`)
    console.log('-'.repeat(60))
    
    // Check metadata insights
    if (metadata?.insights) {
      console.log('Metadata Insights:')
      console.log(`  Impressions: ${metadata.insights.impressions || 0}`)
      console.log(`  Clicks: ${metadata.insights.clicks || 0}`)
      console.log(`  Spend: ${metadata.insights.spend || 0}`)
      console.log(`  CPC: ${metadata.insights.cpc || 0}`)
      console.log(`  CTR: ${metadata.insights.ctr || 0}`)
      console.log(`  Conversions: ${metadata.insights.conversions || 0}`)
      
      // Calculate CPC if we have data
      if (metadata.insights.clicks > 0 && metadata.insights.spend > 0) {
        const calculatedCPC = metadata.insights.spend / metadata.insights.clicks
        console.log(`  Calculated CPC: ${calculatedCPC.toFixed(2)}`)
      }
    } else {
      console.log('No metadata insights found')
    }
    
    // Check insights table
    if (latestInsight) {
      const insightMetrics = latestInsight.metrics as any
      console.log('\nInsights Table Entry:')
      console.log(`  Date: ${latestInsight.date}`)
      console.log(`  Metrics: ${JSON.stringify(insightMetrics, null, 2)}`)
    } else {
      console.log('\nNo insights table entry found')
    }
    
    console.log()
  }
  
  // Also check for ads with high clicks but potentially zero spend
  console.log('\n' + '='.repeat(60))
  console.log('Checking for ads with clicks but zero/missing spend:')
  console.log('='.repeat(60))
  
  const adsWithClicks = await prisma.ad.findMany({
    where: {
      metadata: {
        path: ['insights', 'clicks'],
        gt: 0
      }
    },
    take: 10
  })
  
  for (const ad of adsWithClicks) {
    const metadata = ad.metadata as any
    const insights = metadata?.insights
    if (insights && insights.clicks > 0) {
      const spend = insights.spend || 0
      const cpc = insights.cpc || 0
      if (spend === 0 && cpc === 0) {
        console.log(`⚠️ Ad "${ad.name}": ${insights.clicks} clicks, but spend=${spend}, cpc=${cpc}`)
      }
    }
  }
}

checkAdData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())