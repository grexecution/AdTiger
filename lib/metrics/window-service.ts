import { prisma } from '@/lib/prisma'
import { subDays, startOfDay, endOfDay } from 'date-fns'

export type WindowPeriod = '1d' | '7d' | '14d' | '30d' | '60d' | '90d'
export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count'

export interface MetricsSnapshot {
  // Basic metrics
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue: number
  
  // Derived metrics
  ctr: number // Click-through rate
  cpc: number // Cost per click
  cpm: number // Cost per mille (1000 impressions)
  cpa: number // Cost per acquisition/conversion
  roas: number // Return on ad spend
  cvr: number // Conversion rate
  frequency: number
  reach: number
  
  // Additional metadata
  dataPoints: number
  period: WindowPeriod
  startDate: Date
  endDate: Date
  
  // Trend data
  trend?: TrendData
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable'
  changePct: number
  changeAbs: number
  zScore?: number
  significance?: 'high' | 'medium' | 'low' | 'none'
  previousValue?: number
  currentValue?: number
}

export interface WindowQuery {
  accountId: string
  provider: string
  entityType: 'campaign' | 'ad_group' | 'ad' | 'account'
  entityId: string
  window: WindowPeriod
  compareWindow?: WindowPeriod // For trend analysis
  metrics?: string[] // Specific metrics to fetch
}

