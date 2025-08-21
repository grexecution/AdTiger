import { PrismaClient } from '@prisma/client'
import { differenceInDays, subDays, startOfDay, endOfDay, format } from 'date-fns'

interface PerformanceMetrics {
  impressions: number
  clicks: number
  spend: number
  conversions: number
  ctr: number
  cpc: number
  cpm: number
  cvr: number
  roas: number
  revenue?: number
}

interface TrendAnalysis {
  score: number // -1 to 1
  volatility: number // 0 to 1
  direction: 'improving' | 'declining' | 'stable'
  changePercent: number
}

export class PerformanceTrackingService {
  private readonly MAX_RETENTION_DAYS = 365 // 1 year
  private readonly AGGREGATION_PERIODS = ['7d', '30d'] as const // Reduced for efficiency
  
  constructor(private prisma: PrismaClient) {}

  /**
   * Store daily performance data efficiently
   */
  async storePerformanceData(
    accountId: string,
    entityType: 'campaign' | 'ad_group' | 'ad',
    entityId: string,
    provider: string,
    date: Date,
    metrics: PerformanceMetrics
  ) {
    // Store daily insight
    const insight = await this.prisma.insight.upsert({
      where: {
        accountId_provider_entityType_entityId_date_window: {
          accountId,
          provider,
          entityType,
          entityId,
          date: startOfDay(date),
          window: 'day'
        }
      },
      update: {
        metrics: metrics as any,
        updatedAt: new Date()
      },
      create: {
        accountId,
        provider,
        entityType,
        entityId,
        date: startOfDay(date),
        window: 'day',
        metrics: metrics as any,
        ...(entityType === 'campaign' && { campaignId: entityId }),
        ...(entityType === 'ad_group' && { adGroupId: entityId }),
        ...(entityType === 'ad' && { adId: entityId })
      }
    })

    // Update trends asynchronously
    this.updateTrends(accountId, entityType, entityId, provider).catch(console.error)
    
    // Clean up old data asynchronously
    this.cleanupOldData(accountId, entityType, entityId).catch(console.error)
    
    return insight
  }

  /**
   * Update pre-calculated trend data
   */
  private async updateTrends(
    accountId: string,
    entityType: string,
    entityId: string,
    provider: string
  ) {
    for (const period of this.AGGREGATION_PERIODS) {
      const days = this.periodToDays(period)
      const startDate = subDays(new Date(), days)
      
      // Fetch historical data
      const insights = await this.prisma.insight.findMany({
        where: {
          accountId,
          entityType,
          entityId,
          window: 'day',
          date: {
            gte: startDate
          }
        },
        orderBy: {
          date: 'asc'
        }
      })

      if (insights.length < days * 0.5) {
        // Not enough data for meaningful trend
        continue
      }

      // Calculate aggregated metrics
      const trendData = insights.map(i => ({
        date: format(i.date, 'yyyy-MM-dd'),
        metrics: i.metrics as PerformanceMetrics
      }))

      const allMetrics = insights.map(i => i.metrics as PerformanceMetrics)
      const avgMetrics = this.calculateAverage(allMetrics)
      const minMetrics = this.calculateMin(allMetrics)
      const maxMetrics = this.calculateMax(allMetrics)
      
      // Calculate trend indicators
      const trendAnalysis = this.analyzeTrend(allMetrics)

      // Store or update trend (limit trendData to last 30 entries for storage efficiency)
      const limitedTrendData = period === '365d' 
        ? trendData.slice(-30) // For yearly, only store last 30 days of detailed data
        : trendData
      
      await this.prisma.performanceTrend.upsert({
        where: {
          accountId_entityType_entityId_provider_period: {
            accountId,
            entityType,
            entityId,
            provider,
            period
          }
        },
        update: {
          trendData: limitedTrendData,
          avgMetrics,
          minMetrics,
          maxMetrics,
          trendScore: trendAnalysis.score,
          volatility: trendAnalysis.volatility,
          lastCalculated: new Date()
        },
        create: {
          accountId,
          entityType,
          entityId,
          provider,
          period,
          trendData: limitedTrendData,
          avgMetrics,
          minMetrics,
          maxMetrics,
          trendScore: trendAnalysis.score,
          volatility: trendAnalysis.volatility,
          lastCalculated: new Date()
        }
      })
    }
  }

