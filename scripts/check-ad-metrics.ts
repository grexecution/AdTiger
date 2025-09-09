import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAdMetrics() {
  // Find the specific ad
  const ad = await prisma.ad.findFirst({
    where: {
      name: {
        contains: 'Awareness Ad 1a'
      }
    },
    include: {
      insights: {
        orderBy: {
          date: 'desc'
        },
        take: 5
      }
    }
  })
  
  if (!ad) {
    console.log('Ad "Awareness Ad 1a" not found')
    await prisma.$disconnect()
    return
  }
  
  console.log(`\n📊 Ad: ${ad.name}`)
  console.log(`ID: ${ad.id}`)
  console.log(`Status: ${ad.status}`)
  console.log(`Provider: ${ad.provider}`)
  
  // Check metadata for any additional metrics
  const metadata = ad.metadata as any
  console.log('\n📈 Ad Metadata:')
  if (metadata) {
    console.log(`  Has metadata: Yes`)
    console.log(`  Metadata keys: ${Object.keys(metadata).join(', ')}`)
    if (metadata?.insights) {
      console.log('\n📊 Metadata Insights:')
      console.log(JSON.stringify(metadata.insights, null, 2))
    }
  } else {
    console.log(`  Has metadata: No`)
  }
  
  // Check related insights records
  console.log(`\n📅 Latest Insights Records (${ad.insights.length} total):`)
  if (ad.insights.length === 0) {
    console.log('  No insights records found')
  } else {
    ad.insights.forEach(insight => {
      console.log(`\n  Date: ${insight.date.toISOString().split('T')[0]}`)
      console.log(`    Impressions: ${insight.impressions}`)
      console.log(`    Clicks: ${insight.clicks}`)
      console.log(`    Spend: ${insight.spend}`)
      console.log(`    Conversions: ${insight.conversions}`)
      console.log(`    CTR: ${insight.ctr}`)
      console.log(`    CPC: ${insight.cpc}`)
      console.log(`    CPM: ${insight.cpm}`)
    })
  }
  
  // Check parent ad group metrics
  const adGroup = await prisma.adGroup.findFirst({
    where: {
      ads: {
        some: {
          id: ad.id
        }
      }
    },
    include: {
      insights: {
        orderBy: {
          date: 'desc'
        },
        take: 1
      }
    }
  })
  
  if (adGroup) {
    console.log(`\n📁 Parent Ad Group: ${adGroup.name}`)
    if (adGroup.insights.length > 0) {
      const latestInsight = adGroup.insights[0]
      console.log(`  Latest Ad Group Metrics (${latestInsight.date.toISOString().split('T')[0]}):`)
      console.log(`    Impressions: ${latestInsight.impressions}`)
      console.log(`    Clicks: ${latestInsight.clicks}`)
      console.log(`    Spend: ${latestInsight.spend}`)
    } else {
      console.log(`  No insights data for ad group`)
    }
  }
  
  // Check if there are other similar ads with their insights
  const similarAds = await prisma.ad.findMany({
    where: {
      name: {
        contains: 'Awareness Ad'
      }
    },
    select: {
      name: true,
      status: true,
      insights: {
        orderBy: {
          date: 'desc'
        },
        take: 1
      }
    }
  })
  
  console.log(`\n🔍 Similar "Awareness Ad" variants:`)
  similarAds.forEach(similar => {
    console.log(`  ${similar.name}:`)
    console.log(`    Status: ${similar.status}`)
    if (similar.insights.length > 0) {
      const insight = similar.insights[0]
      console.log(`    Latest metrics: Impressions: ${insight.impressions}, Clicks: ${insight.clicks}, Spend: $${insight.spend}`)
    } else {
      console.log(`    No insights data`)
    }
  })
  
  await prisma.$disconnect()
}

checkAdMetrics().catch(console.error)