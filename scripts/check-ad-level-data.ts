import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

async function checkAdLevelData() {
  console.log('🔍 Searching for ad-level data and metadata...\n')
  
  // Check ads with creative metadata
  const adsWithCreative = await prisma.ad.findMany({
    where: {
      creative: { not: null }
    },
    select: {
      id: true,
      name: true,
      externalId: true,
      provider: true,
      status: true,
      creative: true,
      metadata: true,
      _count: {
        select: {
          insights: true
        }
      }
    },
    take: 10
  })
  
  console.log(`📎 Found ${adsWithCreative.length} ads with creative data:`)
  for (const ad of adsWithCreative) {
    console.log(`\n🎨 Ad: ${ad.name} (${ad.provider})`)
    console.log(`   External ID: ${ad.externalId}`)
    console.log(`   Status: ${ad.status}`)
    console.log(`   Insights: ${ad._count.insights}`)
    
    if (ad.creative) {
      console.log(`   Creative:`)
      const creative = ad.creative as any
      for (const [key, value] of Object.entries(creative)) {
        if (typeof value === 'string' && value.length > 100) {
          console.log(`     ${key}: ${value.substring(0, 100)}...`)
        } else {
          console.log(`     ${key}: ${value}`)
        }
      }
    }
    
    if (ad.metadata) {
      console.log(`   Metadata:`)
      const metadata = ad.metadata as any
      for (const [key, value] of Object.entries(metadata)) {
        console.log(`     ${key}: ${value}`)
      }
    }
  }
  
  // Check insights with detailed metrics breakdown
  const detailedInsights = await prisma.insight.findMany({
    where: {
      provider: 'meta'
    },
    select: {
      entityType: true,
      entityId: true,
      date: true,
      window: true,
      metrics: true,
      campaign: {
        select: { name: true, externalId: true }
      },
      ad: {
        select: { name: true, externalId: true }
      },
      adGroup: {
        select: { name: true, externalId: true }
      }
    },
    orderBy: {
      date: 'desc'
    },
    take: 20
  })
  
  console.log(`\n📊 Detailed analysis of ${detailedInsights.length} recent insights:`)
  
  const allMetrics = new Set()
  const metricsWithValues = new Map()
  
  for (const insight of detailedInsights) {
    const entityName = insight.campaign?.name || insight.ad?.name || insight.adGroup?.name || 'Unknown'
    const entityId = insight.campaign?.externalId || insight.ad?.externalId || insight.adGroup?.externalId || insight.entityId
    
    console.log(`\n📈 ${insight.entityType.toUpperCase()}: ${entityName}`)
    console.log(`   External ID: ${entityId}`)
    console.log(`   Date: ${insight.date}, Window: ${insight.window}`)
    
    const metrics = insight.metrics as any
    if (metrics && typeof metrics === 'object') {
      const metricEntries = Object.entries(metrics)
      console.log(`   Metrics (${metricEntries.length} total):`)
      
      for (const [key, value] of metricEntries) {
        allMetrics.add(key)
        
        if (value !== null && value !== undefined && value !== 0 && value !== '0') {
          if (!metricsWithValues.has(key)) {
            metricsWithValues.set(key, [])
          }
          metricsWithValues.get(key).push({ value, entityType: insight.entityType, entityName })
          console.log(`     ✅ ${key}: ${value}`)
        } else {
          console.log(`     ⭕ ${key}: ${value}`)
        }
      }
    }
  }
  
  console.log(`\n📋 Summary of all metrics found:`)
  console.log(`   Total unique metrics: ${allMetrics.size}`)
  console.log(`   Metrics with actual values: ${metricsWithValues.size}`)
  
  console.log(`\n📊 Metrics with non-zero values across entities:`)
  for (const [metric, values] of metricsWithValues) {
    const entityTypes = [...new Set(values.map(v => v.entityType))]
    const sampleValues = values.slice(0, 3).map(v => v.value).join(', ')
    console.log(`   ${metric}: Found in ${entityTypes.join(', ')} (sample values: ${sampleValues})`)
  }
  
  // Check for Meta-specific advanced metrics
  console.log(`\n🔍 Looking for advanced Meta metrics in raw data:`)
  const metaAdvancedMetrics = [
    'video_p25_watched_actions',
    'video_p50_watched_actions', 
    'video_p75_watched_actions',
    'video_p95_watched_actions',
    'video_p100_watched_actions',
    'video_play_actions',
    'video_thruplay_watched_actions',
    'quality_ranking',
    'engagement_rate_ranking',
    'conversion_rate_ranking',
    'cost_per_unique_click',
    'unique_clicks',
    'unique_link_clicks_ctr',
    'landing_page_views',
    'post_engagements',
    'post_reactions',
    'comment',
    'like',
    'share',
    'page_engagement',
    'checkin'
  ]
  
  for (const metric of metaAdvancedMetrics) {
    const found = allMetrics.has(metric) || metricsWithValues.has(metric)
    console.log(`   ${metric}: ${found ? '✅' : '❌'}`)
  }
  
  await prisma.$disconnect()
}

checkAdLevelData().catch(console.error)