  /**
   * Create performance snapshots for comparison
   */
  async createSnapshot(
    accountId: string,
    entityType: string,
    entityId: string,
    provider: string,
    snapshotType: 'weekly' | 'monthly' | 'quarterly'
  ) {
    const { periodStart, periodEnd } = this.getSnapshotPeriod(snapshotType)
    
    // Get metrics for current period
    const currentMetrics = await this.getAggregatedMetrics(
      accountId,
      entityType,
      entityId,
      periodStart,
      periodEnd
    )

    // Get metrics for previous period
    const previousPeriodDays = differenceInDays(periodEnd, periodStart)
    const previousStart = subDays(periodStart, previousPeriodDays)
    const previousEnd = periodStart
    
    const previousMetrics = await this.getAggregatedMetrics(
      accountId,
      entityType,
      entityId,
      previousStart,
      previousEnd
    )

    // Calculate comparison
    const comparison = this.compareMetrics(currentMetrics, previousMetrics)

    // Store snapshot
    await this.prisma.performanceSnapshot.upsert({
      where: {
        accountId_entityType_entityId_snapshotType_periodStart: {
          accountId,
          entityType,
          entityId,
          snapshotType,
          periodStart
        }
      },
      update: {
        periodEnd,
        metrics: currentMetrics,
        comparison
      },
      create: {
        accountId,
        entityType,
        entityId,
        provider,
        snapshotType,
        periodStart,
        periodEnd,
        metrics: currentMetrics,
        comparison
      }
    })
  }

  /**
   * Get performance trend for display
   */
  async getPerformanceTrend(
    entityType: string,
    entityId: string,
    period: '7d' | '30d' | '90d' | '365d'
  ): Promise<any> {
    const trend = await this.prisma.performanceTrend.findFirst({
      where: {
        entityType,
        entityId,
        period
      },
      orderBy: {
        lastCalculated: 'desc'
      }
    })

    if (!trend) {
      // Fetch raw data if no trend exists
      const days = this.periodToDays(period)
      const insights = await this.prisma.insight.findMany({
        where: {
          entityType,
          entityId,
          window: 'day',
          date: {
            gte: subDays(new Date(), days)
          }
        },
        orderBy: {
          date: 'asc'
        }
      })

      return {
        period,
        data: insights.map(i => ({
          date: format(i.date, 'yyyy-MM-dd'),
          metrics: i.metrics
        })),
        trendScore: 0,
        volatility: 0
      }
    }

    return {
      period: trend.period,
      data: trend.trendData,
      avgMetrics: trend.avgMetrics,
      minMetrics: trend.minMetrics,
      maxMetrics: trend.maxMetrics,
      trendScore: trend.trendScore,
      volatility: trend.volatility,
      lastCalculated: trend.lastCalculated
    }
  }

