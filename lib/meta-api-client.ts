import { META_APP_ID, META_APP_SECRET } from './constants'

const META_API_VERSION = 'v18.0'
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`

export interface MetaAdAccount {
  id: string
  name: string
  currency: string
  timezone_name: string
  account_status: number
  business?: {
    id: string
    name: string
  }
}

export interface MetaCampaign {
  id: string
  name: string
  status: string
  objective: string
  daily_budget?: string
  lifetime_budget?: string
  budget_remaining?: string
  created_time: string
  updated_time: string
  effective_status: string
}

export interface MetaAdSet {
  id: string
  name: string
  status: string
  daily_budget?: string
  lifetime_budget?: string
  campaign_id: string
  targeting?: any
  optimization_goal?: string
  created_time: string
  updated_time: string
  effective_status: string
}

export interface MetaAd {
  id: string
  name: string
  status: string
  adset_id: string
  creative?: {
    id: string
    name: string
  }
  created_time: string
  updated_time: string
  effective_status: string
}

export interface MetaInsight {
  impressions?: string
  clicks?: string
  spend?: string
  ctr?: string
  cpc?: string
  cpm?: string
  conversions?: string
  conversion_value?: string
  frequency?: string
  reach?: string
  date_start: string
  date_stop: string
}

export class MetaApiClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${META_API_BASE_URL}${endpoint}`)
    
    // Add access token
    url.searchParams.append('access_token', this.accessToken)
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw new Error(`Meta API Error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data
  }

  // Get user's ad accounts
  async getAdAccounts(): Promise<{ data: MetaAdAccount[] }> {
    // For test API, we'll return mock data since test apps can't access real accounts
    if (this.accessToken.startsWith('test_')) {
      return {
        data: [
          {
            id: 'act_123456789',
            name: 'Test Ad Account',
            currency: 'USD',
            timezone_name: 'America/New_York',
            account_status: 1,
            business: {
              id: 'biz_123',
              name: 'Test Business'
            }
          }
        ]
      }
    }

    return this.makeRequest<{ data: MetaAdAccount[] }>('/me/adaccounts', {
      fields: 'id,name,currency,timezone_name,account_status,business{id,name}'
    })
  }

  // Get campaigns for an ad account
  async getCampaigns(adAccountId: string): Promise<{ data: MetaCampaign[] }> {
    // For test API, return mock campaigns
    if (this.accessToken.startsWith('test_') || META_APP_ID === '1234567890123456') {
      return {
        data: [
          {
            id: 'campaign_1',
            name: 'Summer Sale Campaign',
            status: 'ACTIVE',
            objective: 'CONVERSIONS',
            daily_budget: '10000',
            created_time: '2024-01-15T10:00:00Z',
            updated_time: '2024-01-20T15:30:00Z',
            effective_status: 'ACTIVE'
          },
          {
            id: 'campaign_2',
            name: 'Brand Awareness Push',
            status: 'ACTIVE',
            objective: 'BRAND_AWARENESS',
            daily_budget: '5000',
            created_time: '2024-01-10T09:00:00Z',
            updated_time: '2024-01-18T14:20:00Z',
            effective_status: 'ACTIVE'
          },
          {
            id: 'campaign_3',
            name: 'Holiday Special Offers',
            status: 'PAUSED',
            objective: 'TRAFFIC',
            lifetime_budget: '50000',
            budget_remaining: '12000',
            created_time: '2023-12-01T08:00:00Z',
            updated_time: '2024-01-05T16:45:00Z',
            effective_status: 'PAUSED'
          }
        ]
      }
    }

    return this.makeRequest<{ data: MetaCampaign[] }>(`/${adAccountId}/campaigns`, {
      fields: 'id,name,status,objective,daily_budget,lifetime_budget,budget_remaining,created_time,updated_time,effective_status'
    })
  }

  // Get ad sets for a campaign
  async getAdSets(campaignId: string): Promise<{ data: MetaAdSet[] }> {
    // For test API, return mock ad sets
    if (this.accessToken.startsWith('test_') || META_APP_ID === '1234567890123456') {
      return {
        data: [
          {
            id: `adset_${campaignId}_1`,
            name: 'Targeting: Ages 25-34',
            status: 'ACTIVE',
            daily_budget: '5000',
            campaign_id: campaignId,
            optimization_goal: 'CONVERSIONS',
            created_time: '2024-01-15T10:00:00Z',
            updated_time: '2024-01-20T15:30:00Z',
            effective_status: 'ACTIVE'
          },
          {
            id: `adset_${campaignId}_2`,
            name: 'Targeting: Ages 35-44',
            status: 'ACTIVE',
            daily_budget: '5000',
            campaign_id: campaignId,
            optimization_goal: 'CONVERSIONS',
            created_time: '2024-01-15T10:00:00Z',
            updated_time: '2024-01-20T15:30:00Z',
            effective_status: 'ACTIVE'
          }
        ]
      }
    }

    return this.makeRequest<{ data: MetaAdSet[] }>(`/${campaignId}/adsets`, {
      fields: 'id,name,status,daily_budget,lifetime_budget,campaign_id,optimization_goal,created_time,updated_time,effective_status'
    })
  }

  // Get ads for an ad set
  async getAds(adSetId: string): Promise<{ data: MetaAd[] }> {
    // For test API, return mock ads
    if (this.accessToken.startsWith('test_') || META_APP_ID === '1234567890123456') {
      return {
        data: [
          {
            id: `ad_${adSetId}_1`,
            name: 'Creative A - Image',
            status: 'ACTIVE',
            adset_id: adSetId,
            creative: {
              id: 'creative_1',
              name: 'Summer Sale Creative'
            },
            created_time: '2024-01-15T10:00:00Z',
            updated_time: '2024-01-20T15:30:00Z',
            effective_status: 'ACTIVE'
          },
          {
            id: `ad_${adSetId}_2`,
            name: 'Creative B - Video',
            status: 'ACTIVE',
            adset_id: adSetId,
            creative: {
              id: 'creative_2',
              name: 'Product Demo Video'
            },
            created_time: '2024-01-15T10:00:00Z',
            updated_time: '2024-01-20T15:30:00Z',
            effective_status: 'ACTIVE'
          }
        ]
      }
    }

    return this.makeRequest<{ data: MetaAd[] }>(`/${adSetId}/ads`, {
      fields: 'id,name,status,adset_id,creative{id,name},created_time,updated_time,effective_status'
    })
  }

  // Get insights for campaigns
  async getCampaignInsights(
    campaignId: string,
    datePreset: string = 'last_7d'
  ): Promise<{ data: MetaInsight[] }> {
    // For test API, return mock insights
    if (this.accessToken.startsWith('test_') || META_APP_ID === '1234567890123456') {
      return {
        data: [
          {
            impressions: '125000',
            clicks: '3500',
            spend: '450.00',
            ctr: '2.8',
            cpc: '0.13',
            cpm: '3.60',
            conversions: '85',
            conversion_value: '8500.00',
            frequency: '1.4',
            reach: '89285',
            date_start: '2024-01-14',
            date_stop: '2024-01-20'
          }
        ]
      }
    }

    return this.makeRequest<{ data: MetaInsight[] }>(`/${campaignId}/insights`, {
      fields: 'impressions,clicks,spend,ctr,cpc,cpm,conversions,conversion_value,frequency,reach',
      date_preset: datePreset
    })
  }

  // Validate access token
  async validateToken(): Promise<boolean> {
    try {
      // For test API, always return true
      if (this.accessToken.startsWith('test_') || META_APP_ID === '1234567890123456') {
        return true
      }

      const response = await this.makeRequest<{ id: string }>('/me', {
        fields: 'id'
      })
      return !!response.id
    } catch {
      return false
    }
  }
}

// Helper function to get client with current token
export function getMetaApiClient(accessToken: string): MetaApiClient {
  return new MetaApiClient(accessToken)
}