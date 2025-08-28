import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

async function checkAdMetrics() {
  console.log('🔍 Searching for insights with populated metrics...\n')
  
  // Get all insights (campaigns, ads, ad groups)
  const allInsights = await prisma.insight.findMany({
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          externalId: true,
          provider: true,
          status: true
        }
      },
      ad: {
        select: {
          id: true,
          name: true,
          externalId: true,
          provider: true,
          status: true
        }
      },
      adGroup: {
        select: {
          id: true,
          name: true,
          externalId: true,
          provider: true,
          status: true
        }
      }
    },
    orderBy: {
      date: 'desc'
    },
    take: 100
  })

  console.log(`Found ${allInsights.length} total insights`)
  
  // Group insights by entity and analyze metrics
  const entityMetricsMap = new Map()
  
  for (const insight of allInsights) {
    const entityKey = `${insight.entityType}-${insight.entityId}`
    const metrics = insight.metrics as any
    
    let entity = null
    if (insight.entityType === 'campaign' && insight.campaign) {
      entity = insight.campaign
    } else if (insight.entityType === 'ad' && insight.ad) {
      entity = insight.ad
    } else if (insight.entityType === 'adGroup' && insight.adGroup) {
      entity = insight.adGroup
    }
    
    if (!entityMetricsMap.has(entityKey)) {
      entityMetricsMap.set(entityKey, {
        entityType: insight.entityType,
        entity: entity,
        insights: [],
        hasNonZeroMetrics: false,
        availableMetrics: new Set()
      })
    }
    
    const entityData = entityMetricsMap.get(entityKey)
    entityData.insights.push({
      date: insight.date,
      window: insight.window,
      metrics
    })
    
    // Check for non-zero metrics
    if (metrics && typeof metrics === 'object') {
      for (const [key, value] of Object.entries(metrics)) {
        entityData.availableMetrics.add(key)
        if (value !== null && value !== undefined && value !== 0 && value !== '0') {
          entityData.hasNonZeroMetrics = true
        }
      }
    }
  }

  console.log(`\n📊 Analysis of ${entityMetricsMap.size} unique entities:\n`)
  
  let entitiesWithData = 0
  let entitiesWithoutData = 0
  const allMetricsFound = new Set()
  
  for (const [entityKey, data] of entityMetricsMap) {
    if (data.hasNonZeroMetrics) {
      entitiesWithData++
      console.log(`✅ ${data.entityType.toUpperCase()}: ${data.entity?.name} (${data.entity?.provider})`)
      console.log(`   External ID: ${data.entity?.externalId}`)
      console.log(`   Status: ${data.entity?.status}`)
      console.log(`   Insights: ${data.insights.length}`)
      console.log(`   Available metrics: ${Array.from(data.availableMetrics).join(', ')}`)
      
      // Show sample metrics from latest insight
      const latestInsight = data.insights[0]
      console.log(`   Latest metrics (${latestInsight.date}):`)
      const metrics = latestInsight.metrics as any
      for (const [key, value] of Object.entries(metrics || {})) {
        if (value !== null && value !== undefined && value !== 0 && value !== '0') {
          console.log(`     ${key}: ${value}`)
        }
        allMetricsFound.add(key)
      }
      console.log('')
    } else {
      entitiesWithoutData++
    }
    
    // Add all metrics to the global set
    for (const metric of data.availableMetrics) {
      allMetricsFound.add(metric)
    }
  }
  
  console.log(`📈 Summary:`)
  console.log(`   Entities with non-zero data: ${entitiesWithData}`)
  console.log(`   Entities with only zero data: ${entitiesWithoutData}`)
  console.log(`   Total unique metrics found: ${allMetricsFound.size}`)
  console.log(`\n🏷️  All metrics found in database:`)
  console.log(`   ${Array.from(allMetricsFound).sort().join(', ')}`)
  
  // Look for specific metrics we're interested in
  const interestingMetrics = [
    'saves', 'link_clicks', 'video_plays', 'video_view_25', 'video_view_50', 
    'video_view_75', 'video_view_100', 'quality_ranking', 'engagement_rate_ranking',
    'conversion_rate_ranking', 'cost_per_unique_click', 'unique_clicks',
    'landing_page_views', 'post_engagements', 'post_comments', 'post_likes',
    'post_shares', 'page_likes', 'checkins'
  ]
  
  console.log(`\n🎯 Checking for specific metrics we're looking for:`)
  for (const metric of interestingMetrics) {
    const found = allMetricsFound.has(metric)
    console.log(`   ${metric}: ${found ? '✅' : '❌'}`)
  }
  
  await prisma.$disconnect()
}

checkAdMetrics().catch(console.error)