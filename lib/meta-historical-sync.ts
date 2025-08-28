import { prisma } from '@/lib/prisma'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

const MAX_HISTORICAL_DAYS = 90 // Start with 90 days, can go up to 37 months
const META_API_VERSION = 'v21.0'

interface DailyMetrics {
  date: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  ctr: number
  cpc: number
  cpm: number
  reach?: number
  frequency?: number
  videoViews?: number
  video_p25_watched?: number
  video_p50_watched?: number
  video_p75_watched?: number
  video_p100_watched?: number
  engagement?: number
  outbound_clicks?: number
  landing_page_views?: number
  [key: string]: any
}

export async function fetchHistoricalAdData(
  adId: string,
  adExternalId: string,
  accessToken: string,
  accountId: string,
  daysBack: number = MAX_HISTORICAL_DAYS
) {
  try {
    const endDate = new Date()
    const startDate = subDays(endDate, daysBack)
    
    console.log(`Fetching ${daysBack} days of historical data for ad ${adExternalId}`)
    
    // Fetch daily breakdown from Meta API
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: [
        // Basic metrics
        'date_start', 'impressions', 'clicks', 'spend', 'cpc', 'cpm', 'ctr',
        // Engagement
        'actions', 'inline_link_clicks', 'inline_post_engagement', 'post_reactions',
        // Video metrics
        'video_play_actions', 'video_30_sec_watched_actions',
        'video_p25_watched_actions', 'video_p50_watched_actions',
        'video_p75_watched_actions', 'video_p100_watched_actions',
        'video_avg_time_watched_actions', 'cost_per_thruplay',
        // Quality
        'quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking',
        // Advanced
        'reach', 'frequency', 'unique_clicks', 'outbound_clicks',
        'landing_page_views', 'estimated_ad_recallers'
      ].join(','),
      time_range: JSON.stringify({
        since: format(startDate, 'yyyy-MM-dd'),
        until: format(endDate, 'yyyy-MM-dd')
      }),
      time_increment: '1', // Daily breakdown
      level: 'ad',
      filtering: JSON.stringify([{
        field: 'ad.id',
        operator: 'IN',
        value: [adExternalId]
      }])
    })
    
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/act_${adExternalId.split('_')[0]}/insights?${params.toString()}`
    )
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to fetch historical data')
    }
    
    const data = await response.json()
    const dailyMetrics: DailyMetrics[] = []
    
    // Process each day's data
    for (const dayData of data.data || []) {
      const date = dayData.date_start
      
      // Extract conversions from actions array
      let conversions = 0
      let videoViews = 0
      let engagement = 0
      
      if (dayData.actions && Array.isArray(dayData.actions)) {
        for (const action of dayData.actions) {
          if (action.action_type?.includes('conversion') || 
              action.action_type === 'purchase' ||
              action.action_type === 'lead') {
            conversions += parseInt(action.value) || 0
          }
          if (action.action_type === 'video_view') {
            videoViews += parseInt(action.value) || 0
          }
          if (action.action_type === 'post_engagement' || 
              action.action_type === 'page_engagement') {
            engagement += parseInt(action.value) || 0
          }
        }
      }
      
      const metrics: DailyMetrics = {
        date,
        impressions: parseInt(dayData.impressions || '0'),
        clicks: parseInt(dayData.clicks || '0'),
        spend: parseFloat(dayData.spend || '0'),
        conversions,
        ctr: parseFloat(dayData.ctr || '0'),
        cpc: parseFloat(dayData.cpc || '0'),
        cpm: parseFloat(dayData.cpm || '0'),
        reach: parseInt(dayData.reach || '0'),
        frequency: parseFloat(dayData.frequency || '0'),
        videoViews,
        engagement,
        outbound_clicks: parseInt(dayData.outbound_clicks?.[0]?.value || '0'),
        landing_page_views: parseInt(dayData.landing_page_views?.[0]?.value || '0'),
        // Video metrics
        video_p25_watched: parseInt(dayData.video_p25_watched_actions?.[0]?.value || '0'),
        video_p50_watched: parseInt(dayData.video_p50_watched_actions?.[0]?.value || '0'),
        video_p75_watched: parseInt(dayData.video_p75_watched_actions?.[0]?.value || '0'),
        video_p100_watched: parseInt(dayData.video_p100_watched_actions?.[0]?.value || '0'),
        // Quality rankings
        quality_ranking: dayData.quality_ranking,
        engagement_rate_ranking: dayData.engagement_rate_ranking,
        conversion_rate_ranking: dayData.conversion_rate_ranking,
        // Store raw actions for flexibility
        actions: dayData.actions
      }
      
      dailyMetrics.push(metrics)
    }
    
    // Store in database
    console.log(`Storing ${dailyMetrics.length} days of data for ad ${adId}`)
    
    for (const dayMetrics of dailyMetrics) {
      await prisma.insight.upsert({
        where: {
          accountId_provider_entityType_entityId_date_window: {
            accountId,
            provider: 'meta',
            entityType: 'ad',
            entityId: adId,
            date: new Date(dayMetrics.date),
            window: 'day'
          }
        },
        update: {
          metrics: dayMetrics,
          updatedAt: new Date()
        },
        create: {
          accountId,
          provider: 'meta',
          entityType: 'ad',
          entityId: adId,
          adId,
          date: new Date(dayMetrics.date),
          window: 'day',
          metrics: dayMetrics
        }
      })
    }
    
    return dailyMetrics
  } catch (error) {
    console.error(`Error fetching historical data for ad ${adExternalId}:`, error)
    throw error
  }
}

export async function fetchHistoricalDataForAllAds(
  accountId: string,
  accessToken: string,
  daysBack: number = 30
) {
  try {
    // Get all ads for this account
    const ads = await prisma.ad.findMany({
      where: {
        accountId,
        provider: 'meta'
      },
      select: {
        id: true,
        externalId: true,
        name: true
      }
    })
    
    console.log(`Fetching historical data for ${ads.length} ads`)
    
    const results = []
    for (const ad of ads) {
      try {
        const metrics = await fetchHistoricalAdData(
          ad.id,
          ad.externalId,
          accessToken,
          accountId,
          daysBack
        )
        results.push({ adId: ad.id, success: true, days: metrics.length })
      } catch (error) {
        console.error(`Failed to fetch data for ad ${ad.name}:`, error)
        results.push({ adId: ad.id, success: false, error })
      }
    }
    
    return results
  } catch (error) {
    console.error('Error fetching historical data for all ads:', error)
    throw error
  }
}

// Fetch data for a specific date range
export async function getAdMetricsForDateRange(
  adId: string,
  startDate: Date,
  endDate: Date
) {
  const insights = await prisma.insight.findMany({
    where: {
      adId,
      entityType: 'ad',
      date: {
        gte: startDate,
        lte: endDate
      },
      window: 'day'
    },
    orderBy: {
      date: 'asc'
    }
  })
  
  return insights.map(insight => ({
    date: insight.date,
    ...(insight.metrics as any)
  }))
}