  /**
   * Get aggregated metrics for a period
   */
  private async getAggregatedMetrics(
    accountId: string,
    entityType: string,
    entityId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceMetrics> {
    const insights = await this.prisma.insight.findMany({
      where: {
        accountId,
        entityType,
        entityId,
        window: 'day',
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    if (insights.length === 0) {
      return this.getEmptyMetrics()
    }

    const metrics = insights.map(i => i.metrics as PerformanceMetrics)
    return this.calculateAverage(metrics)
  }

  /**
   * Analyze trend from metrics array
   */
  private analyzeTrend(metrics: PerformanceMetrics[]): TrendAnalysis {
    if (metrics.length < 2) {
      return {
        score: 0,
        volatility: 0,
        direction: 'stable',
        changePercent: 0
      }
    }

    // Split into first half and second half
    const midpoint = Math.floor(metrics.length / 2)
    const firstHalf = metrics.slice(0, midpoint)
    const secondHalf = metrics.slice(midpoint)

    // Calculate averages for each half
    const firstAvg = this.calculateAverage(firstHalf)
    const secondAvg = this.calculateAverage(secondHalf)

    // Calculate trend score based on key metrics
    const ctrChange = (secondAvg.ctr - firstAvg.ctr) / (firstAvg.ctr || 1)
    const roasChange = (secondAvg.roas - firstAvg.roas) / (firstAvg.roas || 1)
    const cvrChange = (secondAvg.cvr - firstAvg.cvr) / (firstAvg.cvr || 1)

    const trendScore = (ctrChange + roasChange * 2 + cvrChange * 1.5) / 4.5
    
    // Calculate volatility
    const volatility = this.calculateVolatility(metrics)

    // Determine direction
    let direction: 'improving' | 'declining' | 'stable'
    if (trendScore > 0.1) direction = 'improving'
    else if (trendScore < -0.1) direction = 'declining'
    else direction = 'stable'

    return {
      score: Math.max(-1, Math.min(1, trendScore)),
      volatility,
      direction,
      changePercent: trendScore * 100
    }
  }

  /**
   * Calculate volatility of metrics
   */
  private calculateVolatility(metrics: PerformanceMetrics[]): number {
    if (metrics.length < 2) return 0

    const ctrValues = metrics.map(m => m.ctr)
    const mean = ctrValues.reduce((a, b) => a + b, 0) / ctrValues.length
    const variance = ctrValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / ctrValues.length
    const stdDev = Math.sqrt(variance)
    
    return Math.min(1, stdDev / (mean || 1))
  }

  /**
   * Compare two sets of metrics
   */
  private compareMetrics(current: PerformanceMetrics, previous: PerformanceMetrics): any {
    const changes: any = {}
    
    for (const key in current) {
      const currentValue = (current as any)[key] || 0
      const previousValue = (previous as any)[key] || 0
      
      if (previousValue === 0) {
        changes[key] = {
          value: currentValue,
          change: currentValue > 0 ? 100 : 0,
          direction: currentValue > 0 ? 'up' : 'stable'
        }
      } else {
        const change = ((currentValue - previousValue) / previousValue) * 100
        changes[key] = {
          value: currentValue,
          change: change,
          direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable'
        }
      }
    }

    return changes
  }

  /**
   * Clean up old data beyond retention period
   */
  private async cleanupOldData(
    accountId: string,
    entityType: string,
    entityId: string
  ) {
    const cutoffDate = subDays(new Date(), this.MAX_RETENTION_DAYS)
    
    // Delete old daily insights
    await this.prisma.insight.deleteMany({
      where: {
        accountId,
        entityType,
        entityId,
        window: 'day',
        date: {
          lt: cutoffDate
        }
      }
    })
  }

  /**
   * Helper functions
   */
  private periodToDays(period: string): number {
    const map: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '365d': 365
    }
    return map[period] || 30
  }

  private getSnapshotPeriod(type: 'weekly' | 'monthly' | 'quarterly') {
    const now = new Date()
    let periodStart: Date
    let periodEnd: Date = endOfDay(now)

    switch (type) {
      case 'weekly':
        periodStart = startOfDay(subDays(now, 7))
        break
      case 'monthly':
        periodStart = startOfDay(subDays(now, 30))
        break
      case 'quarterly':
        periodStart = startOfDay(subDays(now, 90))
        break
    }

    return { periodStart, periodEnd }
  }

  private calculateAverage(metrics: PerformanceMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) return this.getEmptyMetrics()

    const sum = metrics.reduce((acc, m) => ({
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      spend: acc.spend + m.spend,
      conversions: acc.conversions + m.conversions,
      ctr: acc.ctr + m.ctr,
      cpc: acc.cpc + m.cpc,
      cpm: acc.cpm + m.cpm,
      cvr: acc.cvr + m.cvr,
      roas: acc.roas + m.roas,
      revenue: (acc.revenue || 0) + (m.revenue || 0)
    }), this.getEmptyMetrics())

    const count = metrics.length
    return {
      impressions: Math.round(sum.impressions / count),
      clicks: Math.round(sum.clicks / count),
      spend: Math.round((sum.spend / count) * 100) / 100,
      conversions: Math.round(sum.conversions / count),
      ctr: Math.round((sum.ctr / count) * 100) / 100,
      cpc: Math.round((sum.cpc / count) * 100) / 100,
      cpm: Math.round((sum.cpm / count) * 100) / 100,
      cvr: Math.round((sum.cvr / count) * 100) / 100,
      roas: Math.round((sum.roas / count) * 100) / 100,
      revenue: Math.round(((sum.revenue || 0) / count) * 100) / 100
    }
  }

  private calculateMin(metrics: PerformanceMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) return this.getEmptyMetrics()

    return metrics.reduce((min, m) => ({
      impressions: Math.min(min.impressions, m.impressions),
      clicks: Math.min(min.clicks, m.clicks),
      spend: Math.min(min.spend, m.spend),
      conversions: Math.min(min.conversions, m.conversions),
      ctr: Math.min(min.ctr, m.ctr),
      cpc: Math.min(min.cpc, m.cpc),
      cpm: Math.min(min.cpm, m.cpm),
      cvr: Math.min(min.cvr, m.cvr),
      roas: Math.min(min.roas, m.roas),
      revenue: Math.min(min.revenue || 0, m.revenue || 0)
    }))
  }

  private calculateMax(metrics: PerformanceMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) return this.getEmptyMetrics()

    return metrics.reduce((max, m) => ({
      impressions: Math.max(max.impressions, m.impressions),
      clicks: Math.max(max.clicks, m.clicks),
      spend: Math.max(max.spend, m.spend),
      conversions: Math.max(max.conversions, m.conversions),
      ctr: Math.max(max.ctr, m.ctr),
      cpc: Math.max(max.cpc, m.cpc),
      cpm: Math.max(max.cpm, m.cpm),
      cvr: Math.max(max.cvr, m.cvr),
      roas: Math.max(max.roas, m.roas),
      revenue: Math.max(max.revenue || 0, m.revenue || 0)
    }))
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      cvr: 0,
      roas: 0,
      revenue: 0
    }
  }
}