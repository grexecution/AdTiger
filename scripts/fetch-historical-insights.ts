#!/usr/bin/env npx tsx

/**
 * Script to fetch historical insights from Meta Ads API
 * Fetches daily breakdowns for the specified time period
 */

import { prisma } from '@/lib/prisma'
import { ensureValidMetaToken } from '@/lib/utils/token-refresh'

async function fetchHistoricalInsights(daysBack: number = 7) {
  console.log(`📊 Fetching ${daysBack} days of historical insights from Meta...\n`)
  
  try {
    // Get the active Meta connection
    const connection = await prisma.connection.findFirst({
      where: {
        status: 'active',
        provider: 'meta'
      }
    })
    
    if (!connection) {
      console.error('❌ No active Meta connection found')
      return
    }
    
    console.log(`Found connection: ${connection.id}`)
    
    // Get valid token
    const accessToken = await ensureValidMetaToken(connection.id)
    console.log('✅ Got valid access token\n')
    
    // Get selected accounts from credentials
    const credentials = connection.credentials as any
    const selectedAccounts = credentials?.selectedAccountIds || []
    
    if (selectedAccounts.length === 0) {
      console.error('❌ No ad accounts selected')
      return
    }
    
    console.log(`Processing ${selectedAccounts.length} ad accounts...\n`)
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    
    const dateRangeStr = `{'since':'${startDate.toISOString().split('T')[0]}','until':'${endDate.toISOString().split('T')[0]}'}`
    
    let totalInsightsCreated = 0
    
    for (const accountId of selectedAccounts) {
      console.log(`\n📈 Fetching insights for account ${accountId}...`)
      
      try {
        // Fetch campaign insights with daily breakdown
        const campaignInsightsUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?` + new URLSearchParams({
          access_token: accessToken,
          level: 'campaign',
          fields: 'campaign_id,campaign_name,impressions,clicks,spend,cpc,cpm,ctr,actions,inline_link_clicks,inline_post_engagement,conversions,purchase_roas,website_purchase_roas',
          time_range: dateRangeStr,
          time_increment: '1', // Daily breakdown
          limit: '500'
        })
        
        const campaignResponse = await fetch(campaignInsightsUrl)
        const campaignData = await campaignResponse.json()
        
        if (campaignData.error) {
          console.error(`  ❌ Error fetching campaign insights: ${campaignData.error.message}`)
          continue
        }
        
        console.log(`  Found ${campaignData.data?.length || 0} campaign insight records`)
        
        // Process campaign insights
        for (const insight of (campaignData.data || [])) {
          // Find the campaign in our database
          const campaign = await prisma.campaign.findFirst({
            where: {
              accountId: connection.accountId,
              provider: 'meta',
              externalId: insight.campaign_id
            }
          })
          
          if (!campaign) {
            console.log(`  ⚠️ Campaign ${insight.campaign_id} not found in database, skipping`)
            continue
          }
          
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
          
          // Upsert insight record
          await prisma.insight.upsert({
            where: {
              accountId_provider_entityType_entityId_date_window: {
                accountId: connection.accountId,
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
                dateStop: insight.date_stop,
                rawActions: insight.actions
              },
              updatedAt: new Date()
            },
            create: {
              accountId: connection.accountId,
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
                dateStop: insight.date_stop,
                rawActions: insight.actions
              }
            }
          })
          totalInsightsCreated++
        }
        
        // Now fetch ad-level insights
        console.log(`  📊 Fetching ad-level insights...`)
        
        const adInsightsUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?` + new URLSearchParams({
          access_token: accessToken,
          level: 'ad',
          fields: 'ad_id,ad_name,campaign_id,adset_id,impressions,clicks,spend,cpc,cpm,ctr,actions,inline_link_clicks,inline_post_engagement',
          time_range: dateRangeStr,
          time_increment: '1', // Daily breakdown
          limit: '500'
        })
        
        const adResponse = await fetch(adInsightsUrl)
        const adData = await adResponse.json()
        
        if (adData.data) {
          console.log(`  Found ${adData.data.length} ad insight records`)
          
          for (const insight of adData.data) {
            // Find the ad in our database
            const ad = await prisma.ad.findFirst({
              where: {
                accountId: connection.accountId,
                provider: 'meta',
                externalId: insight.ad_id
              }
            })
            
            if (!ad) {
              continue
            }
            
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
            
            // Upsert ad insight record
            await prisma.insight.upsert({
              where: {
                accountId_provider_entityType_entityId_date_window: {
                  accountId: connection.accountId,
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
                  inlineLinkClicks: parseInt(insight.inline_link_clicks || '0'),
                  inlinePostEngagement: parseInt(insight.inline_post_engagement || '0'),
                  dateStart: insight.date_start,
                  dateStop: insight.date_stop
                },
                updatedAt: new Date()
              },
              create: {
                accountId: connection.accountId,
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
                  inlineLinkClicks: parseInt(insight.inline_link_clicks || '0'),
                  inlinePostEngagement: parseInt(insight.inline_post_engagement || '0'),
                  dateStart: insight.date_start,
                  dateStop: insight.date_stop
                }
              }
            })
            totalInsightsCreated++
          }
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing account ${accountId}:`, error)
      }
    }
    
    console.log(`\n✅ Successfully created/updated ${totalInsightsCreated} insight records!`)
    
    // Show sample of data
    const recentInsights = await prisma.insight.findMany({
      where: {
        accountId: connection.accountId,
        provider: 'meta',
        date: {
          gte: startDate
        }
      },
      orderBy: { date: 'desc' },
      take: 5
    })
    
    console.log('\n📊 Sample of recent insights:')
    for (const insight of recentInsights) {
      const metrics = insight.metrics as any
      console.log(`  ${insight.date.toISOString().split('T')[0]} - ${insight.entityType}:`)
      console.log(`    Impressions: ${metrics.impressions} | Clicks: ${metrics.clicks} | Spend: $${metrics.spend?.toFixed(2)}`)
      console.log(`    Likes: ${metrics.likes} | Comments: ${metrics.comments} | Shares: ${metrics.shares}`)
    }
    
  } catch (error) {
    console.error('❌ Error fetching historical insights:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const daysBack = args[0] ? parseInt(args[0]) : 7

console.log('Usage: npx tsx scripts/fetch-historical-insights.ts [days_back]')
console.log('Example: npx tsx scripts/fetch-historical-insights.ts 30\n')

fetchHistoricalInsights(daysBack)