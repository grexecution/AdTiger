import { ProviderConnection } from "@prisma/client"
import {
  AdsProvider,
  DateRange,
  NormalizedAdAccount,
  NormalizedCampaign,
  NormalizedAdGroup,
  NormalizedAd,
  NormalizedInsight,
  SyncResult,
  ProviderChangeCommand,
  ProviderChangeResult
} from "./types"
import { prisma } from "@/lib/prisma"

// Meta Graph API base URL
const META_API_BASE = "https://graph.facebook.com/v18.0"

export class MetaAdsProvider implements AdsProvider {
  readonly provider = "meta"
  
  private async makeRequest(
    endpoint: string,
    accessToken: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    const url = new URL(`${META_API_BASE}${endpoint}`)
    
    // Add access token and other params
    url.searchParams.append("access_token", accessToken)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Meta API error: ${error.error?.message || response.statusText}`)
    }
    
    return response.json()
  }
  
  async listAdAccounts(connection: ProviderConnection): Promise<NormalizedAdAccount[]> {
    try {
      const accessToken = connection.accessToken || ""
      
      // Get user's ad accounts
      const response = await this.makeRequest(
        "/me/adaccounts",
        accessToken,
        {
          fields: "id,name,currency,timezone_name,account_status,business"
        }
      )
      
      return response.data.map((account: any) => ({
        provider: this.provider,
        externalId: account.id,
        name: account.name,
        currency: account.currency,
        timezone: account.timezone_name,
        status: this.mapAccountStatus(account.account_status),
        metadata: {
          businessId: account.business?.id,
          businessName: account.business?.name
        }
      }))
    } catch (error) {
      console.error("Error listing Meta ad accounts:", error)
      return []
    }
  }
  
  async syncEntities(
    accountId: string,
    adAccountExternalId: string,
    range: DateRange
  ): Promise<SyncResult> {
    const stats = {
      adAccounts: 0,
      campaigns: 0,
      adGroups: 0,
      ads: 0,
      insights: 0
    }
    const errors: string[] = []
    
    try {
      // Get the provider connection
      const connection = await prisma.providerConnection.findFirst({
        where: {
          accountId,
          provider: this.provider,
          isActive: true
        }
      })
      
      if (!connection) {
        throw new Error("No active Meta connection found")
      }
      
      const accessToken = connection.accessToken || ""
      
      // 1. Sync campaigns
      const campaignsResponse = await this.makeRequest(
        `/${adAccountExternalId}/campaigns`,
        accessToken,
        {
          fields: "id,name,status,objective,daily_budget,lifetime_budget",
          limit: 500
        }
      )
      
      for (const campaign of campaignsResponse.data) {
        const normalized: NormalizedCampaign = {
          provider: this.provider,
          externalId: campaign.id,
          adAccountExternalId,
          name: campaign.name,
          status: campaign.status.toLowerCase(),
          objective: campaign.objective,
          budget: campaign.daily_budget || campaign.lifetime_budget || 0,
          metadata: {
            budgetType: campaign.daily_budget ? "daily" : "lifetime"
          }
        }
        
        // Upsert campaign
        const adAccount = await prisma.adAccount.findFirst({
          where: {
            accountId,
            provider: this.provider,
            externalId: adAccountExternalId
          }
        })
        
        if (adAccount) {
          await prisma.campaign.upsert({
            where: {
              accountId_provider_externalId: {
                accountId,
                provider: this.provider,
                externalId: normalized.externalId
              }
            },
            update: {
              name: normalized.name,
              status: normalized.status,
              objective: normalized.objective,
              budgetAmount: normalized.budget,
              metadata: normalized.metadata
            },
            create: {
              accountId,
              adAccountId: adAccount.id,
              provider: this.provider,
              externalId: normalized.externalId,
              name: normalized.name,
              status: normalized.status,
              objective: normalized.objective,
              budgetAmount: normalized.budget,
              metadata: normalized.metadata
            }
          })
          stats.campaigns++
        }
        
        // 2. Sync ad sets (ad groups in our model)
        const adSetsResponse = await this.makeRequest(
          `/${campaign.id}/adsets`,
          accessToken,
          {
            fields: "id,name,status,daily_budget,lifetime_budget,targeting",
            limit: 500
          }
        )
        
        for (const adSet of adSetsResponse.data) {
          const normalizedAdGroup: NormalizedAdGroup = {
            provider: this.provider,
            externalId: adSet.id,
            campaignExternalId: campaign.id,
            name: adSet.name,
            status: adSet.status.toLowerCase(),
            budget: adSet.daily_budget || adSet.lifetime_budget || 0,
            metadata: {
              targeting: adSet.targeting
            }
          }
          
          const dbCampaign = await prisma.campaign.findFirst({
            where: {
              accountId,
              provider: this.provider,
              externalId: campaign.id
            }
          })
          
          if (dbCampaign) {
            await prisma.adGroup.upsert({
              where: {
                accountId_provider_externalId: {
                  accountId,
                  provider: this.provider,
                  externalId: normalizedAdGroup.externalId
                }
              },
              update: {
                name: normalizedAdGroup.name,
                status: normalizedAdGroup.status,
                budgetAmount: normalizedAdGroup.budget,
                metadata: normalizedAdGroup.metadata
              },
              create: {
                accountId,
                campaignId: dbCampaign.id,
                provider: this.provider,
                externalId: normalizedAdGroup.externalId,
                name: normalizedAdGroup.name,
                status: normalizedAdGroup.status,
                budgetAmount: normalizedAdGroup.budget,
                metadata: normalizedAdGroup.metadata
              }
            })
            stats.adGroups++
          }
          
          // 3. Sync ads
          const adsResponse = await this.makeRequest(
            `/${adSet.id}/ads`,
            accessToken,
            {
              fields: "id,name,status,creative",
              limit: 500
            }
          )
          
          for (const ad of adsResponse.data) {
            const normalizedAd: NormalizedAd = {
              provider: this.provider,
              externalId: ad.id,
              adGroupExternalId: adSet.id,
              name: ad.name || `Ad ${ad.id}`,
              status: ad.status.toLowerCase(),
              creative: ad.creative,
              metadata: {}
            }
            
            const dbAdGroup = await prisma.adGroup.findFirst({
              where: {
                accountId,
                provider: this.provider,
                externalId: adSet.id
              }
            })
            
            if (dbAdGroup) {
              await prisma.ad.upsert({
                where: {
                  accountId_provider_externalId: {
                    accountId,
                    provider: this.provider,
                    externalId: normalizedAd.externalId
                  }
                },
                update: {
                  name: normalizedAd.name,
                  status: normalizedAd.status,
                  creative: normalizedAd.creative,
                  metadata: normalizedAd.metadata
                },
                create: {
                  accountId,
                  adGroupId: dbAdGroup.id,
                  provider: this.provider,
                  externalId: normalizedAd.externalId,
                  name: normalizedAd.name,
                  status: normalizedAd.status,
                  creative: normalizedAd.creative,
                  metadata: normalizedAd.metadata
                }
              })
              stats.ads++
            }
          }
        }
      }
      
      // 4. Sync insights
      const insights = await this.fetchInsights(
        "campaign",
        campaignsResponse.data.map((c: any) => c.id),
        range
      )
      
      for (const insight of insights) {
        const campaign = await prisma.campaign.findFirst({
          where: {
            accountId,
            provider: this.provider,
            externalId: insight.entityExternalId
          }
        })
        
        if (campaign) {
          await prisma.insight.upsert({
            where: {
              accountId_provider_entityType_entityId_date_window: {
                accountId,
                provider: this.provider,
                entityType: insight.entityType,
                entityId: campaign.id,
                date: insight.date,
                window: "1d"
              }
            },
            update: {
              metrics: {
                impressions: insight.impressions,
                clicks: insight.clicks,
                spend: insight.spend,
                conversions: insight.conversions,
                revenue: insight.revenue,
                ctr: insight.ctr,
                cpc: insight.cpc,
                cpa: insight.cpa,
                roas: insight.roas,
                frequency: insight.frequency,
                ...insight.extras
              }
            },
            create: {
              accountId,
              provider: this.provider,
              entityType: insight.entityType,
              entityId: campaign.id,
              campaignId: campaign.id,
              date: insight.date,
              window: "1d",
              metrics: {
                impressions: insight.impressions,
                clicks: insight.clicks,
                spend: insight.spend,
                conversions: insight.conversions,
                revenue: insight.revenue,
                ctr: insight.ctr,
                cpc: insight.cpc,
                cpa: insight.cpa,
                roas: insight.roas,
                frequency: insight.frequency,
                ...insight.extras
              }
            }
          })
          stats.insights++
        }
      }
      
      return {
        success: true,
        provider: this.provider,
        accountId,
        stats,
        errors: errors.length > 0 ? errors : undefined
      }
      
    } catch (error) {
      console.error("Sync error:", error)
      return {
        success: false,
        provider: this.provider,
        accountId,
        stats,
        errors: [error instanceof Error ? error.message : "Unknown error"]
      }
    }
  }
  
  async fetchInsights(
    level: 'ad_account' | 'campaign' | 'ad_group' | 'ad',
    externalIds: string[],
    range: DateRange
  ): Promise<NormalizedInsight[]> {
    // Mock implementation for now
    // In production, this would make batch requests to Meta Insights API
    const insights: NormalizedInsight[] = []
    
    const startDate = range.start.toISOString().split('T')[0]
    const endDate = range.end.toISOString().split('T')[0]
    
    for (const externalId of externalIds) {
      // Generate mock data for each day in range
      const currentDate = new Date(range.start)
      while (currentDate <= range.end) {
        insights.push({
          provider: this.provider,
          entityType: level,
          entityExternalId: externalId,
          date: new Date(currentDate),
          impressions: Math.floor(Math.random() * 10000) + 1000,
          clicks: Math.floor(Math.random() * 500) + 50,
          spend: Math.random() * 100 + 20,
          conversions: Math.floor(Math.random() * 50) + 5,
          revenue: Math.random() * 500 + 100,
          ctr: Math.random() * 5,
          cpc: Math.random() * 2,
          cpa: Math.random() * 20,
          roas: Math.random() * 5 + 1,
          frequency: Math.random() * 3 + 1,
          extras: {
            reach: Math.floor(Math.random() * 5000) + 500,
            unique_clicks: Math.floor(Math.random() * 400) + 40
          }
        })
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }
    
    return insights
  }
  
  async applyChange(command: ProviderChangeCommand): Promise<ProviderChangeResult> {
    // Future implementation for applying changes to Meta ads
    return {
      success: false,
      provider: this.provider,
      entityType: command.entityType,
      entityExternalId: command.entityExternalId,
      error: "Not implemented yet"
    }
  }
  
  async validateConnection(connection: ProviderConnection): Promise<boolean> {
    try {
      const accessToken = connection.accessToken || ""
      const response = await this.makeRequest("/me", accessToken)
      return !!response.id
    } catch (error) {
      console.error("Connection validation failed:", error)
      return false
    }
  }
  
  async refreshAccessToken(connection: ProviderConnection): Promise<ProviderConnection> {
    // Meta uses long-lived tokens, so this is typically not needed
    // But you can implement token exchange here if needed
    return connection
  }
  
  private mapAccountStatus(status: number): string {
    const statusMap: Record<number, string> = {
      1: "active",
      2: "disabled",
      3: "unsettled",
      7: "pending_risk_review",
      8: "pending_settlement",
      9: "in_grace_period",
      100: "pending_closure",
      101: "closed",
      201: "any_active",
      202: "any_closed"
    }
    return statusMap[status] || "unknown"
  }
}