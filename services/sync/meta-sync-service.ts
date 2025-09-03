import { PrismaClient, SyncProvider, SyncType, SyncStatus } from '@prisma/client'
import { convertCurrency } from '@/lib/currency'

const META_API_VERSION = 'v21.0'

interface MetaSyncResult {
  success: boolean
  campaigns: number
  adSets: number
  ads: number
  insights: number
  errors: string[]
}

export class MetaSyncService {
  constructor(private prisma: PrismaClient) {}

  async syncAccount(
    accountId: string,
    connectionId: string,
    accessToken: string,
    syncType: SyncType = 'FULL'
  ): Promise<MetaSyncResult> {
    const startTime = new Date()
    let syncHistoryId: string | null = null
    
    const result: MetaSyncResult = {
      success: false,
      campaigns: 0,
      adSets: 0,
      ads: 0,
      insights: 0,
      errors: []
    }

    try {
      // Create sync history record
      const syncHistory = await this.prisma.syncHistory.create({
        data: {
          accountId,
          provider: SyncProvider.META,
          syncType,
          status: SyncStatus.SUCCESS, // Will update if fails
          startedAt: startTime,
          metadata: { connectionId }
        }
      })
      syncHistoryId = syncHistory.id

      // Get user account for currency conversion
      const account = await this.prisma.account.findUnique({
        where: { id: accountId }
      })
      const targetCurrency = account?.currency || 'USD'

      // Get connection metadata for selected accounts
      const connection = await this.prisma.connection.findUnique({
        where: { id: connectionId }
      })
      
      const credentials = connection?.credentials as any
      let selectedAccountIds: string[] = []
      
      if (credentials?.selectedAccountIds) {
        selectedAccountIds = credentials.selectedAccountIds
      } else if (credentials?.selectedAccounts) {
        selectedAccountIds = credentials.selectedAccounts.map((acc: any) => 
          typeof acc === 'string' ? acc : acc.id
        )
      }

      // Sync each ad account
      for (const adAccountId of selectedAccountIds) {
        try {
          await this.syncAdAccount(
            accountId,
            adAccountId,
            accessToken,
            targetCurrency,
            result
          )
        } catch (error) {
          const errorMsg = `Failed to sync ad account ${adAccountId}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(errorMsg)
          result.errors.push(errorMsg)
        }
      }

      result.success = result.errors.length === 0

      // Update sync history with results
      await this.prisma.syncHistory.update({
        where: { id: syncHistoryId },
        data: {
          status: result.success ? SyncStatus.SUCCESS : SyncStatus.FAILED,
          completedAt: new Date(),
          duration: Math.floor((new Date().getTime() - startTime.getTime()) / 1000),
          campaignsSync: result.campaigns,
          adGroupsSync: result.adSets,
          adsSync: result.ads,
          insightsSync: result.insights,
          errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null,
          errorCategory: result.errors.length > 0 ? 'SYNC_ERROR' : null
        }
      })

      // Update connection last sync time
      await this.prisma.connection.update({
        where: { id: connectionId },
        data: {
          metadata: {
            ...(connection?.metadata as any || {}),
            lastSyncAt: new Date().toISOString(),
            lastSyncResult: result
          }
        }
      })

    } catch (error) {
      console.error('Sync failed:', error)
      
      if (syncHistoryId) {
        await this.prisma.syncHistory.update({
          where: { id: syncHistoryId },
          data: {
            status: SyncStatus.FAILED,
            completedAt: new Date(),
            duration: Math.floor((new Date().getTime() - startTime.getTime()) / 1000),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorCategory: 'SYSTEM_ERROR'
          }
        })
      }
      
      throw error
    }

    return result
  }

  private async syncAdAccount(
    accountId: string,
    adAccountExternalId: string,
    accessToken: string,
    targetCurrency: string,
    result: MetaSyncResult
  ) {
    console.log(`Syncing Meta ad account: ${adAccountExternalId}`)

    // Fetch account details
    const accountUrl = `https://graph.facebook.com/${META_API_VERSION}/${adAccountExternalId}?` +
      new URLSearchParams({
        access_token: accessToken,
        fields: 'id,name,currency,timezone_name,account_status'
      })
    
    const accountResponse = await fetch(accountUrl)
    const accountData = await accountResponse.json()
    
    if (accountData.error) {
      throw new Error(accountData.error.message)
    }

    const adAccountCurrency = accountData.currency || 'USD'

    // Create or update AdAccount
    const adAccount = await this.prisma.adAccount.upsert({
      where: {
        accountId_provider_externalId: {
          accountId,
          provider: 'meta',
          externalId: adAccountExternalId
        }
      },
      update: {
        name: accountData.name || adAccountExternalId,
        currency: adAccountCurrency,
        timezone: accountData.timezone_name,
        status: accountData.account_status === 1 ? 'active' : 'paused',
        metadata: accountData
      },
      create: {
        accountId,
        provider: 'meta',
        externalId: adAccountExternalId,
        name: accountData.name || adAccountExternalId,
        currency: adAccountCurrency,
        timezone: accountData.timezone_name,
        status: accountData.account_status === 1 ? 'active' : 'paused',
        metadata: accountData
      }
    })

    // Sync campaigns
    await this.syncCampaigns(
      accountId,
      adAccount.id,
      adAccountExternalId,
      accessToken,
      adAccountCurrency,
      targetCurrency,
      result
    )

    // Sync ad sets
    await this.syncAdSets(
      accountId,
      adAccountExternalId,
      accessToken,
      adAccountCurrency,
      targetCurrency,
      result
    )

    // Sync ads
    await this.syncAds(
      accountId,
      adAccountExternalId,
      accessToken,
      result
    )

    // Sync insights (last 30 days daily breakdown)
    await this.syncInsights(
      accountId,
      adAccount.id,
      adAccountExternalId,
      accessToken,
      adAccountCurrency,
      targetCurrency,
      result
    )
  }

  private async syncCampaigns(
    accountId: string,
    adAccountId: string,
    adAccountExternalId: string,
    accessToken: string,
    sourceCurrency: string,
    targetCurrency: string,
    result: MetaSyncResult
  ) {
    let url: string | null = `https://graph.facebook.com/${META_API_VERSION}/${adAccountExternalId}/campaigns?` +
      new URLSearchParams({
        access_token: accessToken,
        fields: 'id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time',
        limit: '500'
      })

    while (url) {
      const response = await fetch(url)
      const data = await response.json()

      if (data.error) {
        result.errors.push(`Campaign sync error: ${data.error.message}`)
        break
      }

      if (data.data) {
        for (const campaign of data.data) {
          try {
            // Calculate budget
            const budgetCents = parseFloat(campaign.daily_budget || campaign.lifetime_budget || '0')
            const budgetAmount = budgetCents / 100
            const convertedBudget = await convertCurrency(budgetAmount, sourceCurrency, targetCurrency)

            // Check if campaign changed
            const existingCampaign = await this.prisma.campaign.findFirst({
              where: {
                accountId,
                provider: 'meta',
                externalId: campaign.id
              }
            })

            if (existingCampaign) {
              // Check for changes and log them
              const changes: any[] = []
              
              if (existingCampaign.name !== campaign.name) {
                changes.push({
                  fieldName: 'name',
                  oldValue: existingCampaign.name,
                  newValue: campaign.name
                })
              }
              
              if (existingCampaign.status !== campaign.status?.toLowerCase()) {
                changes.push({
                  fieldName: 'status',
                  oldValue: existingCampaign.status,
                  newValue: campaign.status?.toLowerCase()
                })
              }

              if (Math.abs((existingCampaign.budgetAmount || 0) - convertedBudget) > 0.01) {
                changes.push({
                  fieldName: 'budget',
                  oldValue: existingCampaign.budgetAmount,
                  newValue: convertedBudget
                })
              }

              // Log changes to ChangeHistory
              for (const change of changes) {
                await this.prisma.changeHistory.create({
                  data: {
                    accountId,
                    entityType: 'campaign',
                    entityId: existingCampaign.id,
                    externalId: campaign.id,
                    provider: 'meta',
                    changeType: 'update',
                    fieldName: change.fieldName,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    campaignId: existingCampaign.id
                  }
                })
              }
            }

            // Upsert campaign
            await this.prisma.campaign.upsert({
              where: {
                accountId_provider_externalId: {
                  accountId,
                  provider: 'meta',
                  externalId: campaign.id
                }
              },
              update: {
                name: campaign.name,
                status: campaign.status?.toLowerCase(),
                objective: campaign.objective?.toLowerCase(),
                budgetAmount: convertedBudget,
                budgetCurrency: targetCurrency,
                metadata: {
                  ...((existingCampaign?.metadata as any) || {}),
                  lastSyncedAt: new Date().toISOString(),
                  originalBudget: budgetAmount,
                  originalCurrency: sourceCurrency,
                  rawData: campaign
                }
              },
              create: {
                accountId,
                adAccountId,
                provider: 'meta',
                externalId: campaign.id,
                name: campaign.name,
                status: campaign.status?.toLowerCase(),
                objective: campaign.objective?.toLowerCase(),
                budgetAmount: convertedBudget,
                budgetCurrency: targetCurrency,
                channel: 'meta',
                metadata: {
                  lastSyncedAt: new Date().toISOString(),
                  originalBudget: budgetAmount,
                  originalCurrency: sourceCurrency,
                  rawData: campaign
                }
              }
            })

            result.campaigns++
          } catch (error) {
            console.error(`Error syncing campaign ${campaign.id}:`, error)
            result.errors.push(`Campaign ${campaign.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      url = data.paging?.next || null
    }
  }

  private async syncAdSets(
    accountId: string,
    adAccountExternalId: string,
    accessToken: string,
    sourceCurrency: string,
    targetCurrency: string,
    result: MetaSyncResult
  ) {
    let url: string | null = `https://graph.facebook.com/${META_API_VERSION}/${adAccountExternalId}/adsets?` +
      new URLSearchParams({
        access_token: accessToken,
        fields: 'id,name,status,campaign_id,daily_budget,lifetime_budget,targeting,created_time,updated_time',
        limit: '500'
      })

    while (url) {
      const response = await fetch(url)
      const data = await response.json()

      if (data.error) {
        result.errors.push(`AdSet sync error: ${data.error.message}`)
        break
      }

      if (data.data) {
        for (const adset of data.data) {
          try {
            // Find campaign
            const campaign = await this.prisma.campaign.findFirst({
              where: {
                accountId,
                provider: 'meta',
                externalId: adset.campaign_id
              }
            })

            if (!campaign) continue

            // Calculate budget
            const budgetCents = parseFloat(adset.daily_budget || adset.lifetime_budget || '0')
            const budgetAmount = budgetCents / 100
            const convertedBudget = await convertCurrency(budgetAmount, sourceCurrency, targetCurrency)

            // Detect channel from targeting
            let channel = 'facebook'
            if (adset.targeting?.publisher_platforms) {
              const platforms = adset.targeting.publisher_platforms
              if (platforms.length === 1 && platforms[0] === 'instagram') {
                channel = 'instagram'
              } else if (platforms.includes('messenger')) {
                channel = 'messenger'
              }
            }

            // Check for changes
            const existingAdGroup = await this.prisma.adGroup.findFirst({
              where: {
                accountId,
                provider: 'meta',
                externalId: adset.id
              }
            })

            if (existingAdGroup) {
              const changes: any[] = []
              
              if (existingAdGroup.name !== adset.name) {
                changes.push({
                  fieldName: 'name',
                  oldValue: existingAdGroup.name,
                  newValue: adset.name
                })
              }
              
              if (existingAdGroup.status !== adset.status?.toLowerCase()) {
                changes.push({
                  fieldName: 'status',
                  oldValue: existingAdGroup.status,
                  newValue: adset.status?.toLowerCase()
                })
              }

              // Log changes
              for (const change of changes) {
                await this.prisma.changeHistory.create({
                  data: {
                    accountId,
                    entityType: 'adGroup',
                    entityId: existingAdGroup.id,
                    externalId: adset.id,
                    provider: 'meta',
                    changeType: 'update',
                    fieldName: change.fieldName,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    campaignId: campaign.id,
                    adGroupId: existingAdGroup.id
                  }
                })
              }
            }

            // Upsert ad group
            await this.prisma.adGroup.upsert({
              where: {
                accountId_provider_externalId: {
                  accountId,
                  provider: 'meta',
                  externalId: adset.id
                }
              },
              update: {
                name: adset.name,
                status: adset.status?.toLowerCase(),
                channel,
                budgetAmount: convertedBudget,
                budgetCurrency: targetCurrency,
                metadata: {
                  lastSyncedAt: new Date().toISOString(),
                  originalBudget: budgetAmount,
                  originalCurrency: sourceCurrency,
                  rawData: adset
                }
              },
              create: {
                accountId,
                campaignId: campaign.id,
                provider: 'meta',
                externalId: adset.id,
                name: adset.name,
                status: adset.status?.toLowerCase(),
                channel,
                budgetAmount: convertedBudget,
                budgetCurrency: targetCurrency,
                metadata: {
                  lastSyncedAt: new Date().toISOString(),
                  originalBudget: budgetAmount,
                  originalCurrency: sourceCurrency,
                  rawData: adset
                }
              }
            })

            result.adSets++
          } catch (error) {
            console.error(`Error syncing adset ${adset.id}:`, error)
            result.errors.push(`AdSet ${adset.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      url = data.paging?.next || null
    }
  }

  private async syncAds(
    accountId: string,
    adAccountExternalId: string,
    accessToken: string,
    result: MetaSyncResult
  ) {
    let url: string | null = `https://graph.facebook.com/${META_API_VERSION}/${adAccountExternalId}/ads?` +
      new URLSearchParams({
        access_token: accessToken,
        fields: 'id,name,status,adset_id,creative{id,name,title,body,image_url,image_hash,thumbnail_url,object_story_spec,asset_feed_spec,call_to_action_type}',
        limit: '500'
      })

    while (url) {
      const response = await fetch(url)
      const data = await response.json()

      if (data.error) {
        result.errors.push(`Ad sync error: ${data.error.message}`)
        break
      }

      if (data.data) {
        for (const ad of data.data) {
          try {
            // Find ad group
            const adGroup = await this.prisma.adGroup.findFirst({
              where: {
                accountId,
                provider: 'meta',
                externalId: ad.adset_id
              }
            })

            if (!adGroup) continue

            // Check for changes
            const existingAd = await this.prisma.ad.findFirst({
              where: {
                accountId,
                provider: 'meta',
                externalId: ad.id
              }
            })

            if (existingAd) {
              const changes: any[] = []
              
              if (existingAd.name !== ad.name) {
                changes.push({
                  fieldName: 'name',
                  oldValue: existingAd.name,
                  newValue: ad.name
                })
              }
              
              if (existingAd.status !== ad.status?.toLowerCase()) {
                changes.push({
                  fieldName: 'status',
                  oldValue: existingAd.status,
                  newValue: ad.status?.toLowerCase()
                })
              }

              // Log changes
              for (const change of changes) {
                await this.prisma.changeHistory.create({
                  data: {
                    accountId,
                    entityType: 'ad',
                    entityId: existingAd.id,
                    externalId: ad.id,
                    provider: 'meta',
                    changeType: 'update',
                    fieldName: change.fieldName,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    adGroupId: adGroup.id,
                    adId: existingAd.id
                  }
                })
              }
            }

            // Upsert ad
            await this.prisma.ad.upsert({
              where: {
                accountId_provider_externalId: {
                  accountId,
                  provider: 'meta',
                  externalId: ad.id
                }
              },
              update: {
                name: ad.name,
                status: ad.status?.toLowerCase(),
                creative: ad.creative,
                metadata: {
                  lastSyncedAt: new Date().toISOString(),
                  rawData: ad
                }
              },
              create: {
                accountId,
                adGroupId: adGroup.id,
                provider: 'meta',
                externalId: ad.id,
                name: ad.name,
                status: ad.status?.toLowerCase(),
                channel: adGroup.channel,
                creative: ad.creative,
                metadata: {
                  lastSyncedAt: new Date().toISOString(),
                  rawData: ad
                }
              }
            })

            result.ads++
          } catch (error) {
            console.error(`Error syncing ad ${ad.id}:`, error)
            result.errors.push(`Ad ${ad.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      url = data.paging?.next || null
    }
  }

  private async syncInsights(
    accountId: string,
    adAccountId: string,
    adAccountExternalId: string,
    accessToken: string,
    sourceCurrency: string,
    targetCurrency: string,
    result: MetaSyncResult
  ) {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Sync daily insights for campaigns
    let url: string | null = `https://graph.facebook.com/${META_API_VERSION}/${adAccountExternalId}/insights?` +
      new URLSearchParams({
        access_token: accessToken,
        level: 'campaign',
        fields: 'campaign_id,impressions,clicks,spend,cpc,cpm,ctr,actions,conversions',
        time_range: JSON.stringify({
          since: thirtyDaysAgo.toISOString().split('T')[0],
          until: today.toISOString().split('T')[0]
        }),
        time_increment: '1',
        limit: '500'
      })

    while (url) {
      const response = await fetch(url)
      const data = await response.json()

      if (data.error) {
        result.errors.push(`Insights sync error: ${data.error.message}`)
        break
      }

      if (data.data) {
        for (const insight of data.data) {
          try {
            const campaign = await this.prisma.campaign.findFirst({
              where: {
                accountId,
                provider: 'meta',
                externalId: insight.campaign_id
              }
            })

            if (!campaign) continue

            const date = new Date(insight.date_start)
            
            // Convert monetary values
            const spend = parseFloat(insight.spend || '0')
            const cpc = parseFloat(insight.cpc || '0')
            const cpm = parseFloat(insight.cpm || '0')
            
            const convertedSpend = await convertCurrency(spend, sourceCurrency, targetCurrency)
            const convertedCpc = await convertCurrency(cpc, sourceCurrency, targetCurrency)
            const convertedCpm = await convertCurrency(cpm, sourceCurrency, targetCurrency)

            // Extract conversion metrics
            let conversions = 0
            if (insight.actions && Array.isArray(insight.actions)) {
              for (const action of insight.actions) {
                if (action.action_type === 'purchase' || 
                    action.action_type === 'lead' ||
                    action.action_type?.includes('conversion')) {
                  conversions += parseInt(action.value) || 0
                }
              }
            }

            // Upsert insight
            await this.prisma.insight.upsert({
              where: {
                accountId_provider_entityType_entityId_date_window: {
                  accountId,
                  provider: 'meta',
                  entityType: 'campaign',
                  entityId: campaign.id,
                  date,
                  window: '1d'
                }
              },
              update: {
                metrics: {
                  impressions: parseInt(insight.impressions || '0'),
                  clicks: parseInt(insight.clicks || '0'),
                  spend: convertedSpend,
                  cpc: convertedCpc,
                  cpm: convertedCpm,
                  ctr: parseFloat(insight.ctr || '0'),
                  conversions,
                  currency: targetCurrency,
                  originalSpend: spend,
                  originalCurrency: sourceCurrency
                },
                updatedAt: new Date()
              },
              create: {
                accountId,
                provider: 'meta',
                entityType: 'campaign',
                entityId: campaign.id,
                campaignId: campaign.id,
                adAccountId,
                date,
                window: '1d',
                metrics: {
                  impressions: parseInt(insight.impressions || '0'),
                  clicks: parseInt(insight.clicks || '0'),
                  spend: convertedSpend,
                  cpc: convertedCpc,
                  cpm: convertedCpm,
                  ctr: parseFloat(insight.ctr || '0'),
                  conversions,
                  currency: targetCurrency,
                  originalSpend: spend,
                  originalCurrency: sourceCurrency
                }
              }
            })

            result.insights++
          } catch (error) {
            console.error(`Error syncing insight for campaign ${insight.campaign_id}:`, error)
            result.errors.push(`Insight ${insight.campaign_id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      url = data.paging?.next || null
    }

    // Also sync ad-level insights for better granularity
    url = `https://graph.facebook.com/${META_API_VERSION}/${adAccountExternalId}/insights?` +
      new URLSearchParams({
        access_token: accessToken,
        level: 'ad',
        fields: 'ad_id,impressions,clicks,spend,cpc,cpm,ctr,actions',
        time_range: JSON.stringify({
          since: thirtyDaysAgo.toISOString().split('T')[0],
          until: today.toISOString().split('T')[0]
        }),
        time_increment: '1',
        limit: '500'
      })

    while (url) {
      const response = await fetch(url)
      const data = await response.json()

      if (data.error) {
        console.error('Ad insights error (non-critical):', data.error.message)
        break
      }

      if (data.data) {
        for (const insight of data.data) {
          try {
            const ad = await this.prisma.ad.findFirst({
              where: {
                accountId,
                provider: 'meta',
                externalId: insight.ad_id
              },
              include: {
                adGroup: {
                  include: {
                    campaign: true
                  }
                }
              }
            })

            if (!ad) continue

            const date = new Date(insight.date_start)
            
            // Convert monetary values
            const spend = parseFloat(insight.spend || '0')
            const cpc = parseFloat(insight.cpc || '0')
            const cpm = parseFloat(insight.cpm || '0')
            
            const convertedSpend = await convertCurrency(spend, sourceCurrency, targetCurrency)
            const convertedCpc = await convertCurrency(cpc, sourceCurrency, targetCurrency)
            const convertedCpm = await convertCurrency(cpm, sourceCurrency, targetCurrency)

            // Upsert ad insight
            await this.prisma.insight.upsert({
              where: {
                accountId_provider_entityType_entityId_date_window: {
                  accountId,
                  provider: 'meta',
                  entityType: 'ad',
                  entityId: ad.id,
                  date,
                  window: '1d'
                }
              },
              update: {
                metrics: {
                  impressions: parseInt(insight.impressions || '0'),
                  clicks: parseInt(insight.clicks || '0'),
                  spend: convertedSpend,
                  cpc: convertedCpc,
                  cpm: convertedCpm,
                  ctr: parseFloat(insight.ctr || '0'),
                  currency: targetCurrency,
                  originalSpend: spend,
                  originalCurrency: sourceCurrency
                },
                updatedAt: new Date()
              },
              create: {
                accountId,
                provider: 'meta',
                entityType: 'ad',
                entityId: ad.id,
                adId: ad.id,
                adGroupId: ad.adGroupId,
                campaignId: ad.adGroup.campaignId,
                adAccountId,
                date,
                window: '1d',
                metrics: {
                  impressions: parseInt(insight.impressions || '0'),
                  clicks: parseInt(insight.clicks || '0'),
                  spend: convertedSpend,
                  cpc: convertedCpc,
                  cpm: convertedCpm,
                  ctr: parseFloat(insight.ctr || '0'),
                  currency: targetCurrency,
                  originalSpend: spend,
                  originalCurrency: sourceCurrency
                }
              }
            })

            result.insights++
          } catch (error) {
            console.error(`Error syncing ad insight ${insight.ad_id}:`, error)
          }
        }
      }

      url = data.paging?.next || null
    }
  }
}