import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

async function checkRawMetadata() {
  console.log('🔍 Examining raw metadata for advanced metrics...\n')
  
  // Check ads with metadata that might contain insights
  const adsWithMetadata = await prisma.ad.findMany({
    where: {
      metadata: { not: null }
    },
    select: {
      id: true,
      name: true,
      externalId: true,
      metadata: true
    },
    take: 5
  })
  
  console.log(`📋 Examining metadata from ${adsWithMetadata.length} ads:`)
  
  for (const ad of adsWithMetadata) {
    console.log(`\n🎯 Ad: ${ad.name} (${ad.externalId})`)
    const metadata = ad.metadata as any
    
    if (metadata?.insights) {
      console.log(`   📊 Raw insights data found:`)
      const insights = metadata.insights
      
      if (Array.isArray(insights.data) && insights.data.length > 0) {
        const latestInsight = insights.data[0]
        console.log(`   📈 Latest insight keys: ${Object.keys(latestInsight).join(', ')}`)
        
        // Look for advanced metrics in the raw data
        const advancedMetrics = [
          'actions',
          'video_30_second_watched_actions',
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
          'canvas_avg_view_percent',
          'canvas_avg_view_time'
        ]
        
        for (const metric of advancedMetrics) {
          if (latestInsight[metric] !== undefined) {
            console.log(`     ✅ ${metric}: ${JSON.stringify(latestInsight[metric])}`)
          }
        }
        
        // Show actions array if it exists
        if (latestInsight.actions && Array.isArray(latestInsight.actions)) {
          console.log(`   🎬 Actions found (${latestInsight.actions.length}):`)
          for (const action of latestInsight.actions.slice(0, 10)) { // Show first 10
            console.log(`     - ${action.action_type}: ${action.value}`)
          }
        }
        
        // Show all available fields in the insight
        console.log(`   🗂️  All fields in raw insight:`)
        const allFields = Object.keys(latestInsight).sort()
        const chunks = []
        for (let i = 0; i < allFields.length; i += 8) {
          chunks.push(allFields.slice(i, i + 8))
        }
        for (const chunk of chunks) {
          console.log(`     ${chunk.join(', ')}`)
        }
        
      } else {
        console.log(`   ⚠️  No insight data array found`)
      }
    }
    
    // Check rawData field
    if (metadata?.rawData) {
      console.log(`   📦 Raw data structure:`)
      const rawData = metadata.rawData
      console.log(`     Keys: ${Object.keys(rawData).join(', ')}`)
      
      if (rawData.insights) {
        console.log(`     📊 Insights in rawData:`)
        console.log(`       Keys: ${Object.keys(rawData.insights).join(', ')}`)
        
        if (rawData.insights.data && Array.isArray(rawData.insights.data)) {
          console.log(`       Data entries: ${rawData.insights.data.length}`)
          
          if (rawData.insights.data.length > 0) {
            const firstInsight = rawData.insights.data[0]
            console.log(`       First insight fields: ${Object.keys(firstInsight).sort().join(', ')}`)
            
            // Check for video metrics
            const videoMetrics = Object.keys(firstInsight).filter(key => 
              key.includes('video') || key.includes('play') || key.includes('view')
            )
            if (videoMetrics.length > 0) {
              console.log(`       📹 Video metrics found: ${videoMetrics.join(', ')}`)
              for (const metric of videoMetrics) {
                console.log(`         ${metric}: ${JSON.stringify(firstInsight[metric])}`)
              }
            }
            
            // Check for engagement metrics
            const engagementMetrics = Object.keys(firstInsight).filter(key => 
              key.includes('engagement') || key.includes('reaction') || key.includes('like') || 
              key.includes('comment') || key.includes('share') || key.includes('save')
            )
            if (engagementMetrics.length > 0) {
              console.log(`       👍 Engagement metrics found: ${engagementMetrics.join(', ')}`)
              for (const metric of engagementMetrics) {
                console.log(`         ${metric}: ${JSON.stringify(firstInsight[metric])}`)
              }
            }
            
            // Check for quality metrics
            const qualityMetrics = Object.keys(firstInsight).filter(key => 
              key.includes('ranking') || key.includes('quality') || key.includes('relevance')
            )
            if (qualityMetrics.length > 0) {
              console.log(`       🏆 Quality metrics found: ${qualityMetrics.join(', ')}`)
              for (const metric of qualityMetrics) {
                console.log(`         ${metric}: ${JSON.stringify(firstInsight[metric])}`)
              }
            }
          }
        }
      }
    }
  }
  
  await prisma.$disconnect()
}

checkRawMetadata().catch(console.error)