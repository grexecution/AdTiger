import { Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { MetaSyncJobData } from '@/lib/queue/queues'
import { META_API_VERSION } from '@/lib/meta-auth'
import { getMetaChannel } from '@/lib/utils/channel-utils'
import { processMetaInsights } from '@/lib/utils/insights-utils'

// Helper function to download and store image assets
async function downloadAndStoreImage(
  accountId: string,
  entityId: string,
  imageUrl: string,
  assetType: string = 'creative'
): Promise<void> {
  try {
    // Skip if URL is empty or invalid
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return
    }

    // Check if we already have this asset stored
    const existingAsset = await prisma.assetStorage.findFirst({
      where: {
        accountId,
        entityId,
        assetType,
      }
    })

    // If asset exists and was updated recently (within 7 days), skip
    if (existingAsset && existingAsset.createdAt) {
      const daysSinceCreation = (Date.now() - existingAsset.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceCreation < 7) {
        return
      }
    }

    // Download the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.warn(`Failed to download image from ${imageUrl}: ${response.status}`)
      return
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()
    const data = Buffer.from(buffer)
    
    // Calculate hash for the image
    const crypto = await import('crypto')
    const hash = crypto.createHash('md5').update(data as any).digest('hex')

    // Store or update the asset
    await prisma.assetStorage.upsert({
      where: {
        accountId_provider_entityId_assetType_hash: {
          accountId,
          provider: 'meta',
          entityId,
          assetType,
          hash
        }
      },
      update: {
        data: data as any,
        mimeType: contentType,
        size: data.length,
        originalUrl: imageUrl,
        changedAt: new Date(),
        changeCount: { increment: 1 }
      },
      create: {
        accountId,
        provider: 'meta',
        entityType: 'ad',
        entityId,
        assetType,
        hash,
        data: data as any,
        mimeType: contentType,
        size: data.length,
        originalUrl: imageUrl,
        changeCount: 1
      }
    })

    console.log(`Stored image for ${entityId} (${data.length} bytes)`)
  } catch (error) {
    console.error(`Failed to download/store image for ${entityId}:`, error)
    // Don't throw - we don't want image download failures to break sync
  }
}

// Helper to extract best image URL from creative
function getBestImageUrl(creative: any): string | null {
  if (!creative) return null
  
  // Priority 1: permalink URLs (stable)
  if (creative.asset_feed_spec?.images?.[0]?.permalink_url) {
    return creative.asset_feed_spec.images[0].permalink_url
  }
  
  // Priority 2: video thumbnails for video ads
  if (creative.object_story_spec?.video_data?.image_url) {
    return creative.object_story_spec.video_data.image_url
  }
  
  // Priority 3: regular image_url
  if (creative.image_url) {
    return creative.image_url
  }
  
  // Priority 4: object_story_spec link_data picture
  if (creative.object_story_spec?.link_data?.picture) {
    return creative.object_story_spec.link_data.picture
  }
  
  // Priority 5: asset_feed_spec URL (might expire)
  if (creative.asset_feed_spec?.images?.[0]?.url) {
    return creative.asset_feed_spec.images[0].url
  }
  
  // Priority 6: video thumbnail URLs
  if (creative.asset_feed_spec?.videos?.[0]?.thumbnail_url) {
    return creative.asset_feed_spec.videos[0].thumbnail_url
  }
  
  if (creative.thumbnail_url) {
    return creative.thumbnail_url
  }
  
  return null
}

