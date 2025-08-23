import { PrismaClient } from '@prisma/client'

/**
 * Fetches historical insights for a given time period
 * Used when initially connecting an account to pull historical data
 */
export async function fetchHistoricalInsights(
  prisma: PrismaClient,
  accountId: string,
  adAccountId: string,
  accessToken: string,
  daysBack: number = 365 // Default to 1 year
) {
  console.log(`📊 Fetching ${daysBack} days of historical insights for account ${adAccountId}`)
  
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  
  // Meta API has limits on how far back we can fetch
  // Maximum is typically 37 months, but we'll limit to 1 year for practicality
  const maxDaysBack = 365
  if (daysBack > maxDaysBack) {
    daysBack = maxDaysBack
    startDate.setDate(endDate.getDate() - maxDaysBack)
  }
  
  // Fetch in chunks to avoid API limits
  // Meta recommends fetching no more than 90 days at a time for detailed data
  const chunkSizeDays = 30
  let currentStart = new Date(startDate)
  let totalInsights = 0
  
  while (currentStart < endDate) {
    const currentEnd = new Date(currentStart)
    currentEnd.setDate(currentEnd.getDate() + chunkSizeDays)
    
    if (currentEnd > endDate) {
      currentEnd.setTime(endDate.getTime())
    }
    
    const timeRange = `{'since':'${currentStart.toISOString().split('T')[0]}','until':'${currentEnd.toISOString().split('T')[0]}'}`
    
    try {
      // Fetch campaign insights with daily breakdown
      const campaignInsightsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` + new URLSearchParams({
        access_token: accessToken,
        level: 'campaign',
        fields: 'campaign_id,impressions,clicks,spend,cpc,cpm,ctr,actions,inline_link_clicks,inline_post_engagement,conversions,purchase_roas',
        time_range: timeRange,
        time_increment: '1', // Daily breakdown
        limit: '500'
      })
      
      const response = await fetch(campaignInsightsUrl)
      const data = await response.json()
      
      if (data.error) {
        console.error(`Error fetching insights for period ${currentStart.toISOString().split('T')[0]} to ${currentEnd.toISOString().split('T')[0]}: ${data.error.message}`)
        // Continue with next chunk
      } else if (data.data) {
        for (const insight of data.data) {
          // Find the campaign
          const campaign = await prisma.campaign.findFirst({
            where: {
              accountId,
              provider: 'meta',
              externalId: insight.campaign_id
            }
          })
          
          if (!campaign) continue
          
          const insightDate = new Date(insight.date_start)
          
          // Extract engagement metrics from actions
          let likes = 0, comments = 0, shares = 0, saves = 0, videoViews = 0
          if (insight.actions && Array.isArray(insight.actions)) {
            for (const action of insight.actions) {
              switch (action.action_type) {
                case 'like':
                case 'post_reaction':
                  likes += parseInt(action.value) || 0
                  break
                case 'comment':
                  comments += parseInt(action.value) || 0
                  break
                case 'post':
                case 'share':
                  shares += parseInt(action.value) || 0
                  break
                case 'save':
                case 'onsite_conversion.post_save':
                  saves += parseInt(action.value) || 0
                  break
                case 'video_view':
                  videoViews += parseInt(action.value) || 0
                  break
              }
            }
          }
          
          // Store in Insight table
          await prisma.insight.upsert({
            where: {
              accountId_provider_entityType_entityId_date_window: {
                accountId,
                provider: 'meta',
                entityType: 'campaign',
                entityId: campaign.id,
                date: insightDate,
                window: '1d'
              }
            },
            update: {
              metrics: {
                impressions: parseInt(insight.impressions || '0'),
                clicks: parseInt(insight.clicks || '0'),
                spend: parseFloat(insight.spend || '0') / 100, // Convert from cents
                ctr: parseFloat(insight.ctr || '0'),
                cpc: parseFloat(insight.cpc || '0') / 100,
                cpm: parseFloat(insight.cpm || '0') / 100,
                likes,
                comments,
                shares,
                saves,
                videoViews,
                inlineLinkClicks: parseInt(insight.inline_link_clicks || '0'),
                inlinePostEngagement: parseInt(insight.inline_post_engagement || '0'),
                conversions: parseInt(insight.conversions || '0'),
                purchaseRoas: insight.purchase_roas ? parseFloat(insight.purchase_roas[0]?.value || '0') : 0,
                dateStart: insight.date_start,
                dateStop: insight.date_stop
              },
              updatedAt: new Date()
            },
            create: {
              accountId,
              provider: 'meta',
              entityType: 'campaign',
              entityId: campaign.id,
              campaignId: campaign.id,
              date: insightDate,
              window: '1d',
              metrics: {
                impressions: parseInt(insight.impressions || '0'),
                clicks: parseInt(insight.clicks || '0'),
                spend: parseFloat(insight.spend || '0') / 100,
                ctr: parseFloat(insight.ctr || '0'),
                cpc: parseFloat(insight.cpc || '0') / 100,
                cpm: parseFloat(insight.cpm || '0') / 100,
                likes,
                comments,
                shares,
                saves,
                videoViews,
                inlineLinkClicks: parseInt(insight.inline_link_clicks || '0'),
                inlinePostEngagement: parseInt(insight.inline_post_engagement || '0'),
                conversions: parseInt(insight.conversions || '0'),
                purchaseRoas: insight.purchase_roas ? parseFloat(insight.purchase_roas[0]?.value || '0') : 0,
                dateStart: insight.date_start,
                dateStop: insight.date_stop
              }
            }
          })
          totalInsights++
        }
      }
      
      // Also fetch ad-level insights
      const adInsightsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` + new URLSearchParams({
        access_token: accessToken,
        level: 'ad',
        fields: 'ad_id,campaign_id,adset_id,impressions,clicks,spend,cpc,cpm,ctr,actions',
        time_range: timeRange,
        time_increment: '1',
        limit: '500'
      })
      
      const adResponse = await fetch(adInsightsUrl)
      const adData = await adResponse.json()
      
      if (adData.data) {
        for (const insight of adData.data) {
          const ad = await prisma.ad.findFirst({
            where: {
              accountId,
              provider: 'meta',
              externalId: insight.ad_id
            }
          })
          
          if (!ad) continue
          
          const insightDate = new Date(insight.date_start)
          
          // Extract engagement metrics
          let likes = 0, comments = 0, shares = 0, saves = 0, videoViews = 0
          if (insight.actions && Array.isArray(insight.actions)) {
            for (const action of insight.actions) {
              switch (action.action_type) {
                case 'like':
                case 'post_reaction':
                  likes += parseInt(action.value) || 0
                  break
                case 'comment':
                  comments += parseInt(action.value) || 0
                  break
                case 'post':
                case 'share':
                  shares += parseInt(action.value) || 0
                  break
                case 'save':
                case 'onsite_conversion.post_save':
                  saves += parseInt(action.value) || 0
                  break
                case 'video_view':
                  videoViews += parseInt(action.value) || 0
                  break
              }
            }
          }
          
          await prisma.insight.upsert({
            where: {
              accountId_provider_entityType_entityId_date_window: {
                accountId,
                provider: 'meta',
                entityType: 'ad',
                entityId: ad.id,
                date: insightDate,
                window: '1d'
              }
            },
            update: {
              metrics: {
                impressions: parseInt(insight.impressions || '0'),
                clicks: parseInt(insight.clicks || '0'),
                spend: parseFloat(insight.spend || '0') / 100,
                ctr: parseFloat(insight.ctr || '0'),
                cpc: parseFloat(insight.cpc || '0') / 100,
                cpm: parseFloat(insight.cpm || '0') / 100,
                likes,
                comments,
                shares,
                saves,
                videoViews,
                dateStart: insight.date_start,
                dateStop: insight.date_stop
              },
              updatedAt: new Date()
            },
            create: {
              accountId,
              provider: 'meta',
              entityType: 'ad',
              entityId: ad.id,
              adId: ad.id,
              campaignId: ad.campaignId,
              adGroupId: ad.adGroupId,
              date: insightDate,
              window: '1d',
              metrics: {
                impressions: parseInt(insight.impressions || '0'),
                clicks: parseInt(insight.clicks || '0'),
                spend: parseFloat(insight.spend || '0') / 100,
                ctr: parseFloat(insight.ctr || '0'),
                cpc: parseFloat(insight.cpc || '0') / 100,
                cpm: parseFloat(insight.cpm || '0') / 100,
                likes,
                comments,
                shares,
                saves,
                videoViews,
                dateStart: insight.date_start,
                dateStop: insight.date_stop
              }
            }
          })
          totalInsights++
        }
      }
      
    } catch (error) {
      console.error(`Error fetching insights for chunk: ${error}`)
    }
    
    // Move to next chunk
    currentStart.setDate(currentStart.getDate() + chunkSizeDays + 1)
  }
  
  console.log(`✅ Fetched ${totalInsights} historical insight records`)
  return totalInsights
}

/**
 * Get historical insights for graphing
 */
export async function getHistoricalInsights(
  prisma: PrismaClient,
  entityId: string,
  entityType: 'campaign' | 'ad' | 'adgroup',
  daysBack: number = 30
) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  
  const insights = await prisma.insight.findMany({
    where: {
      entityId,
      entityType,
      date: {
        gte: startDate
      },
      window: '1d' // Daily data for graphing
    },
    orderBy: {
      date: 'asc'
    }
  })
  
  return insights.map(insight => ({
    date: insight.date,
    metrics: insight.metrics as any
  }))
}