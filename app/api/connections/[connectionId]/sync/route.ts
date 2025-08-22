import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { convertCurrency } from "@/lib/currency"

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
        accountId: user.accountId
      }
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    const credentials = connection.credentials as any
    const accessToken = credentials?.accessToken

    if (!accessToken) {
      return NextResponse.json({ error: "No access token found" }, { status: 400 })
    }

    const selectedAccounts = credentials?.selectedAccountIds || credentials?.selectedAccounts || credentials?.accountIds || []
    
    if (selectedAccounts.length === 0) {
      return NextResponse.json({ error: "No accounts selected for sync" }, { status: 400 })
    }

    console.log(`Starting sync for ${selectedAccounts.length} accounts`)

    let totalCampaigns = 0
    let totalAds = 0
    let errors = []

    // Sync each selected account
    for (const accountId of selectedAccounts) {
      const adAccountExternalId = typeof accountId === 'string' ? accountId : accountId.id
      
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
            accountId: user.accountId,
            provider: "meta",
            externalId: adAccountExternalId
          }
        })
        
        if (!adAccount) {
          // Create the AdAccount if it doesn't exist
          adAccount = await prisma.adAccount.create({
            data: {
              accountId: user.accountId,
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
          fields: 'id,name,status,objective,daily_budget,lifetime_budget',
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
            
            await prisma.campaign.upsert({
              where: {
                accountId_provider_externalId: {
                  accountId: user.accountId,
                  provider: "meta",
                  externalId: campaign.id
                }
              },
              update: {
                name: campaign.name,
                status: campaign.status?.toLowerCase() || "unknown",
                objective: campaign.objective?.toLowerCase(),
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
                accountId: user.accountId,
                provider: "meta",
                externalId: campaign.id,
                name: campaign.name,
                status: campaign.status?.toLowerCase() || "unknown",
                objective: campaign.objective?.toLowerCase(),
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
        
        // Fetch campaign insights separately for metrics
        let allCampaignInsights: CampaignInsight[] = []
        let campaignsInsightsUrl: string | null = `https://graph.facebook.com/v21.0/${adAccountExternalId}/insights?` + new URLSearchParams({
          access_token: accessToken,
          level: 'campaign',
          fields: 'campaign_id,campaign_name,impressions,clicks,spend,cpc,cpm,ctr',
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
          // Convert monetary values from cents and to main currency
          const spendCents = parseFloat(insight.spend || '0')
          const spend = spendCents / 100
          const cpcCents = parseFloat(insight.cpc || '0')
          const cpc = cpcCents / 100
          const cpmCents = parseFloat(insight.cpm || '0')
          const cpm = cpmCents / 100
          
          const convertedSpend = await convertCurrency(spend, adAccountCurrency, mainCurrency)
          const convertedCpc = await convertCurrency(cpc, adAccountCurrency, mainCurrency)
          const convertedCpm = await convertCurrency(cpm, adAccountCurrency, mainCurrency)
          
          // Get existing campaign to preserve metadata
          const existingCampaign = await prisma.campaign.findFirst({
            where: {
              accountId: user.accountId,
              provider: "meta",
              externalId: insight.campaign_id
            }
          })
          
          if (existingCampaign) {
            const existingMetadata = existingCampaign.metadata as any || {}
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
                    originalCurrency: adAccountCurrency
                  }
                }
              }
            })
          }
        }
        
        // Fetch AdSets
        console.log(`  Fetching adsets...`)
        let adsetsUrl = `https://graph.facebook.com/v21.0/${adAccountExternalId}/adsets?` + new URLSearchParams({
          access_token: accessToken,
          fields: 'id,name,status,campaign_id,daily_budget,lifetime_budget',
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
                  accountId: user.accountId,
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
                  
                  await prisma.adGroup.upsert({
                    where: {
                      accountId_provider_externalId: {
                        accountId: user.accountId,
                        provider: "meta",
                        externalId: adset.id
                      }
                    },
                    update: {
                      name: adset.name,
                      status: adset.status?.toLowerCase() || "unknown",
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
                      accountId: user.accountId,
                      campaignId: campaign.id,
                      provider: "meta",
                      externalId: adset.id,
                      name: adset.name,
                      status: adset.status?.toLowerCase() || "unknown",
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
                  accountId: user.accountId,
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
                  if (ad.creative?.asset_feed_spec?.images && ad.creative.asset_feed_spec.images.length > 0) {
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
                  
                  await prisma.ad.upsert({
                    where: {
                      accountId_provider_externalId: {
                        accountId: user.accountId,
                        provider: "meta",
                        externalId: ad.id
                      }
                    },
                    update: {
                      name: ad.name,
                      status: ad.status?.toLowerCase() || "unknown",
                      creative: processedCreative,
                      metadata: {
                        lastSyncedAt: new Date().toISOString(),
                        rawData: ad,
                        // Store main image URL and all URLs for easier access
                        imageUrl: mainImageUrl,
                        allImageUrls: allImageUrls
                      }
                    },
                    create: {
                      accountId: user.accountId,
                      adGroupId: adGroup.id,
                      provider: "meta",
                      externalId: ad.id,
                      name: ad.name,
                      status: ad.status?.toLowerCase() || "unknown",
                      creative: processedCreative,
                      metadata: {
                        lastSyncedAt: new Date().toISOString(),
                        rawData: ad,
                        // Store main image URL and all URLs for easier access
                        imageUrl: mainImageUrl,
                        allImageUrls: allImageUrls
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
        
        // Fetch ad insights to get performance metrics
        if (totalAds > 0) {
          console.log(`  Fetching ad insights...`)
          let adInsightsUrl = `https://graph.facebook.com/v21.0/${adAccountExternalId}/insights?` + new URLSearchParams({
            access_token: accessToken,
            level: 'ad',
            fields: 'ad_id,ad_name,impressions,clicks,spend,cpc,cpm,ctr',
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
                // Convert monetary values from cents and to main currency
                const spendCents = parseFloat(insight.spend || '0')
                const spend = spendCents / 100
                const cpcCents = parseFloat(insight.cpc || '0')
                const cpc = cpcCents / 100
                const cpmCents = parseFloat(insight.cpm || '0')
                const cpm = cpmCents / 100
                
                const convertedSpend = await convertCurrency(spend, adAccountCurrency, mainCurrency)
                const convertedCpc = await convertCurrency(cpc, adAccountCurrency, mainCurrency)
                const convertedCpm = await convertCurrency(cpm, adAccountCurrency, mainCurrency)
                
                // First get the existing ad to preserve metadata
                const existingAd = await prisma.ad.findFirst({
                  where: {
                    accountId: user.accountId,
                    provider: "meta",
                    externalId: insight.ad_id
                  }
                })
                
                if (existingAd) {
                  const existingMetadata = existingAd.metadata as any || {}
                  await prisma.ad.update({
                    where: { id: existingAd.id },
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
                          originalCurrency: adAccountCurrency
                        }
                      }
                    }
                  })
                }
              }
            }
            
            adInsightsUrl = insightsData.paging?.next || null
          }
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