export async function syncMetaEntities(job: Job<MetaSyncJobData>) {
  const { accountId, providerConnectionId, syncType, entityTypes } = job.data
  
  try {
    job.log(`Starting ${syncType} sync for account ${accountId}`)
    
    // Get the provider connection
    const connection = await prisma.providerConnection.findUnique({
      where: { id: providerConnectionId },
    })
    
    if (!connection || !connection.accessToken) {
      throw new Error('Invalid or missing provider connection')
    }
    
    // Check if token is expired
    if (connection.expiresAt && connection.expiresAt < new Date()) {
      throw new Error('Access token expired')
    }
    
    const entitiesToSync = entityTypes || ['adAccounts', 'campaigns', 'adGroups', 'ads']
    let progress = 0
    const totalSteps = entitiesToSync.length
    
    // 1. Sync Ad Accounts
    if (entitiesToSync.includes('adAccounts')) {
      await job.updateProgress((progress / totalSteps) * 100)
      job.log('Syncing ad accounts...')
      
      const adAccounts = await fetchMetaAdAccounts(connection.accessToken)
      
      for (const account of adAccounts) {
        await prisma.adAccount.upsert({
          where: {
            accountId_provider_externalId: {
              accountId,
              provider: 'meta',
              externalId: account.account_id,
            },
          },
          update: {
            name: account.name,
            currency: account.currency,
            timezone: account.timezone_name,
            status: getAccountStatus(account.account_status),
            metadata: {
              ...account,
              lastSyncedAt: new Date().toISOString(),
            },
          },
          create: {
            accountId,
            provider: 'meta',
            externalId: account.account_id,
            name: account.name,
            currency: account.currency,
            timezone: account.timezone_name,
            status: getAccountStatus(account.account_status),
            metadata: {
              ...account,
              lastSyncedAt: new Date().toISOString(),
            },
          },
        })
      }
      
      job.log(`Synced ${adAccounts.length} ad accounts`)
      progress++
    }
    
    // 2. Sync Campaigns
    if (entitiesToSync.includes('campaigns')) {
      await job.updateProgress((progress / totalSteps) * 100)
      job.log('Syncing campaigns...')
      
      const adAccounts = await prisma.adAccount.findMany({
        where: { accountId, provider: 'meta' },
      })
      
      let totalCampaigns = 0
      
      for (const adAccount of adAccounts) {
        const campaigns = await fetchMetaCampaigns(
          connection.accessToken,
          adAccount.externalId
        )
        
        for (const campaign of campaigns) {
          // Detect the channel for this campaign
          const channel = getMetaChannel(campaign)
          
          // Process insights data
          const insights = processMetaInsights(campaign.insights)
          
          await prisma.campaign.upsert({
            where: {
              accountId_provider_externalId: {
                accountId,
                provider: 'meta',
                externalId: campaign.id,
              },
            },
            update: {
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              channel,
              budgetAmount: campaign.daily_budget || campaign.lifetime_budget,
              budgetCurrency: adAccount.currency || 'USD',
              metadata: {
                ...campaign,
                insights,
                lastSyncedAt: new Date().toISOString(),
              },
            },
            create: {
              accountId,
              adAccountId: adAccount.id,
              provider: 'meta',
              channel,
              externalId: campaign.id,
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              budgetAmount: campaign.daily_budget || campaign.lifetime_budget,
              budgetCurrency: adAccount.currency || 'USD',
              metadata: {
                ...campaign,
                insights,
                lastSyncedAt: new Date().toISOString(),
              },
            },
          })
          totalCampaigns++
        }
      }
      
      job.log(`Synced ${totalCampaigns} campaigns`)
      progress++
    }
    
    // 3. Sync Ad Groups (Ad Sets in Meta)
    if (entitiesToSync.includes('adGroups')) {
      await job.updateProgress((progress / totalSteps) * 100)
      job.log('Syncing ad sets...')
      
      const campaigns = await prisma.campaign.findMany({
        where: { accountId, provider: 'meta' },
      })
      
      let totalAdSets = 0
      
      for (const campaign of campaigns) {
        const adSets = await fetchMetaAdSets(
          connection.accessToken,
          campaign.externalId
        )
        
        for (const adSet of adSets) {
          // Process insights data
          const insights = processMetaInsights(adSet.insights)
          
          await prisma.adGroup.upsert({
            where: {
              accountId_provider_externalId: {
                accountId,
                provider: 'meta',
                externalId: adSet.id,
              },
            },
            update: {
              name: adSet.name,
              status: adSet.status,
              channel: campaign.channel,
              budgetAmount: adSet.daily_budget || adSet.lifetime_budget,
              budgetCurrency: campaign.budgetCurrency || 'USD',
              metadata: {
                ...adSet,
                insights,
                lastSyncedAt: new Date().toISOString(),
              },
            },
            create: {
              accountId,
              campaignId: campaign.id,
              provider: 'meta',
              channel: campaign.channel,
              externalId: adSet.id,
              name: adSet.name,
              status: adSet.status,
              budgetAmount: adSet.daily_budget || adSet.lifetime_budget,
              budgetCurrency: campaign.budgetCurrency || 'USD',
              metadata: {
                ...adSet,
                insights,
                lastSyncedAt: new Date().toISOString(),
              },
            },
          })
          totalAdSets++
        }
      }
      
      job.log(`Synced ${totalAdSets} ad sets`)
      progress++
    }
    
    // 4. Sync Ads
    if (entitiesToSync.includes('ads')) {
      await job.updateProgress((progress / totalSteps) * 100)
      job.log('Syncing ads...')
      
      const adGroups = await prisma.adGroup.findMany({
        where: { accountId, provider: 'meta' },
      })
      
      let totalAds = 0
      
      for (const adGroup of adGroups) {
        const ads = await fetchMetaAds(
          connection.accessToken,
          adGroup.externalId
        )
        
        for (const ad of ads) {
          // Process insights data
          const insights = processMetaInsights(ad.insights)
          
          const upsertedAd = await prisma.ad.upsert({
            where: {
              accountId_provider_externalId: {
                accountId,
                provider: 'meta',
                externalId: ad.id,
              },
            },
            update: {
              name: ad.name,
              status: ad.status,
              channel: adGroup.channel,
              creative: ad.creative || {},
              metadata: {
                ...ad,
                insights,
                lastSyncedAt: new Date().toISOString(),
              },
            },
            create: {
              accountId,
              adGroupId: adGroup.id,
              provider: 'meta',
              channel: adGroup.channel,
              externalId: ad.id,
              name: ad.name,
              status: ad.status,
              creative: ad.creative || {},
              metadata: {
                ...ad,
                insights,
                lastSyncedAt: new Date().toISOString(),
              },
            },
          })
          
          // Download and store the ad's image
          if (ad.creative) {
            const imageUrl = getBestImageUrl(ad.creative)
            if (imageUrl) {
              // Don't await - do it in background to not slow down sync
              downloadAndStoreImage(accountId, upsertedAd.id, imageUrl, 'creative').catch(err => {
                console.error(`Failed to store image for ad ${ad.id}:`, err)
              })
            }
            
            // Store carousel images if it's a carousel ad
            if (ad.creative.object_story_spec?.link_data?.child_attachments?.length > 0) {
              ad.creative.object_story_spec.link_data.child_attachments.forEach((attachment: any, index: number) => {
                const carouselImageUrl = attachment.picture || attachment.image_url
                if (carouselImageUrl) {
                  downloadAndStoreImage(accountId, upsertedAd.id, carouselImageUrl, `carousel_${index}`).catch(err => {
                    console.error(`Failed to store carousel image ${index} for ad ${ad.id}:`, err)
                  })
                } else if (attachment.image_hash) {
                  // If we only have hash, we might need to try to resolve it
                  console.log(`Carousel card ${index} has only hash: ${attachment.image_hash}`)
                }
              })
            }
            
            // Also store video thumbnail if it's a video ad
            if (ad.creative.video_id || ad.creative.object_story_spec?.video_data) {
              const videoThumbUrl = ad.creative.object_story_spec?.video_data?.image_url ||
                                   ad.creative.thumbnail_url ||
                                   ad.creative.asset_feed_spec?.videos?.[0]?.thumbnail_url
              if (videoThumbUrl && videoThumbUrl !== imageUrl) {
                downloadAndStoreImage(accountId, upsertedAd.id, videoThumbUrl, 'video_thumbnail').catch(err => {
                  console.error(`Failed to store video thumbnail for ad ${ad.id}:`, err)
                })
              }
            }
          }
          
          totalAds++
        }
      }
      
      job.log(`Synced ${totalAds} ads`)
      progress++
    }
    
    await job.updateProgress(100)
    job.log('Sync completed successfully')
    
    return {
      success: true,
      syncType,
      timestamp: new Date().toISOString(),
    }
    
  } catch (error) {
    job.log(`Error during sync: ${error}`)
    throw error
  }
}

