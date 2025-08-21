import { Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { InsightsSyncJobData } from '@/lib/queue/queues'
import { META_API_VERSION } from '@/lib/meta-auth'
import { format, subDays, addDays, differenceInDays } from 'date-fns'

const BATCH_SIZE = 50 // Process insights in batches
const MAX_DATE_RANGE = 90 // Meta API limitation

export async function syncMetaInsights(job: Job<InsightsSyncJobData>) {
  const { accountId, adAccountId, provider, level, dateRange, syncType } = job.data
  
  try {
    job.log(`Starting ${syncType} insights sync for ${level} level`)
    
    // Get provider connection
    const connection = await prisma.providerConnection.findFirst({
      where: {
        accountId,
        provider: 'meta',
        isActive: true,
      },
    })
    
    if (!connection || !connection.accessToken) {
      throw new Error('No active Meta connection found')
    }
    
    // Get the ad account
    const adAccount = await prisma.adAccount.findUnique({
      where: { id: adAccountId },
    })
    
    if (!adAccount) {
      throw new Error('Ad account not found')
    }
    
    // Calculate date ranges to sync
    const dateRanges = splitDateRange(dateRange.start, dateRange.end)
    let totalInsights = 0
    let progress = 0
    
    for (const range of dateRanges) {
      await job.updateProgress((progress / dateRanges.length) * 100)
      job.log(`Syncing insights for ${range.start} to ${range.end}`)
      
      // Fetch insights based on level
      const insights = await fetchInsightsByLevel(
        connection.accessToken,
        adAccount.externalId,
        level,
        range,
        accountId
      )
      
      // Batch upsert insights
      for (let i = 0; i < insights.length; i += BATCH_SIZE) {
        const batch = insights.slice(i, i + BATCH_SIZE)
        
        await Promise.all(
          batch.map(async (insight) => {
            await prisma.insight.upsert({
              where: {
                accountId_provider_entityType_entityId_date_window: {
                  accountId,
                  provider: 'meta',
                  entityType: level,
                  entityId: insight.entityId,
                  date: new Date(insight.date),
                  window: 'day',
                },
              },
              update: {
                metrics: insight.metrics,
                updatedAt: new Date(),
              },
              create: {
                accountId,
                provider: 'meta',
                entityType: level,
                entityId: insight.entityId,
                date: new Date(insight.date),
                window: 'day',
                metrics: insight.metrics,
                // Link to specific entities
                adAccountId: level === 'account' ? adAccountId : undefined,
                campaignId: insight.campaignId,
                adGroupId: insight.adGroupId,
                adId: insight.adId,
              },
            })
          })
        )
        
        totalInsights += batch.length
      }
      
      progress++
    }
    
    await job.updateProgress(100)
    job.log(`Synced ${totalInsights} insights records`)
    
    return {
      success: true,
      totalInsights,
      level,
      dateRange,
      timestamp: new Date().toISOString(),
    }
    
  } catch (error) {
    job.log(`Error syncing insights: ${error}`)
    throw error
  }
}

async function fetchInsightsByLevel(
  accessToken: string,
  adAccountId: string,
  level: string,
  dateRange: { start: string; end: string },
  accountId: string
) {
  const insights: any[] = []
  
  // Build the insights API URL based on level
  let endpoint = ''
  let entityMap = new Map()
  
  switch (level) {
    case 'account':
      endpoint = `act_${adAccountId}/insights`
      break
    case 'campaign':
      // First get all campaigns
      const campaigns = await prisma.campaign.findMany({
        where: { accountId, provider: 'meta' },
        select: { id: true, externalId: true },
      })
      campaigns.forEach(c => entityMap.set(c.externalId, c.id))
      endpoint = `act_${adAccountId}/insights`
      break
    case 'adset':
      // First get all ad groups
      const adGroups = await prisma.adGroup.findMany({
        where: { accountId, provider: 'meta' },
        select: { id: true, externalId: true, campaignId: true },
      })
      adGroups.forEach(a => entityMap.set(a.externalId, a))
      endpoint = `act_${adAccountId}/insights`
      break
    case 'ad':
      // First get all ads
      const ads = await prisma.ad.findMany({
        where: { accountId, provider: 'meta' },
        select: { id: true, externalId: true, adGroupId: true },
      })
      ads.forEach(a => entityMap.set(a.externalId, a))
      endpoint = `act_${adAccountId}/insights`
      break
  }
  
  // Fetch insights from Meta API
  const params = new URLSearchParams({
    level: level === 'adset' ? 'adset' : level,
    fields: [
      'impressions',
      'clicks',
      'spend',
      'ctr',
      'cpm',
      'cpc',
      'conversions',
      'conversion_rate',
      'cost_per_conversion',
      'purchase_roas',
      'frequency',
      'reach',
      'account_id',
      'campaign_id',
      'adset_id',
      'ad_id',
      'date_start',
      'date_stop',
    ].join(','),
    time_range: JSON.stringify({
      since: dateRange.start,
      until: dateRange.end,
    }),
    time_increment: '1', // Daily breakdown
    limit: '500',
    access_token: accessToken,
  })
  
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${endpoint}?${params.toString()}`
  )
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to fetch insights')
  }
  
  const data = await response.json()
  
  // Process and format insights
  for (const item of data.data || []) {
    // Determine entity IDs based on level
    let entityId = ''
    let campaignId = undefined
    let adGroupId = undefined
    let adId = undefined
    
    switch (level) {
      case 'account':
        entityId = adAccountId
        break
      case 'campaign':
        entityId = entityMap.get(item.campaign_id)
        campaignId = entityId
        break
      case 'adset':
        const adGroup = entityMap.get(item.adset_id)
        if (adGroup) {
          entityId = adGroup.id
          campaignId = adGroup.campaignId
          adGroupId = adGroup.id
        }
        break
      case 'ad':
        const ad = entityMap.get(item.ad_id)
        if (ad) {
          entityId = ad.id
          adId = ad.id
          adGroupId = ad.adGroupId
          // Get campaign from ad group
          const adGroupForCampaign = await prisma.adGroup.findUnique({
            where: { id: ad.adGroupId },
            select: { campaignId: true },
          })
          campaignId = adGroupForCampaign?.campaignId
        }
        break
    }
    
    if (entityId) {
      insights.push({
        entityId,
        campaignId,
        adGroupId,
        adId,
        date: item.date_start,
        metrics: {
          impressions: parseInt(item.impressions || '0'),
          clicks: parseInt(item.clicks || '0'),
          spend: parseFloat(item.spend || '0'),
          ctr: parseFloat(item.ctr || '0'),
          cpm: parseFloat(item.cpm || '0'),
          cpc: parseFloat(item.cpc || '0'),
          conversions: parseInt(item.conversions?.[0]?.value || '0'),
          conversionRate: parseFloat(item.conversion_rate || '0'),
          costPerConversion: parseFloat(item.cost_per_conversion || '0'),
          roas: parseFloat(item.purchase_roas?.[0]?.value || '0'),
          frequency: parseFloat(item.frequency || '0'),
          reach: parseInt(item.reach || '0'),
        },
      })
    }
  }
  
  // Handle pagination if needed
  if (data.paging?.next) {
    // For simplicity, we'll limit to first page in this example
    // In production, implement proper pagination handling
    console.log('Additional pages available, implement pagination for complete data')
  }
  
  return insights
}

// Split date range into smaller chunks (Meta API limitation)
function splitDateRange(startDate: string, endDate: string) {
  const ranges = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  const totalDays = differenceInDays(end, start)
  
  if (totalDays <= MAX_DATE_RANGE) {
    ranges.push({ start: startDate, end: endDate })
  } else {
    let currentStart = start
    
    while (currentStart < end) {
      const currentEnd = addDays(currentStart, MAX_DATE_RANGE - 1)
      const actualEnd = currentEnd > end ? end : currentEnd
      
      ranges.push({
        start: format(currentStart, 'yyyy-MM-dd'),
        end: format(actualEnd, 'yyyy-MM-dd'),
      })
      
      currentStart = addDays(currentEnd, 1)
    }
  }
  
  return ranges
}