export class MetricsWindowService {
  /**
   * Get aggregated metrics for a specific window
   */
  async getMetrics(query: WindowQuery): Promise<MetricsSnapshot> {
    const { accountId, provider, entityType, entityId, window } = query
    
    // Calculate date range
    const endDate = endOfDay(new Date())
    const startDate = startOfDay(this.getStartDate(window, endDate))
    
    // Fetch insights from database
    const insights = await prisma.insight.findMany({
      where: {
        accountId,
        provider,
        entityType,
        entityId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    })
    
    // Aggregate metrics
    const aggregated = this.aggregateMetrics(insights)
    
    // Calculate derived metrics
    const derived = this.calculateDerivedMetrics(aggregated)
    
    // Get trend if compare window specified
    let trend: TrendData | undefined
    if (query.compareWindow) {
      trend = await this.calculateTrend(query, aggregated)
    }
    
    return {
      impressions: aggregated.impressions || 0,
      clicks: aggregated.clicks || 0,
      spend: aggregated.spend || 0,
      conversions: aggregated.conversions || 0,
      revenue: aggregated.revenue || 0,
      frequency: aggregated.frequency || 0,
      reach: aggregated.reach || 0,
      ctr: derived.ctr || 0,
      cpc: derived.cpc || 0,
      cpm: derived.cpm || 0,
      cpa: derived.cpa || 0,
      roas: derived.roas || 0,
      cvr: derived.cvr || 0,
      dataPoints: insights.length,
      period: window,
      startDate,
      endDate,
      trend,
    }
  }
  
  /**
   * Get metrics for multiple entities
   */
  async getBulkMetrics(
    queries: WindowQuery[]
  ): Promise<Map<string, MetricsSnapshot>> {
    const results = new Map<string, MetricsSnapshot>()
    
    // Process in parallel for efficiency
    const promises = queries.map(async (query) => {
      const key = `${query.entityType}:${query.entityId}:${query.window}`
      const metrics = await this.getMetrics(query)
      return { key, metrics }
    })
    
    const resolved = await Promise.all(promises)
    resolved.forEach(({ key, metrics }) => {
      results.set(key, metrics)
    })
    
    return results
  }
  
  /**
   * Calculate week-over-week or period-over-period trends
   */
  async calculateTrend(
    query: WindowQuery,
    currentMetrics: Partial<MetricsSnapshot>
  ): Promise<TrendData> {
    const { accountId, provider, entityType, entityId, window, compareWindow } = query
    
    // Get previous period data
    const endDate = this.getStartDate(window, new Date())
    const startDate = this.getStartDate(compareWindow || window, endDate)
    
    const previousInsights = await prisma.insight.findMany({
      where: {
        accountId,
        provider,
        entityType,
        entityId,
        date: {
          gte: startOfDay(startDate),
          lt: startOfDay(endDate),
        },
      },
    })
    
    const previousMetrics = this.aggregateMetrics(previousInsights)
    
    // Calculate trend for primary KPI (conversions or revenue)
    const currentValue = currentMetrics.conversions || 0
    const previousValue = previousMetrics.conversions || 0
    
    const changeAbs = currentValue - previousValue
    const changePct = previousValue > 0 
      ? (changeAbs / previousValue) * 100 
      : currentValue > 0 ? 100 : 0
    
    // Calculate z-score for significance
    const zScore = this.calculateZScore(
      currentValue,
      previousValue,
      this.getStandardDeviation(previousInsights)
    )
    
    return {
      direction: changePct > 5 ? 'up' : changePct < -5 ? 'down' : 'stable',
      changePct,
      changeAbs,
      zScore,
      significance: this.getSignificance(zScore),
      previousValue,
      currentValue,
    }
  }
  
  /**
   * Aggregate raw insights into metrics
   */
  private aggregateMetrics(insights: any[]): Partial<MetricsSnapshot> {
    if (insights.length === 0) {
      return {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        revenue: 0,
        reach: 0,
      }
    }
    
    const totals = {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      revenue: 0,
      reach: 0,
      frequency_sum: 0,
      frequency_count: 0,
    }
    
    for (const insight of insights) {
      const metrics = insight.metrics as any
      totals.impressions += metrics.impressions || 0
      totals.clicks += metrics.clicks || 0
      totals.spend += metrics.spend || 0
      totals.conversions += metrics.conversions || 0
      totals.revenue += metrics.revenue || metrics.value || 0
      totals.reach += metrics.reach || 0
      
      if (metrics.frequency) {
        totals.frequency_sum += metrics.frequency
        totals.frequency_count++
      }
    }
    
    return {
      impressions: totals.impressions,
      clicks: totals.clicks,
      spend: totals.spend,
      conversions: totals.conversions,
      revenue: totals.revenue,
      reach: totals.reach,
      frequency: totals.frequency_count > 0 
        ? totals.frequency_sum / totals.frequency_count 
        : 0,
    }
  }
  
  /**
   * Calculate derived metrics from aggregated data
   */
  private calculateDerivedMetrics(metrics: Partial<MetricsSnapshot>): Partial<MetricsSnapshot> {
    const { impressions = 0, clicks = 0, spend = 0, conversions = 0, revenue = 0 } = metrics
    
    return {
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      roas: spend > 0 ? revenue / spend : 0,
      cvr: clicks > 0 ? (conversions / clicks) * 100 : 0,
    }
  }
  
  /**
   * Get start date for a window period
   */
  private getStartDate(window: WindowPeriod, fromDate: Date): Date {
    const days = parseInt(window.replace('d', ''))
    return subDays(fromDate, days)
  }
  
  /**
   * Calculate z-score for statistical significance
   */
  private calculateZScore(current: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0
    return (current - mean) / stdDev
  }
  
  /**
   * Calculate standard deviation from insights
   */
  private getStandardDeviation(insights: any[]): number {
    if (insights.length < 2) return 0
    
    const values = insights.map(i => (i.metrics as any).conversions || 0)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
    
    return Math.sqrt(variance)
  }
  
  /**
   * Determine significance level from z-score
   */
  private getSignificance(zScore: number): 'high' | 'medium' | 'low' | 'none' {
    const absZ = Math.abs(zScore)
    if (absZ >= 2.58) return 'high' // 99% confidence
    if (absZ >= 1.96) return 'medium' // 95% confidence
    if (absZ >= 1.64) return 'low' // 90% confidence
    return 'none'
  }
  
  /**
   * Get metrics comparison between two periods
   */
  async compareMetrics(
    query: WindowQuery,
    compareWindow: WindowPeriod
  ): Promise<{
    current: MetricsSnapshot
    previous: MetricsSnapshot
    comparison: Record<string, TrendData>
  }> {
    // Get current period metrics
    const current = await this.getMetrics(query)
    
    // Get previous period metrics
    const previousQuery = { ...query, window: compareWindow }
    const previous = await this.getMetrics(previousQuery)
    
    // Calculate comparisons for each metric
    const comparison: Record<string, TrendData> = {}
    const metricKeys = [
      'impressions', 'clicks', 'spend', 'conversions', 'revenue',
      'ctr', 'cpc', 'cpm', 'cpa', 'roas', 'cvr'
    ]
    
    for (const key of metricKeys) {
      const currentVal = (current as any)[key] || 0
      const previousVal = (previous as any)[key] || 0
      
      const changeAbs = currentVal - previousVal
      const changePct = previousVal > 0 
        ? (changeAbs / previousVal) * 100 
        : currentVal > 0 ? 100 : 0
      
      comparison[key] = {
        direction: changePct > 5 ? 'up' : changePct < -5 ? 'down' : 'stable',
        changePct,
        changeAbs,
        previousValue: previousVal,
        currentValue: currentVal,
      }
    }
    
    return { current, previous, comparison }
  }
  
  /**
   * Get hourly performance distribution
   */
  async getHourlyDistribution(
    query: WindowQuery
  ): Promise<Record<number, MetricsSnapshot>> {
    const { accountId, provider, entityType, entityId, window } = query
    
    const endDate = endOfDay(new Date())
    const startDate = startOfDay(this.getStartDate(window, endDate))
    
    // This would require hourly data storage
    // For now, return a placeholder
    const hourlyData: Record<number, MetricsSnapshot> = {}
    
    // In production, query hourly breakdowns
    // and aggregate by hour of day
    
    return hourlyData
  }
  
  /**
   * Calculate moving averages
   */
  async getMovingAverage(
    query: WindowQuery,
    metric: string,
    periods: number
  ): Promise<number[]> {
    const { accountId, provider, entityType, entityId } = query
    
    const insights = await prisma.insight.findMany({
      where: {
        accountId,
        provider,
        entityType,
        entityId,
      },
      orderBy: { date: 'desc' },
      take: periods * 2, // Get extra data for calculation
    })
    
    const values = insights.map(i => (i.metrics as any)[metric] || 0)
    const movingAverages = []
    
    for (let i = 0; i <= values.length - periods; i++) {
      const slice = values.slice(i, i + periods)
      const avg = slice.reduce((a, b) => a + b, 0) / periods
      movingAverages.push(avg)
    }
    
    return movingAverages
  }
}

// Export singleton instance
export const metricsWindowService = new MetricsWindowService()