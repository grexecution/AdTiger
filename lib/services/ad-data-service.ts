import { PrismaClient } from '@prisma/client'

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class DataCache {
  private cache: Map<string, CacheEntry<any>> = new Map()

  set<T>(key: string, data: T, ttl: number = 300000): void {
    // Default 5 minutes TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    // Remove keys matching pattern
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }
}

const cache = new DataCache()

export interface AdWithMetrics {
  id: string
  name: string
  status: string | null
  externalId: string
  provider: string
  creative: any
  metadata: any
  createdAt: Date
  updatedAt: Date
  adGroupId: string
  channel: string | null
  adGroup?: {
    id: string
    name: string
    campaignId: string
    metadata: any
  }
  campaign?: {
    id: string
    name: string
    objective: string | null
    budgetAmount: number | null
    budgetCurrency: string | null
    adAccountId: string
  }
  // Aggregated metrics (from metadata.insights)
  metrics?: {
    impressions: number
    clicks: number
    spend: number
    conversions: number
    ctr: number
    cpc: number
    cpm: number
    likes: number
    comments: number
    shares: number
    videoViews: number
  }
  lastSyncedAt?: string
}

export class AdDataService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get ad by ID with full details and metrics
   */
  async getAdById(adId: string, useCache: boolean = true): Promise<AdWithMetrics | null> {
    const cacheKey = `ad:${adId}`

    // Check cache first
    if (useCache && cache.has(cacheKey)) {
      return cache.get<AdWithMetrics>(cacheKey)
    }

    const ad = await this.prisma.ad.findUnique({
      where: { id: adId },
      include: {
        adGroup: {
          select: {
            id: true,
            name: true,
            campaignId: true,
            metadata: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            objective: true,
            budgetAmount: true,
            budgetCurrency: true,
            adAccountId: true,
          },
        },
      },
    })

    if (!ad) return null

    const adWithMetrics = this.enrichAdWithMetrics(ad)

    // Cache the result
    if (useCache) {
      cache.set(cacheKey, adWithMetrics)
    }

    return adWithMetrics
  }

  /**
   * Get ads for a campaign with consistent metrics
   */
  async getAdsForCampaign(campaignId: string, useCache: boolean = true): Promise<AdWithMetrics[]> {
    const cacheKey = `campaign:${campaignId}:ads`

    // Check cache first
    if (useCache && cache.has(cacheKey)) {
      return cache.get<AdWithMetrics[]>(cacheKey) || []
    }

    const ads = await this.prisma.ad.findMany({
      where: {
        adGroup: {
          campaignId,
        },
      },
      include: {
        adGroup: {
          select: {
            id: true,
            name: true,
            campaignId: true,
            metadata: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            objective: true,
            budgetAmount: true,
            budgetCurrency: true,
            adAccountId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const adsWithMetrics = ads.map(ad => this.enrichAdWithMetrics(ad))

    // Cache the result
    if (useCache) {
      cache.set(cacheKey, adsWithMetrics)
    }

    return adsWithMetrics
  }

  /**
   * Get ads for an account with filters
   */
  async getAdsForAccount(
    accountId: string,
    filters?: {
      status?: string
      provider?: string
      channel?: string
      campaignId?: string
      adGroupId?: string
      search?: string
    },
    useCache: boolean = true
  ): Promise<AdWithMetrics[]> {
    const cacheKey = `account:${accountId}:ads:${JSON.stringify(filters || {})}`

    // Check cache first
    if (useCache && cache.has(cacheKey)) {
      return cache.get<AdWithMetrics[]>(cacheKey) || []
    }

    const where: any = {
      accountId,
    }

    if (filters?.status) where.status = filters.status
    if (filters?.provider) where.provider = filters.provider
    if (filters?.channel) where.channel = filters.channel
    if (filters?.adGroupId) where.adGroupId = filters.adGroupId
    if (filters?.campaignId) {
      where.adGroup = {
        campaignId: filters.campaignId,
      }
    }
    if (filters?.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      }
    }

    const ads = await this.prisma.ad.findMany({
      where,
      include: {
        adGroup: {
          select: {
            id: true,
            name: true,
            campaignId: true,
            metadata: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            objective: true,
            budgetAmount: true,
            budgetCurrency: true,
            adAccountId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const adsWithMetrics = ads.map(ad => this.enrichAdWithMetrics(ad))

    // Cache the result
    if (useCache) {
      cache.set(cacheKey, adsWithMetrics)
    }

    return adsWithMetrics
  }

  /**
   * Enrich ad data with metrics from metadata
   */
  private enrichAdWithMetrics(ad: any): AdWithMetrics {
    const insights = ad.metadata?.insights || {}
    const lastSyncedAt = ad.metadata?.lastSyncedAt || ad.updatedAt?.toISOString()

    return {
      ...ad,
      metrics: {
        impressions: insights.impressions || 0,
        clicks: insights.clicks || 0,
        spend: parseFloat(insights.spend || '0'),
        conversions: insights.conversions || 0,
        ctr: insights.ctr || 0,
        cpc: parseFloat(insights.cpc || '0'),
        cpm: parseFloat(insights.cpm || '0'),
        likes: insights.likes || 0,
        comments: insights.comments || 0,
        shares: insights.shares || 0,
        videoViews: insights.videoViews || 0,
      },
      lastSyncedAt,
    }
  }

  /**
   * Get summary metrics for a campaign
   */
  async getCampaignSummary(campaignId: string): Promise<{
    totalAds: number
    activeAds: number
    totalImpressions: number
    totalClicks: number
    totalSpend: number
    totalConversions: number
    avgCtr: number
    avgCpc: number
  }> {
    const ads = await this.getAdsForCampaign(campaignId)

    const summary = ads.reduce(
      (acc, ad) => ({
        totalAds: acc.totalAds + 1,
        activeAds: acc.activeAds + (ad.status === 'ACTIVE' ? 1 : 0),
        totalImpressions: acc.totalImpressions + (ad.metrics?.impressions || 0),
        totalClicks: acc.totalClicks + (ad.metrics?.clicks || 0),
        totalSpend: acc.totalSpend + (ad.metrics?.spend || 0),
        totalConversions: acc.totalConversions + (ad.metrics?.conversions || 0),
        avgCtr: 0,
        avgCpc: 0,
      }),
      {
        totalAds: 0,
        activeAds: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalSpend: 0,
        totalConversions: 0,
        avgCtr: 0,
        avgCpc: 0,
      }
    )

    // Calculate averages
    summary.avgCtr = summary.totalImpressions > 0 ? (summary.totalClicks / summary.totalImpressions) * 100 : 0
    summary.avgCpc = summary.totalClicks > 0 ? summary.totalSpend / summary.totalClicks : 0

    return summary
  }

  /**
   * Invalidate cache for specific entities
   */
  invalidateCache(pattern?: string): void {
    cache.invalidate(pattern)
  }

  /**
   * Refresh ad data from database
   */
  async refreshAd(adId: string): Promise<AdWithMetrics | null> {
    this.invalidateCache(`ad:${adId}`)
    return await this.getAdById(adId, false)
  }

  /**
   * Refresh campaign ads from database
   */
  async refreshCampaignAds(campaignId: string): Promise<AdWithMetrics[]> {
    this.invalidateCache(`campaign:${campaignId}`)
    return await this.getAdsForCampaign(campaignId, false)
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number } {
    return {
      size: (cache as any).cache.size,
    }
  }
}


