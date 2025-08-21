import { 
  AdAccount, 
  Campaign, 
  AdGroup, 
  Ad, 
  Insight,
  ProviderConnection 
} from "@prisma/client"

// Date range for data fetching
export interface DateRange {
  start: Date
  end: Date
}

// Normalized entities from providers
export interface NormalizedAdAccount {
  provider: string
  externalId: string
  name: string
  currency: string
  timezone: string
  status?: string
  metadata?: Record<string, any>
}

export interface NormalizedCampaign {
  provider: string
  externalId: string
  adAccountExternalId: string
  name: string
  status: string
  objective?: string
  budget?: number
  metadata?: Record<string, any>
}

export interface NormalizedAdGroup {
  provider: string
  externalId: string
  campaignExternalId: string
  name: string
  status: string
  budget?: number
  metadata?: Record<string, any>
}

export interface NormalizedAd {
  provider: string
  externalId: string
  adGroupExternalId: string
  name: string
  status: string
  creative?: Record<string, any>
  metadata?: Record<string, any>
}

export interface NormalizedInsight {
  provider: string
  entityType: 'ad_account' | 'campaign' | 'ad_group' | 'ad'
  entityExternalId: string
  date: Date
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue: number
  ctr?: number
  cpc?: number
  cpa?: number
  roas?: number
  frequency?: number
  extras?: Record<string, any>
}

// Sync result types
export interface SyncResult {
  success: boolean
  provider: string
  accountId: string
  stats: {
    adAccounts: number
    campaigns: number
    adGroups: number
    ads: number
    insights: number
  }
  errors?: string[]
}

// Provider change command (for future ad editing)
export interface ProviderChangeCommand {
  provider: string
  entityType: 'campaign' | 'ad_group' | 'ad'
  entityExternalId: string
  action: 'pause' | 'resume' | 'update_budget' | 'update_bid'
  payload: Record<string, any>
}

export interface ProviderChangeResult {
  success: boolean
  provider: string
  entityType: string
  entityExternalId: string
  error?: string
  metadata?: Record<string, any>
}

// Provider configuration
export interface ProviderConfig {
  provider: 'meta' | 'google'
  accessToken?: string
  refreshToken?: string
  appId?: string
  appSecret?: string
  developerToken?: string // Google specific
  customerId?: string // Google specific
  metadata?: Record<string, any>
}

// Main provider interface
export interface AdsProvider {
  // Provider identification
  readonly provider: string
  
  // List all ad accounts accessible by this connection
  listAdAccounts(connection: ProviderConnection): Promise<NormalizedAdAccount[]>
  
  // Sync all entities for an ad account
  syncEntities(
    accountId: string,
    adAccountExternalId: string,
    range: DateRange
  ): Promise<SyncResult>
  
  // Fetch insights for specific entities
  fetchInsights(
    level: 'ad_account' | 'campaign' | 'ad_group' | 'ad',
    externalIds: string[],
    range: DateRange
  ): Promise<NormalizedInsight[]>
  
  // Apply changes (future implementation)
  applyChange?(command: ProviderChangeCommand): Promise<ProviderChangeResult>
  
  // Validate connection
  validateConnection(connection: ProviderConnection): Promise<boolean>
  
  // Refresh access token if needed
  refreshAccessToken?(connection: ProviderConnection): Promise<ProviderConnection>
}