// Helper functions to fetch from Meta API
async function fetchMetaAdAccounts(accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/me/adaccounts?fields=id,account_id,name,account_status,currency,timezone_name,business&limit=200&access_token=${accessToken}`
  )
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to fetch ad accounts')
  }
  
  const data = await response.json()
  return data.data || []
}

async function fetchMetaCampaigns(accessToken: string, adAccountId: string) {
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time,insights{impressions,clicks,ctr,cpc,cpm,spend,actions,inline_link_clicks,inline_post_engagement,conversions,purchase_roas,website_purchase_roas}&limit=500&access_token=${accessToken}`
  )
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to fetch campaigns')
  }
  
  const data = await response.json()
  return data.data || []
}

async function fetchMetaAdSets(accessToken: string, campaignId: string) {
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,insights{impressions,clicks,ctr,cpc,cpm,spend,actions,inline_link_clicks,inline_post_engagement,conversions,purchase_roas,website_purchase_roas}&limit=500&access_token=${accessToken}`
  )
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to fetch ad sets')
  }
  
  const data = await response.json()
  return data.data || []
}

async function fetchMetaAds(accessToken: string, adSetId: string) {
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${adSetId}/ads?fields=id,name,status,creative{id,name,title,body,image_url,image_hash,thumbnail_url,object_story_spec,asset_feed_spec{images{url,hash,permalink_url,width,height,url_128},videos{url,video_id},bodies{text},titles{text},descriptions{text}},video_id},insights{impressions,clicks,ctr,cpc,cpm,spend,actions,inline_link_clicks,inline_post_engagement,conversions,purchase_roas,website_purchase_roas,cost_per_conversion}&limit=500&access_token=${accessToken}`
  )
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to fetch ads')
  }
  
  const data = await response.json()
  
  // For each ad, if we have image_hash, try to get the permalink URL
  for (const ad of data.data || []) {
    if (ad.creative?.image_hash) {
      try {
        const imageResponse = await fetch(
          `https://graph.facebook.com/${META_API_VERSION}/me/adimages?fields=id,permalink_url,name&hashes=${ad.creative.image_hash}&access_token=${accessToken}`
        )
        if (imageResponse.ok) {
          const imageData = await imageResponse.json()
          if (imageData.data && imageData.data.length > 0) {
            ad.creative.permalink_url = imageData.data[0].permalink_url
          }
        }
      } catch (error) {
        // If image fetch fails, continue with what we have
        console.warn(`Failed to fetch image URL for hash ${ad.creative.image_hash}:`, error)
      }
    }
  }
  
  return data.data || []
}

function getAccountStatus(statusCode: number): string {
  const statusMap: Record<number, string> = {
    1: 'active',
    2: 'disabled',
    3: 'unsettled',
    7: 'pending_risk_review',
    8: 'pending_settlement',
    9: 'in_grace_period',
    100: 'pending_closure',
    101: 'closed',
    201: 'any_active',
    202: 'any_closed',
  }
  return statusMap[statusCode] || 'unknown'
}