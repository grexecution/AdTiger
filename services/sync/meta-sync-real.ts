import { PrismaClient } from "@prisma/client"
import { getMetaApiClient, type MetaApiClient } from "@/lib/meta-api-client"
import { ChangeTrackingService } from "../change-tracking"

export class MetaRealSyncService {
  private changeTracker: ChangeTrackingService

  constructor(private prisma: PrismaClient) {
    this.changeTracker = new ChangeTrackingService(prisma)
  }

  async syncAccount(accountId: string, accessToken?: string) {
    // Get provider connection with access token
    const connection = await this.prisma.providerConnection.findFirst({
      where: {
        accountId,
        provider: "meta",
        isActive: true
      }
    })

    if (!connection) {
      throw new Error("No active Meta connection found")
    }

    // Use provided token or connection token
    const token = accessToken || (connection.accessToken as string)
    if (!token) {
      throw new Error("No access token available")
    }

    const client = getMetaApiClient(token)
    
    // Track sync progress
    let recordsSynced = 0
    const syncResults = {
      adAccounts: 0,
      campaigns: 0,
      adSets: 0,
      ads: 0,
      insights: 0,
      errors: [] as string[]
    }

    try {
      // 1. Sync Ad Accounts
      console.log("Fetching Meta ad accounts...")
      const adAccountsResponse = await client.getAdAccounts()
      
      for (const adAccountData of adAccountsResponse.data) {
        const adAccount = await this.prisma.adAccount.upsert({
          where: {
            accountId_provider_externalId: {
              accountId,
              provider: "meta",
              externalId: adAccountData.id
            }
          },
          update: {
            name: adAccountData.name,
            currency: adAccountData.currency,
            timezone: adAccountData.timezone_name,
            status: this.mapAccountStatus(adAccountData.account_status),
            metadata: {
              business: adAccountData.business,
              rawStatus: adAccountData.account_status
            },
            updatedAt: new Date()
          },
          create: {
            accountId,
            provider: "meta",
            externalId: adAccountData.id,
            name: adAccountData.name,
            currency: adAccountData.currency,
            timezone: adAccountData.timezone_name,
            status: this.mapAccountStatus(adAccountData.account_status),
            metadata: {
              business: adAccountData.business,
              rawStatus: adAccountData.account_status
            }
          }
        })
        syncResults.adAccounts++

        // 2. Sync Campaigns for each Ad Account
        console.log(`Fetching campaigns for account ${adAccountData.name}...`)
        const campaignsResponse = await client.getCampaigns(adAccountData.id)
        
        for (const campaignData of campaignsResponse.data) {
          // Check if campaign exists
          const existingCampaign = await this.prisma.campaign.findUnique({
            where: {
              accountId_provider_externalId: {
                accountId,
                provider: "meta",
                externalId: campaignData.id
              }
            }
          })

          const newCampaignData = {
            name: campaignData.name,
            status: campaignData.effective_status,
            objective: campaignData.objective,
            budgetAmount: this.parseBudget(campaignData.daily_budget || campaignData.lifetime_budget),
            budgetCurrency: adAccount.currency || 'USD',
            metadata: {
              dailyBudget: campaignData.daily_budget,
              lifetimeBudget: campaignData.lifetime_budget,
              budgetRemaining: campaignData.budget_remaining,
              rawStatus: campaignData.status,
              effectiveStatus: campaignData.effective_status,
              createdTime: campaignData.created_time,
              updatedTime: campaignData.updated_time
            }
          }

          // If campaign exists, track changes
          if (existingCampaign) {
            await this.changeTracker.trackCampaignChanges(
              accountId,
              existingCampaign,
              newCampaignData
            )
          }

          const campaign = await this.prisma.campaign.upsert({
            where: {
              accountId_provider_externalId: {
                accountId,
                provider: "meta",
                externalId: campaignData.id
              }
            },
            update: {
              ...newCampaignData,
              updatedAt: new Date()
            },
            create: {
              accountId,
              adAccountId: adAccount.id,
              provider: "meta",
              externalId: campaignData.id,
              ...newCampaignData
            }
          })
          
          // Track campaign creation if it's new
          if (!existingCampaign) {
            await this.changeTracker.trackCampaignCreation(accountId, campaign)
          }
          
          syncResults.campaigns++

          // 3. Sync Ad Sets for each Campaign
          console.log(`Fetching ad sets for campaign ${campaignData.name}...`)
          const adSetsResponse = await client.getAdSets(campaignData.id)
          
          for (const adSetData of adSetsResponse.data) {
            const adSet = await this.prisma.adGroup.upsert({
              where: {
                accountId_provider_externalId: {
                  accountId,
                  provider: "meta",
                  externalId: adSetData.id
                }
              },
              update: {
                name: adSetData.name,
                status: adSetData.effective_status,
                budgetAmount: this.parseBudget(adSetData.daily_budget || adSetData.lifetime_budget),
                metadata: {
                  dailyBudget: adSetData.daily_budget,
                  lifetimeBudget: adSetData.lifetime_budget,
                  optimizationGoal: adSetData.optimization_goal,
                  rawStatus: adSetData.status,
                  effectiveStatus: adSetData.effective_status,
                  createdTime: adSetData.created_time,
                  updatedTime: adSetData.updated_time
                },
                updatedAt: new Date()
              },
              create: {
                accountId,
                campaignId: campaign.id,
                provider: "meta",
                externalId: adSetData.id,
                name: adSetData.name,
                status: adSetData.effective_status,
                budgetAmount: this.parseBudget(adSetData.daily_budget || adSetData.lifetime_budget),
                metadata: {
                  dailyBudget: adSetData.daily_budget,
                  lifetimeBudget: adSetData.lifetime_budget,
                  optimizationGoal: adSetData.optimization_goal,
                  rawStatus: adSetData.status,
                  effectiveStatus: adSetData.effective_status,
                  createdTime: adSetData.created_time,
                  updatedTime: adSetData.updated_time
                }
              }
            })
            syncResults.adSets++

            // 4. Sync Ads for each Ad Set
            console.log(`Fetching ads for ad set ${adSetData.name}...`)
            const adsResponse = await client.getAds(adSetData.id)
            
            for (const adData of adsResponse.data) {
              await this.prisma.ad.upsert({
                where: {
                  accountId_provider_externalId: {
                    accountId,
                    provider: "meta",
                    externalId: adData.id
                  }
                },
                update: {
                  name: adData.name,
                  status: adData.effective_status,
                  metadata: {
                    creative: adData.creative,
                    rawStatus: adData.status,
                    effectiveStatus: adData.effective_status,
                    createdTime: adData.created_time,
                    updatedTime: adData.updated_time
                  },
                  updatedAt: new Date()
                },
                create: {
                  accountId,
                  adGroupId: adSet.id,
                  provider: "meta",
                  externalId: adData.id,
                  name: adData.name,
                  status: adData.effective_status,
                  creative: adData.creative,
                  metadata: {
                    creative: adData.creative,
                    rawStatus: adData.status,
                    effectiveStatus: adData.effective_status,
                    createdTime: adData.created_time,
                    updatedTime: adData.updated_time
                  }
                }
              })
              syncResults.ads++
            }
          }

          // 5. Sync Campaign Insights
          try {
            console.log(`Fetching insights for campaign ${campaignData.name}...`)
            const insightsResponse = await client.getCampaignInsights(campaignData.id)
            
            for (const insightData of insightsResponse.data) {
              const insightDate = new Date(insightData.date_start)
              
              await this.prisma.insight.upsert({
                where: {
                  accountId_provider_entityType_entityId_date_window: {
                    accountId,
                    provider: "meta",
                    entityType: "campaign",
                    entityId: campaign.id,
                    date: insightDate,
                    window: "7d"
                  }
                },
                update: {
                  metrics: {
                    impressions: parseInt(insightData.impressions || '0'),
                    clicks: parseInt(insightData.clicks || '0'),
                    spend: parseFloat(insightData.spend || '0'),
                    ctr: parseFloat(insightData.ctr || '0'),
                    cpc: parseFloat(insightData.cpc || '0'),
                    cpm: parseFloat(insightData.cpm || '0'),
                    conversions: parseInt(insightData.conversions || '0'),
                    conversionValue: parseFloat(insightData.conversion_value || '0'),
                    frequency: parseFloat(insightData.frequency || '0'),
                    reach: parseInt(insightData.reach || '0'),
                    dateStart: insightData.date_start,
                    dateStop: insightData.date_stop
                  },
                  updatedAt: new Date()
                },
                create: {
                  accountId,
                  provider: "meta",
                  entityType: "campaign",
                  entityId: campaign.id,
                  campaignId: campaign.id,
                  date: insightDate,
                  window: "7d",
                  metrics: {
                    impressions: parseInt(insightData.impressions || '0'),
                    clicks: parseInt(insightData.clicks || '0'),
                    spend: parseFloat(insightData.spend || '0'),
                    ctr: parseFloat(insightData.ctr || '0'),
                    cpc: parseFloat(insightData.cpc || '0'),
                    cpm: parseFloat(insightData.cpm || '0'),
                    conversions: parseInt(insightData.conversions || '0'),
                    conversionValue: parseFloat(insightData.conversion_value || '0'),
                    frequency: parseFloat(insightData.frequency || '0'),
                    reach: parseInt(insightData.reach || '0'),
                    dateStart: insightData.date_start,
                    dateStop: insightData.date_stop
                  }
                }
              })
              syncResults.insights++
            }
          } catch (error) {
            console.error(`Failed to sync insights for campaign ${campaignData.id}:`, error)
            syncResults.errors.push(`Campaign ${campaignData.name} insights: ${error}`)
          }
        }
      }

      // Record successful sync
      await this.prisma.syncJob.create({
        data: {
          accountId,
          provider: "meta",
          type: "full",
          status: "completed",
          metadata: syncResults,
          completedAt: new Date()
        }
      })

      console.log("Meta sync completed successfully:", syncResults)
      return syncResults

    } catch (error) {
      // Record failed sync
      await this.prisma.syncJob.create({
        data: {
          accountId,
          provider: "meta",
          type: "full",
          status: "failed",
          errors: error instanceof Error ? { message: error.message } : { message: "Unknown error" },
          metadata: syncResults
        }
      })

      throw error
    }
  }

  private mapAccountStatus(status: number): string {
    // Meta account status codes
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
      202: 'any_closed'
    }
    return statusMap[status] || 'unknown'
  }

  private parseBudget(budgetString?: string): number | null {
    if (!budgetString) return null
    // Meta returns budget in cents
    return parseFloat(budgetString) / 100
  }
}