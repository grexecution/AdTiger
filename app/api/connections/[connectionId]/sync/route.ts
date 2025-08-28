import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { convertCurrency } from "@/lib/currency"
import { ensureValidMetaToken } from "@/lib/utils/token-refresh"

export const dynamic = 'force-dynamic'
interface CampaignInsight {
  campaign_id: string
  campaign_name: string
  impressions: string
  clicks: string
  spend: string
  cpc: string
  cpm: string
  ctr: string
  date_start: string
  date_stop: string
}

interface AdInsight {
  ad_id: string
  ad_name: string
  campaign_id: string
  adset_id: string
  adset_name: string
  impressions: string
  clicks: string
  spend: string
  cpc: string
  cpm: string
  ctr: string
  date_start: string
  date_stop: string
}


export async function POST(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { account: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get the connection
    const connection = await prisma.connection.findFirst({
      where: {
        id: params.connectionId,
        accountId: user.accountId || "no-match"
      }
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // Ensure token is valid and refresh if needed
    let accessToken: string
    try {
      accessToken = await ensureValidMetaToken(connection.id)
    } catch (error) {
      console.error("Token validation/refresh failed:", error)
      return NextResponse.json({ 
        error: "Failed to validate or refresh access token",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 401 })
    }
    
    const credentials = connection.credentials as any

    // Handle both formats: array of IDs (OAuth) or array of objects (manual)
    let selectedAccountIds: string[] = []
    
    if (credentials?.selectedAccountIds) {
      // OAuth format - array of IDs
      selectedAccountIds = credentials.selectedAccountIds
    } else if (credentials?.selectedAccounts) {
      // Manual format - array of objects
      selectedAccountIds = credentials.selectedAccounts.map((acc: any) => 
        typeof acc === 'string' ? acc : acc.id
      )
    } else if (credentials?.accountIds) {
      // Legacy format
      selectedAccountIds = credentials.accountIds
    }
    
    if (selectedAccountIds.length === 0) {
      return NextResponse.json({ error: "No accounts selected for sync" }, { status: 400 })
    }

    console.log(`Starting sync for ${selectedAccountIds.length} accounts`)

    let totalCampaigns = 0
    let totalAds = 0
    let errors = []

    // Sync each selected account
    for (const accountId of selectedAccountIds) {
      const adAccountExternalId = accountId
      
      try {
        console.log(`\nSyncing account: ${adAccountExternalId}`)
        
        // First fetch account details to get currency
        const accountDetailsUrl = `https://graph.facebook.com/v21.0/${adAccountExternalId}?` + new URLSearchParams({
          access_token: accessToken,
          fields: 'id,name,currency,timezone_name,account_status'
        })
        
        const accountResponse = await fetch(accountDetailsUrl)
        const accountData = await accountResponse.json()
        
        let adAccountCurrency = 'USD' // Default
        if (accountData && !accountData.error) {
          adAccountCurrency = accountData.currency || 'USD'
          console.log(`  Account currency: ${adAccountCurrency}`)
        }
        
        // Find or create the AdAccount record for this external ID
        let adAccount = await prisma.adAccount.findFirst({
          where: {
            accountId: user.accountId || "no-match",
            provider: "meta",
            externalId: adAccountExternalId
          }
        })
        
        if (!adAccount) {
          // Create the AdAccount if it doesn't exist
          adAccount = await prisma.adAccount.create({
            data: {
              accountId: user.accountId || "no-match",
              provider: "meta",
              externalId: adAccountExternalId,
              name: accountData.name || adAccountExternalId,
              currency: adAccountCurrency,
              timezone: accountData.timezone_name,
              status: accountData.account_status === 1 ? 'active' : 'paused',
              metadata: accountData
            }
          })
          console.log(`  Created AdAccount record for ${adAccountExternalId}`)
        } else {
          // Update the AdAccount with latest info
          await prisma.adAccount.update({
            where: { id: adAccount.id },
            data: {
              currency: adAccountCurrency,
              timezone: accountData.timezone_name,
              status: accountData.account_status === 1 ? 'active' : 'paused',
              metadata: accountData
            }
          })
        }
        
        // Get the user's preferred currency
        const mainCurrency = user.account?.currency || 'EUR'
        console.log(`  Converting from ${adAccountCurrency} to ${mainCurrency}`)

        // First, fetch campaigns directly (not through insights)
        let campaignsUrl = `https://graph.facebook.com/v21.0/${adAccountExternalId}/campaigns?` + new URLSearchParams({
          access_token: accessToken,
          fields: 'id,name,status,objective,daily_budget,lifetime_budget,special_ad_categories,configured_status',
          limit: '500'
        })
        
        const allCampaigns = []
        while (campaignsUrl) {
          const response = await fetch(campaignsUrl)
          const data = await response.json()
          
          if (data.error) {
            console.error(`Error fetching campaigns: ${data.error.message}`)
            errors.push({ accountId: adAccountExternalId, error: data.error.message })
            
            // Check if token expired
            if (data.error.message?.includes('Session has expired') || data.error.error_subcode === 463) {
              // Update connection status to indicate token expired
              await prisma.connection.update({
                where: { id: params.connectionId },
                data: {
                  status: 'expired',
                  metadata: {
                    ...(connection.metadata as any),
                    lastError: 'Access token expired',
                    errorTime: new Date().toISOString()
                  }
                }
              })
              
              return NextResponse.json(
                { 
                  error: 'Access token expired',
                  message: 'Your Meta access token has expired. Please reconnect with a new token.',
                  details: data.error.message
                },
                { status: 401 }
              )
            }
            break
          }
          
          if (data.data) {
            allCampaigns.push(...data.data)
          }
          
          campaignsUrl = data.paging?.next || null
        }
        
        console.log(`  Found ${allCampaigns.length} campaigns`)
        
        // Store campaigns
        for (const campaign of allCampaigns) {
          try {
            // Get budget value in cents (Meta returns values in cents)
            const budgetValueCents = parseFloat(campaign.daily_budget || campaign.lifetime_budget || '0')
            const budgetValue = budgetValueCents / 100 // Convert cents to actual currency
            
            // Convert budget to main currency
            const convertedBudget = await convertCurrency(budgetValue, adAccountCurrency, mainCurrency)
            
            // Default channel - will be updated when we process ads with creative data
            let channel = 'meta' // Use meta as default for campaigns
            
            await prisma.campaign.upsert({
              where: {
                accountId_provider_externalId: {
                  accountId: user.accountId || "no-match",
                  provider: "meta",
                  externalId: campaign.id
                }
              },
              update: {
                name: campaign.name,
                status: campaign.status?.toLowerCase() || "unknown",
                objective: campaign.objective?.toLowerCase(),
                channel,
                budgetAmount: convertedBudget,
                budgetCurrency: mainCurrency,
                metadata: {
                  lastSyncedAt: new Date().toISOString(),
                  originalBudget: budgetValue,
                  originalCurrency: adAccountCurrency,
                  rawData: campaign
                }
              },
              create: {
                accountId: user.accountId || "no-match",
                provider: "meta",
                externalId: campaign.id,
                name: campaign.name,
                status: campaign.status?.toLowerCase() || "unknown",
                objective: campaign.objective?.toLowerCase(),
                channel,
                budgetAmount: convertedBudget,
                budgetCurrency: mainCurrency,
                adAccountId: adAccount.id,
                metadata: {
                  lastSyncedAt: new Date().toISOString(),
                  originalBudget: budgetValue,
                  originalCurrency: adAccountCurrency,
                  rawData: campaign
                }
              }
            })
            totalCampaigns++
          } catch (campaignError) {
            console.error(`Error upserting campaign ${campaign.id}:`, campaignError)
            console.error('Campaign data:', JSON.stringify(campaign, null, 2))
          }
        }
        
        // Fetch campaign insights separately for metrics including engagement
        // First fetch with daily breakdown for historical data
        const today = new Date()
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        
        // Fetch daily insights for the last 7 days
        let dailyInsightsUrl: string | null = `https://graph.facebook.com/v21.0/${adAccountExternalId}/insights?` + new URLSearchParams({
          access_token: accessToken,
          level: 'campaign',
          fields: 'campaign_id,campaign_name,impressions,clicks,spend,cpc,cpm,ctr,actions,inline_link_clicks,inline_post_engagement,conversions,purchase_roas,website_purchase_roas',
          time_range: `{'since':'${sevenDaysAgo.toISOString().split('T')[0]}','until':'${today.toISOString().split('T')[0]}'}`,
          time_increment: '1', // Daily breakdown
          limit: '500'
        })
        
        while (dailyInsightsUrl) {
          const dailyResponse = await fetch(dailyInsightsUrl)
          const dailyData = await dailyResponse.json()
          
          if (dailyData.data) {
            // Store each day's insights in the Insight table
            for (const insight of dailyData.data) {
              const campaign = await prisma.campaign.findFirst({
                where: {
                  accountId: user.accountId || "no-match",
                  provider: 'meta',
                  externalId: insight.campaign_id
                }
              })
              
              if (campaign) {
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
                
                // Store in Insight table
                await prisma.insight.upsert({
                  where: {
                    accountId_provider_entityType_entityId_date_window: {
                      accountId: user.accountId || "no-match",
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
                      spend: parseFloat(insight.spend || '0'),
                      ctr: parseFloat(insight.ctr || '0'),
                      cpc: parseFloat(insight.cpc || '0'),
                      cpm: parseFloat(insight.cpm || '0'),
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
                    accountId: user.accountId || "no-match",
                    provider: 'meta',
                    entityType: 'campaign',
                    entityId: campaign.id,
                    campaignId: campaign.id,
                    date: insightDate,
                    window: '1d',
                    metrics: {
                      impressions: parseInt(insight.impressions || '0'),
                      clicks: parseInt(insight.clicks || '0'),
                      spend: parseFloat(insight.spend || '0'),
                      ctr: parseFloat(insight.ctr || '0'),
                      cpc: parseFloat(insight.cpc || '0'),
                      cpm: parseFloat(insight.cpm || '0'),
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
              }
            }
          }
          
          dailyInsightsUrl = dailyData.paging?.next || null
        }
        
        // Now fetch aggregated insights for last 30 days to update campaign metadata
        let allCampaignInsights: any[] = []
        let campaignsInsightsUrl: string | null = `https://graph.facebook.com/v21.0/${adAccountExternalId}/insights?` + new URLSearchParams({
          access_token: accessToken,
          level: 'campaign',
          fields: 'campaign_id,campaign_name,impressions,clicks,spend,cpc,cpm,ctr,actions,inline_link_clicks,inline_post_engagement,conversions,purchase_roas,website_purchase_roas',
          date_preset: 'last_30d',
          limit: '500'
        })

        while (campaignsInsightsUrl) {
          const campaignsResponse = await fetch(campaignsInsightsUrl)
          const campaignsData = await campaignsResponse.json()

          if (campaignsData.error) {
            console.error(`Error fetching campaign insights:`, campaignsData.error)
            // Don't break, just log the error
          }

          if (campaignsData.data) {
            allCampaignInsights = [...allCampaignInsights, ...campaignsData.data]
          }

          campaignsInsightsUrl = campaignsData.paging?.next || null
        }

        // Update campaigns with insights data
        for (const insight of allCampaignInsights) {
          // Parse monetary values (Meta returns them in currency units, not cents)
          const spend = parseFloat(insight.spend || '0')
          const cpc = parseFloat(insight.cpc || '0')
          const cpmCents = parseFloat(insight.cpm || '0')
          const cpm = cpmCents / 100
          
          const convertedSpend = await convertCurrency(spend, adAccountCurrency, mainCurrency)
          const convertedCpc = await convertCurrency(cpc, adAccountCurrency, mainCurrency)
          const convertedCpm = await convertCurrency(cpm, adAccountCurrency, mainCurrency)
          
          // Get existing campaign to preserve metadata
          const existingCampaign = await prisma.campaign.findFirst({
            where: {
              accountId: user.accountId || "no-match",
              provider: "meta",
              externalId: insight.campaign_id
            }
          })
          
          if (existingCampaign) {
            const existingMetadata = existingCampaign.metadata as any || {}
            
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
            
            await prisma.campaign.update({
              where: { id: existingCampaign.id },
              data: {
                metadata: {
                  ...existingMetadata,
                  insights: {
                    impressions: parseInt(insight.impressions || '0'),
                    clicks: parseInt(insight.clicks || '0'),
                    spend: convertedSpend,
                    cpc: convertedCpc,
                    cpm: convertedCpm,
                    ctr: parseFloat(insight.ctr || '0'),
                    currency: mainCurrency,
                    originalSpend: spend,
                    originalCurrency: adAccountCurrency,
                    // Engagement metrics
                    likes,
                    comments,
                    shares,
                    saves,
                    videoViews,
                    inlineLinkClicks: parseInt(insight.inline_link_clicks || '0'),
                    inlinePostEngagement: parseInt(insight.inline_post_engagement || '0'),
                    // Conversion metrics
                    conversions: parseInt(insight.conversions || '0'),
                    purchaseRoas: insight.purchase_roas ? parseFloat(insight.purchase_roas[0]?.value || '0') : 0,
                    websitePurchaseRoas: insight.website_purchase_roas ? parseFloat(insight.website_purchase_roas[0]?.value || '0') : 0,
                    // Raw data
                    rawActions: insight.actions
                  }
                }
              }
            })
          }
        }
        
        // Fetch AdSets with targeting to detect channel
        console.log(`  Fetching adsets with targeting...`)
        let adsetsUrl = `https://graph.facebook.com/v21.0/${adAccountExternalId}/adsets?` + new URLSearchParams({
          access_token: accessToken,
          fields: 'id,name,status,campaign_id,daily_budget,lifetime_budget,targeting',
          limit: '500'
        })
        
        let totalAdSets = 0
        while (adsetsUrl) {
          const response = await fetch(adsetsUrl)
          const data = await response.json()
          
          if (data.error) {
            console.error(`Error fetching adsets: ${data.error.message}`)
            break
          }
          
          if (data.data) {
            for (const adset of data.data) {
              // Find the campaign this adset belongs to
              const campaign = await prisma.campaign.findFirst({
                where: {
                  accountId: user.accountId || "no-match",
                  provider: "meta",
                  externalId: adset.campaign_id
                }
              })
              
              if (campaign) {
                try {
                  // Get budget value in cents and convert to actual currency
                  const budgetValueCents = parseFloat(adset.daily_budget || adset.lifetime_budget || '0')
                  const budgetValue = budgetValueCents / 100
                  
                  // Convert budget to main currency
                  const convertedBudget = await convertCurrency(budgetValue, adAccountCurrency, mainCurrency)
                  
                  // Detect channel from targeting
                  let channel = 'facebook' // Default
                  if (adset.targeting?.publisher_platforms) {
                    const platforms = adset.targeting.publisher_platforms
                    if (platforms.length === 1 && platforms[0] === 'instagram') {
                      channel = 'instagram'
                    } else if (platforms.includes('instagram') && platforms.includes('facebook')) {
                      channel = 'facebook' // Mixed placement defaults to Facebook
                    } else if (platforms.includes('messenger')) {
                      channel = 'messenger'
                    } else if (platforms.includes('whatsapp')) {
                      channel = 'whatsapp'
                    }
                  }
                  
                  // Update campaign channel if more specific
                  if (channel !== 'facebook') {
                    await prisma.campaign.update({
                      where: { id: campaign.id },
                      data: { channel }
                    })
                  }
                  
                  await prisma.adGroup.upsert({
                    where: {
                      accountId_provider_externalId: {
                        accountId: user.accountId || "no-match",
                        provider: "meta",
                        externalId: adset.id
                      }
                    },
                    update: {
                      name: adset.name,
                      status: adset.status?.toLowerCase() || "unknown",
                      channel,
                      budgetAmount: convertedBudget,
                      budgetCurrency: mainCurrency,
                      metadata: {
                        lastSyncedAt: new Date().toISOString(),
                        originalBudget: budgetValue,
                        originalCurrency: adAccountCurrency,
                        rawData: adset
                      }
                    },
                    create: {
                      accountId: user.accountId || "no-match",
                      campaignId: campaign.id,
                      provider: "meta",
                      externalId: adset.id,
                      name: adset.name,
                      status: adset.status?.toLowerCase() || "unknown",
                      channel,
                      budgetAmount: convertedBudget,
                      budgetCurrency: mainCurrency,
                      metadata: {
                        lastSyncedAt: new Date().toISOString(),
                        originalBudget: budgetValue,
                        originalCurrency: adAccountCurrency,
                        rawData: adset
                      }
                    }
                  })
                  totalAdSets++
                } catch (adsetError) {
                  console.error(`Error upserting adset ${adset.id}:`, adsetError)
                  console.error('Adset data:', JSON.stringify(adset, null, 2))
                }
              }
            }
          }
          
          adsetsUrl = data.paging?.next || null
        }
        
        console.log(`  Found ${totalAdSets} adsets`)

        // Fetch Ads
        console.log(`  Fetching ads...`)
        let adsUrl = `https://graph.facebook.com/v21.0/${adAccountExternalId}/ads?` + new URLSearchParams({
          access_token: accessToken,
          fields: 'id,name,status,adset_id,campaign_id,creative{id,name,title,body,image_url,object_story_spec,asset_feed_spec,instagram_permalink_url,link_url,call_to_action_type,video_id,image_hash,object_story_id,effective_instagram_story_id,effective_object_story_id}',
          limit: '500'
        })
        
        while (adsUrl) {
          const response = await fetch(adsUrl)
          const data = await response.json()
          
          if (data.error) {
            console.error(`Error fetching ads: ${data.error.message}`)
            break
          }
          
          if (data.data) {
            console.log(`    Processing ${data.data.length} ads...`)
            for (const ad of data.data) {
              console.log(`      Ad ${ad.id}: looking for adset ${ad.adset_id}`)
              // Find the adset this ad belongs to
              const adGroup = await prisma.adGroup.findFirst({
                where: {
                  accountId: user.accountId || "no-match",
                  provider: "meta",
                  externalId: ad.adset_id
                }
              })
              
              if (adGroup) {
                console.log(`        Found adGroup ${adGroup.id} for ad ${ad.id}`)
                try {
                  // Process creative to get all image URLs
                  let processedCreative = { ...ad.creative }
                  let allImageUrls: any[] = []
                  
                  // Check if we have asset_feed_spec with image hashes
                  if (ad.creative?.asset_feed_spec?.images && Array.isArray(ad.creative.asset_feed_spec.images) && ad.creative.asset_feed_spec.images.length > 0) {
                    console.log(`          Ad has ${ad.creative.asset_feed_spec.images.length} images in asset feed`)
                    
                    // Collect all image hashes
                    const imageHashes = ad.creative.asset_feed_spec.images
                      .map((img: any) => img.hash)
                      .filter((hash: string) => hash)
                    
                    if (imageHashes.length > 0) {
                      try {
                        // Fetch all images at once
                        const imageResponse = await fetch(
                          `https://graph.facebook.com/v21.0/${adAccountExternalId}/adimages?` + new URLSearchParams({
                            access_token: accessToken,
                            hashes: JSON.stringify(imageHashes),
                            fields: 'hash,url,url_128,permalink_url,width,height,name'
                          })
                        )
                        const imageData = await imageResponse.json()
                        
                        if (imageData.data) {
                          // Map hashes to URLs
                          const hashToUrl: { [key: string]: any } = {}
                          for (const img of imageData.data) {
                            hashToUrl[img.hash] = {
                              url: img.url,
                              url_128: img.url_128,
                              permalink_url: img.permalink_url,
                              width: img.width,
                              height: img.height,
                              name: img.name
                            }
                            allImageUrls.push({
                              hash: img.hash,
                              url: img.url,
                              url_128: img.url_128,
                              permalink_url: img.permalink_url,
                              width: img.width,
                              height: img.height
                            })
                          }
                          
                          // Update asset_feed_spec images with URLs
                          processedCreative.asset_feed_spec.images = processedCreative.asset_feed_spec.images.map((img: any) => ({
                            ...img,
                            ...hashToUrl[img.hash]
                          }))
                          
                          console.log(`          Fetched URLs for ${Object.keys(hashToUrl).length} images`)
                        }
                      } catch (imgError) {
                        console.error(`          Error fetching images:`, imgError)
                      }
                    }
                  }
                  
                  // Also check for single image_hash
                  else if (ad.creative?.image_hash) {
                    try {
                      const imageResponse = await fetch(
                        `https://graph.facebook.com/v21.0/${adAccountExternalId}/adimages?` + new URLSearchParams({
                          access_token: accessToken,
                          hashes: JSON.stringify([ad.creative.image_hash]),
                          fields: 'hash,url,url_128,permalink_url,width,height,name'
                        })
                      )
                      const imageData = await imageResponse.json()
                      if (imageData.data && imageData.data.length > 0) {
                        const img = imageData.data[0]
                        processedCreative.image_url = img.url
                        processedCreative.image_url_128 = img.url_128
                        allImageUrls.push({
                          hash: img.hash,
                          url: img.url,
                          url_128: img.url_128,
                          permalink_url: img.permalink_url,
                          width: img.width,
                          height: img.height
                        })
                      }
                    } catch (imgError) {
                      console.log(`          Could not fetch image for hash ${ad.creative.image_hash}`)
                    }
                  }
                  
                  // Get the main image URL (first image or existing URL)
                  let mainImageUrl = processedCreative.image_url
                  if (!mainImageUrl && allImageUrls.length > 0) {
                    mainImageUrl = allImageUrls[0].url
                  }
                  if (!mainImageUrl) {
                    mainImageUrl = ad.creative?.image_url || ad.creative?.thumbnail_url
                  }
                  
                  // Detect publisher platforms from creative
                  let publisherPlatforms: string[] = []
                  if (processedCreative?.object_story_spec?.link_data?.publisher_platforms) {
                    publisherPlatforms = processedCreative.object_story_spec.link_data.publisher_platforms
                  } else if (processedCreative?.asset_feed_spec?.publisher_platforms) {
                    publisherPlatforms = processedCreative.asset_feed_spec.publisher_platforms
                  } else if (ad.creative?.object_story_spec?.link_data?.publisher_platforms) {
                    publisherPlatforms = ad.creative.object_story_spec.link_data.publisher_platforms
                  } else if (ad.creative?.asset_feed_spec?.publisher_platforms) {
                    publisherPlatforms = ad.creative.asset_feed_spec.publisher_platforms
                  }
                  
                  // Determine primary channel from publisher platforms
                  let adChannel = adGroup.channel // Default to adGroup channel
                  if (publisherPlatforms.length > 0) {
                    // Priority: Instagram > Facebook > Messenger > Threads
                    if (publisherPlatforms.includes('instagram')) {
                      adChannel = 'instagram'
                    } else if (publisherPlatforms.includes('facebook')) {
                      adChannel = 'facebook'
                    } else if (publisherPlatforms.includes('messenger')) {
                      adChannel = 'messenger'
                    } else if (publisherPlatforms.includes('threads')) {
                      adChannel = 'threads'
                    }
                  }
                  
                  await prisma.ad.upsert({
                    where: {
                      accountId_provider_externalId: {
                        accountId: user.accountId || "no-match",
                        provider: "meta",
                        externalId: ad.id
                      }
                    },
                    update: {
                      name: ad.name,
                      status: ad.status?.toLowerCase() || "unknown",
                      channel: adChannel,
                      creative: processedCreative,
                      metadata: {
                        lastSyncedAt: new Date().toISOString(),
                        rawData: ad,
                        // Store main image URL and all URLs for easier access
                        imageUrl: mainImageUrl,
                        allImageUrls: allImageUrls,
                        // Store publisher platforms
                        publisherPlatforms
                      }
                    },
                    create: {
                      accountId: user.accountId || "no-match",
                      adGroupId: adGroup.id,
                      provider: "meta",
                      externalId: ad.id,
                      name: ad.name,
                      status: ad.status?.toLowerCase() || "unknown",
                      channel: adChannel,
                      creative: processedCreative,
                      metadata: {
                        lastSyncedAt: new Date().toISOString(),
                        rawData: ad,
                        // Store main image URL and all URLs for easier access
                        imageUrl: mainImageUrl,
                        allImageUrls: allImageUrls,
                        // Store publisher platforms
                        publisherPlatforms
                      }
                    }
                  })
                  totalAds++
                } catch (adError) {
                  console.error(`Error upserting ad ${ad.id}:`, adError)
                  console.error('Ad data:', JSON.stringify(ad, null, 2))
                }
              } else {
                console.log(`        No adGroup found for ad ${ad.id} with adset_id ${ad.adset_id}`)
              }
            }
          }
          
          adsUrl = data.paging?.next || null
        }
        
        console.log(`  Found ${totalAds} ads`)
        
        // Fetch ad insights to get performance metrics including engagement
        if (totalAds > 0) {
          console.log(`  Fetching ad insights with engagement metrics...`)
          let adInsightsUrl = `https://graph.facebook.com/v21.0/${adAccountExternalId}/insights?` + new URLSearchParams({
            access_token: accessToken,
            level: 'ad',
            fields: [
              // Basic metrics
              'ad_id', 'ad_name', 'impressions', 'clicks', 'spend', 'cpc', 'cpm', 'ctr',
              // Engagement metrics
              'actions', 'inline_link_clicks', 'inline_post_engagement',
              // Video metrics
              'video_play_actions', 'video_30_sec_watched_actions',
              'video_avg_time_watched_actions', 'video_p25_watched_actions',
              'video_p50_watched_actions', 'video_p75_watched_actions',
              'video_p95_watched_actions', 'video_p100_watched_actions',
              // Quality metrics
              'quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking',
              // Click metrics
              'outbound_clicks', 'unique_clicks'
            ].join(','),
            date_preset: 'last_30d',
            limit: '500'
          })
          
          while (adInsightsUrl) {
            const insightsResponse = await fetch(adInsightsUrl)
            const insightsData = await insightsResponse.json()
            
            if (insightsData.error) {
              console.error(`Error fetching ad insights:`, insightsData.error)
              break
            }
            
            if (insightsData.data) {
              // Update ads with insights data
              for (const insight of insightsData.data) {
                // Parse monetary values (Meta returns them in currency units, not cents)
                const spend = parseFloat(insight.spend || '0')
                const cpc = parseFloat(insight.cpc || '0')
                const cpm = parseFloat(insight.cpm || '0')
                
                // Debug logging for ads with clicks but no CPC
                if (parseInt(insight.clicks || '0') > 0 && cpc === 0) {
                  console.log(`⚠️ Ad ${insight.ad_name} has ${insight.clicks} clicks but CPC is 0`)
                  console.log('  Raw API data:', {
                    spend: insight.spend,
                    cpc: insight.cpc,
                    clicks: insight.clicks
                  })
                }
                
                const convertedSpend = await convertCurrency(spend, adAccountCurrency, mainCurrency)
                const convertedCpc = await convertCurrency(cpc, adAccountCurrency, mainCurrency)
                const convertedCpm = await convertCurrency(cpm, adAccountCurrency, mainCurrency)
                
                // First get the existing ad to preserve metadata
                const existingAd = await prisma.ad.findFirst({
                  where: {
                    accountId: user.accountId || "no-match",
                    provider: "meta",
                    externalId: insight.ad_id
                  }
                })
                
                if (existingAd) {
                  const existingMetadata = existingAd.metadata as any || {}
                  
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
                  
                  // Calculate ROAS if available
                  const purchaseRoas = insight.purchase_roas ? parseFloat(insight.purchase_roas[0]?.value || '0') : 0
                  const websitePurchaseRoas = insight.website_purchase_roas ? parseFloat(insight.website_purchase_roas[0]?.value || '0') : 0
                  
                  // Fetch comments if we have a positive comment count
                  let commentsData = []
                  if (comments > 0 && insight.ad_id) {
                    try {
                      // Try to get the effective_object_story_id to fetch comments
                      const adDetailsUrl = `https://graph.facebook.com/v18.0/${insight.ad_id}?fields=effective_object_story_id,creative&access_token=${accessToken}`
                      const adDetailsResponse = await fetch(adDetailsUrl)
                      const adDetails = await adDetailsResponse.json()
                      
                      if (adDetails.effective_object_story_id) {
                        // Fetch comments for the post
                        const commentsUrl = `https://graph.facebook.com/v18.0/${adDetails.effective_object_story_id}/comments?fields=id,message,from,created_time,like_count,comment_count,comments{id,message,from,created_time,like_count}&limit=25&access_token=${accessToken}`
                        const commentsResponse = await fetch(commentsUrl)
                        const commentsResult = await commentsResponse.json()
                        
                        if (commentsResult.data) {
                          commentsData = commentsResult.data
                          console.log(`💬 Fetched ${commentsData.length} comments for ad "${insight.ad_name}"`)
                        }
                      }
                    } catch (error) {
                      // Silently fail - comments are optional
                    }
                  }
                  
                  await prisma.ad.update({
                    where: { id: existingAd.id },
                    data: {
                      metadata: {
                        ...existingMetadata,
                        comments: commentsData, // Store actual comments array
                        insights: {
                          impressions: parseInt(insight.impressions || '0'),
                          clicks: parseInt(insight.clicks || '0'),
                          spend: convertedSpend,
                          cpc: convertedCpc,
                          cpm: convertedCpm,
                          ctr: parseFloat(insight.ctr || '0'),
                          currency: mainCurrency,
                          originalSpend: spend,
                          originalCurrency: adAccountCurrency,
                          // Engagement metrics
                          likes,
                          comments,
                          shares,
                          saves,
                          videoViews,
                          inlineLinkClicks: parseInt(insight.inline_link_clicks || '0'),
                          inlinePostEngagement: parseInt(insight.inline_post_engagement || '0'),
                          // Video metrics
                          video_play_actions: parseInt(insight.video_play_actions?.[0]?.value || '0'),
                          video_30_sec_watched_actions: parseInt(insight.video_30_sec_watched_actions?.[0]?.value || '0'),
                          video_avg_time_watched_actions: parseFloat(insight.video_avg_time_watched_actions?.[0]?.value || '0'),
                          video_p25_watched_actions: parseInt(insight.video_p25_watched_actions?.[0]?.value || '0'),
                          video_p50_watched_actions: parseInt(insight.video_p50_watched_actions?.[0]?.value || '0'),
                          video_p75_watched_actions: parseInt(insight.video_p75_watched_actions?.[0]?.value || '0'),
                          video_p95_watched_actions: parseInt(insight.video_p95_watched_actions?.[0]?.value || '0'),
                          video_p100_watched_actions: parseInt(insight.video_p100_watched_actions?.[0]?.value || '0'),
                          // Quality metrics
                          quality_ranking: insight.quality_ranking || null,
                          engagement_rate_ranking: insight.engagement_rate_ranking || null,
                          conversion_rate_ranking: insight.conversion_rate_ranking || null,
                          // Click metrics
                          outbound_clicks: parseInt(insight.outbound_clicks?.[0]?.value || '0'),
                          unique_clicks: parseInt(insight.unique_clicks || '0'),
                          // Reach & Frequency
                          reach: parseInt(insight.reach || '0'),
                          frequency: parseFloat(insight.frequency || '0'),
                          // Raw data for reference
                          rawActions: insight.actions
                        },
                        lastSyncedAt: new Date().toISOString()
                      }
                    }
                  })
                }
              }
            }
            
            adInsightsUrl = insightsData.paging?.next || null
          }
          
          // Skip demographic breakdowns for now - may be causing issues
          // Commented out temporarily to avoid field errors
          /*
          console.log(`  Fetching demographic breakdowns for insights...`)
          try {
            // Get age and gender breakdown
            const demographicInsightsUrl = `https://graph.facebook.com/v21.0/${adAccountExternalId}/insights?` + new URLSearchParams({
              access_token: accessToken,
              level: 'ad',
              fields: 'ad_id,impressions,clicks,spend,video_play_actions',
              breakdowns: 'age,gender',
              date_preset: 'last_30d',
              limit: '500'
            })
            
            const demoResponse = await fetch(demographicInsightsUrl)
            const demoData = await demoResponse.json()
            
            if (demoData.data) {
              // Store demographic data in metadata
              const demographicsByAd: Record<string, any> = {}
              
              for (const demo of demoData.data) {
                if (!demographicsByAd[demo.ad_id]) {
                  demographicsByAd[demo.ad_id] = []
                }
                demographicsByAd[demo.ad_id].push({
                  age: demo.age,
                  gender: demo.gender,
                  impressions: parseInt(demo.impressions || '0'),
                  clicks: parseInt(demo.clicks || '0'),
                  spend: parseFloat(demo.spend || '0'),
                  videoPlays: parseInt(demo.video_play_actions?.[0]?.value || '0')
                })
              }
              
              // Update ads with demographic data
              for (const [adId, demographics] of Object.entries(demographicsByAd)) {
                const existingAd = await prisma.ad.findFirst({
                  where: {
                    accountId: user.accountId || "no-match",
                    provider: "meta",
                    externalId: adId
                  }
                })
                
                if (existingAd) {
                  const metadata = existingAd.metadata as any || {}
                  await prisma.ad.update({
                    where: { id: existingAd.id },
                    data: {
                      metadata: {
                        ...metadata,
                        demographicBreakdown: demographics
                      }
                    }
                  })
                }
              }
              
              console.log(`  Stored demographic data for ${Object.keys(demographicsByAd).length} ads`)
            }
          } catch (demoError) {
            console.error('Error fetching demographic breakdowns:', demoError)
          }
          */
        }
      } catch (accountError) {
        console.error(`Error syncing account ${adAccountExternalId}:`, accountError)
        errors.push({ 
          accountId: adAccountExternalId, 
          error: accountError instanceof Error ? accountError.message : 'Unknown error' 
        })
      }
    }

    // Update connection with last sync time
    await prisma.connection.update({
      where: { id: params.connectionId },
      data: {
        metadata: {
          ...(connection.metadata as any),
          lastSyncAt: new Date().toISOString(),
          lastSyncStats: {
            campaigns: totalCampaigns,
            ads: totalAds,
            errors: errors.length
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        campaigns: totalCampaigns,
        ads: totalAds,
        errors: errors.length,
        errorDetails: errors
      }
    })
  } catch (error) {
    console.error("Sync failed:", error)
    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}