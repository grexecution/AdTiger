import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

interface CampaignMetrics {
  impressions: number
  clicks: number
  spend: number
  conversions: number
  ctr: number
  cpc: number
  roas: number
}

interface RecommendationRule {
  id: string
  name: string
  check: (metrics: CampaignMetrics, history: any[]) => boolean
  type: string
  category: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  getMessage: (metrics: CampaignMetrics) => string
}

export class AIRecommendationService {
  private openai: OpenAI
  private rules: RecommendationRule[]

  constructor(private prisma: PrismaClient) {
    // Initialize OpenAI only if API key is available
    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey && apiKey !== 'sk-...' && apiKey.startsWith('sk-')) {
      this.openai = new OpenAI({
        apiKey: apiKey,
      })
    } else {
      console.warn('⚠️ OpenAI API key not configured - recommendations will work without AI enhancement')
      this.openai = null as any
    }

    // Define recommendation rules for different scenarios
    this.rules = [
      {
        id: 'low-ctr',
        name: 'Low CTR Alert',
        check: (metrics) => metrics.ctr < 0.5 && metrics.impressions > 1000,
        type: 'creative_refresh',
        category: 'creative',
        priority: 'high',
        getMessage: (metrics) => `CTR is ${metrics.ctr.toFixed(2)}%, which is below the 0.5% threshold. Consider refreshing your ad creative.`
      },
      {
        id: 'high-cpc',
        name: 'High CPC Warning',
        check: (metrics) => metrics.cpc > 5,
        type: 'bid_adjustment',
        category: 'budget',
        priority: 'medium',
        getMessage: (metrics) => `CPC is $${metrics.cpc.toFixed(2)}, which is above optimal range. Consider adjusting bidding strategy.`
      },
      {
        id: 'low-roas',
        name: 'Low ROAS Alert',
        check: (metrics) => metrics.roas < 2 && metrics.spend > 100,
        type: 'pause',
        category: 'performance',
        priority: 'critical',
        getMessage: (metrics) => `ROAS is ${metrics.roas.toFixed(2)}x, below the 2x minimum threshold. Consider pausing or optimizing.`
      },
      {
        id: 'budget-pacing',
        name: 'Budget Pacing Issue',
        check: (metrics, history) => {
          if (history.length < 7) return false
          const avgDailySpend = history.reduce((sum, h) => sum + h.spend, 0) / history.length
          return Math.abs(metrics.spend - avgDailySpend) / avgDailySpend > 0.3
        },
        type: 'budget_change',
        category: 'budget',
        priority: 'medium',
        getMessage: (metrics) => `Daily spend variance detected. Review budget pacing to ensure consistent delivery.`
      },
      {
        id: 'conversion-drop',
        name: 'Conversion Rate Drop',
        check: (metrics, history) => {
          if (history.length < 7) return false
          const recentCvr = metrics.conversions / metrics.clicks
          const historicalCvr = history.reduce((sum, h) => sum + (h.conversions / h.clicks), 0) / history.length
          return recentCvr < historicalCvr * 0.7
        },
        type: 'targeting_adjustment',
        category: 'performance',
        priority: 'high',
        getMessage: (metrics) => `Conversion rate has dropped significantly. Review targeting and landing page.`
      },
      {
        id: 'audience-fatigue',
        name: 'Audience Fatigue',
        check: (metrics, history) => {
          if (history.length < 14) return false
          const recentCtr = history.slice(-7).reduce((sum, h) => sum + h.ctr, 0) / 7
          const previousCtr = history.slice(0, 7).reduce((sum, h) => sum + h.ctr, 0) / 7
          return recentCtr < previousCtr * 0.7
        },
        type: 'creative_refresh',
        category: 'creative',
        priority: 'high',
        getMessage: () => `CTR declining over time indicates audience fatigue. Refresh creative assets.`
      },
      {
        id: 'scaling-opportunity',
        name: 'Scaling Opportunity',
        check: (metrics) => metrics.roas > 4 && metrics.conversions > 10,
        type: 'budget_increase',
        category: 'growth',
        priority: 'medium',
        getMessage: (metrics) => `Strong performance with ${metrics.roas.toFixed(2)}x ROAS. Consider increasing budget to scale.`
      },
      {
        id: 'weekend-optimization',
        name: 'Weekend Performance',
        check: (metrics, history) => {
          const date = new Date()
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          return isWeekend && metrics.cpc > 3
        },
        type: 'schedule_adjustment',
        category: 'targeting',
        priority: 'low',
        getMessage: () => `Weekend CPC is elevated. Consider dayparting or weekend-specific bid adjustments.`
      }
    ]
  }

  /**
   * Generate AI-enhanced recommendation description
   */
  async generateAIDescription(
    campaign: any,
    recommendation: any,
    metrics: CampaignMetrics,
    history?: any[]
  ): Promise<string> {
    // If OpenAI is not configured, return a detailed fallback description
    if (!this.openai) {
      console.log(`      ⚠️ OpenAI not configured, using fallback description`)
      return this.generateFallbackDescription(campaign, recommendation, metrics)
    }
    
    console.log(`      🔑 OpenAI client available, generating AI description...`)
    
    try {
      // Calculate trends if history is available
      let trendInfo = ''
      if (history && history.length > 7) {
        const last7Days = history.slice(0, 7)
        const previous7Days = history.slice(7, 14)
        
        const recentAvgCtr = last7Days.reduce((sum, h) => sum + (h.ctr || 0), 0) / 7
        const previousAvgCtr = previous7Days.reduce((sum, h) => sum + (h.ctr || 0), 0) / 7
        const ctrChange = ((recentAvgCtr - previousAvgCtr) / previousAvgCtr * 100).toFixed(1)
        
        const recentAvgSpend = last7Days.reduce((sum, h) => sum + (h.spend || 0), 0) / 7
        const previousAvgSpend = previous7Days.reduce((sum, h) => sum + (h.spend || 0), 0) / 7
        const spendChange = ((recentAvgSpend - previousAvgSpend) / previousAvgSpend * 100).toFixed(1)
        
        const recentAvgRoas = last7Days.reduce((sum, h) => sum + (h.roas || 0), 0) / 7
        const previousAvgRoas = previous7Days.reduce((sum, h) => sum + (h.roas || 0), 0) / 7
        const roasChange = ((recentAvgRoas - previousAvgRoas) / previousAvgRoas * 100).toFixed(1)
        
        trendInfo = `
Recent Trends (Last 7 days vs Previous 7 days):
- CTR: ${ctrChange}% change (${previousAvgCtr.toFixed(2)}% → ${recentAvgCtr.toFixed(2)}%)
- Daily Spend: ${spendChange}% change ($${previousAvgSpend.toFixed(2)} → $${recentAvgSpend.toFixed(2)})
- ROAS: ${roasChange}% change (${previousAvgRoas.toFixed(2)}x → ${recentAvgRoas.toFixed(2)}x)`
      }

      const prompt = `You are an expert ${campaign.provider === 'meta' ? 'Facebook/Instagram' : 'Google'} Ads specialist analyzing campaign performance.

CAMPAIGN DETAILS:
- Name: ${campaign.name}
- Platform: ${campaign.provider === 'meta' ? 'Facebook/Instagram' : 'Google Ads'}
- Objective: ${campaign.objective || 'conversions'}
- Status: ${campaign.status}
- Budget: $${campaign.budgetAmount || 'Not set'} ${campaign.budgetCurrency || 'USD'}

CURRENT METRICS (Latest):
- Impressions: ${metrics.impressions.toLocaleString()}
- Clicks: ${metrics.clicks.toLocaleString()}
- CTR: ${metrics.ctr.toFixed(2)}%
- CPC: $${metrics.cpc.toFixed(2)}
- Daily Spend: $${metrics.spend.toFixed(2)}
- Conversions: ${metrics.conversions}
- Conversion Rate: ${metrics.clicks > 0 ? ((metrics.conversions / metrics.clicks) * 100).toFixed(2) : 0}%
- ROAS: ${metrics.roas.toFixed(2)}x
${trendInfo}

DETECTED ISSUE:
${recommendation.title} - ${recommendation.description}

CONTEXT:
This is a ${recommendation.priority} priority ${recommendation.category} issue. The system detected this based on performance thresholds and historical patterns.

TASK:
Provide 3-4 specific, actionable steps this advertiser should take TODAY to address this issue. Be extremely specific with:
1. Exact settings to change
2. Specific values/percentages to adjust
3. Creative/copy suggestions if relevant
4. Timeline for implementation

Format as numbered steps. Be direct and actionable. Include specific ${campaign.provider === 'meta' ? 'Facebook Ads Manager' : 'Google Ads'} features to use.`

      console.log(`      📝 Sending prompt to OpenAI (length: ${prompt.length} chars)`)
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      })

      const aiResponse = response.choices[0]?.message?.content
      console.log(`      ✅ OpenAI response received (length: ${aiResponse?.length || 0} chars)`)
      
      return aiResponse || recommendation.description
    } catch (error) {
      console.error('      ❌ AI description generation failed:', error)
      console.log(`      🔄 Using fallback description`)
      return this.generateFallbackDescription(campaign, recommendation, metrics)
    }
  }

  /**
   * Generate detailed fallback description when AI is not available
   */
  private generateFallbackDescription(
    campaign: any,
    recommendation: any,
    metrics: CampaignMetrics
  ): string {
    const descriptions: Record<string, (campaign: any, metrics: CampaignMetrics) => string> = {
      'low-ctr': (c, m) => 
        `Your ${c.provider === 'meta' ? 'Facebook' : 'Google'} campaign "${c.name}" has a CTR of ${m.ctr.toFixed(2)}%, which is significantly below the industry average of 0.9%. To improve performance: 1) Test new ad creative with stronger headlines and clearer CTAs, 2) Review your audience targeting to ensure you're reaching the right people, 3) Consider A/B testing different ad formats (carousel, video, single image).`,
      
      'high-cpc': (c, m) => 
        `The CPC for "${c.name}" is $${m.cpc.toFixed(2)}, which is above optimal range for ${c.objective || 'conversion'} campaigns. Recommended actions: 1) Review and refine your keyword/interest targeting, 2) Implement negative keywords/exclusions, 3) Test automated bidding strategies, 4) Consider dayparting to focus on high-converting hours.`,
      
      'low-roas': (c, m) => 
        `Campaign "${c.name}" is generating only ${m.roas.toFixed(2)}x ROAS with $${m.spend.toFixed(2)} spend. This is below profitability threshold. Immediate actions: 1) Pause underperforming ad sets/keywords, 2) Reallocate budget to higher-performing campaigns, 3) Review landing page conversion rate, 4) Tighten audience targeting to high-intent users.`,
      
      'budget-pacing': (c, m) => 
        `Daily spend for "${c.name}" is fluctuating significantly (current: $${m.spend.toFixed(2)}). To stabilize delivery: 1) Switch to daily budget instead of lifetime, 2) Review bid cap settings, 3) Ensure audience size is sufficient for consistent delivery, 4) Check for competing campaigns in the same ad account.`,
      
      'conversion-drop': (c, m) => 
        `Conversion rate for "${c.name}" has dropped to ${((m.conversions / m.clicks) * 100).toFixed(2)}%. Investigation needed: 1) Check landing page load speed and functionality, 2) Review recent ad creative changes, 3) Analyze audience saturation, 4) Verify conversion tracking is working properly.`,
      
      'audience-fatigue': (c, m) => 
        `CTR for "${c.name}" is declining over time (now ${m.ctr.toFixed(2)}%), indicating audience fatigue. Refresh strategy: 1) Develop new creative variations (3-5 new ads), 2) Expand audience targeting by 20-30%, 3) Test user-generated content or testimonials, 4) Consider a brief pause (3-5 days) before relaunch.`,
      
      'scaling-opportunity': (c, m) => 
        `Excellent performance on "${c.name}" with ${m.roas.toFixed(2)}x ROAS and ${m.conversions} conversions! Scaling strategy: 1) Increase daily budget by 20% every 3 days, 2) Duplicate ad set with broader targeting, 3) Test similar audiences/lookalikes, 4) Expand to new placements/networks while maintaining ROAS.`,
      
      'weekend-optimization': (c, m) => 
        `Weekend CPC for "${c.name}" is $${m.cpc.toFixed(2)}. Optimization options: 1) Implement dayparting to reduce weekend bids by 20%, 2) Create weekend-specific ad copy, 3) Adjust targeting for weekend browsing behavior, 4) Test weekend-only promotions to improve conversion rate.`
    }

    const generator = descriptions[recommendation.ruleKey]
    if (generator) {
      return generator(campaign, metrics)
    }

    // Generic fallback
    return `${recommendation.description} Review the metrics and take appropriate action to optimize campaign performance.`
  }

  /**
   * Analyze campaigns and generate recommendations
   */
  async generateRecommendations(accountId: string): Promise<any[]> {
    console.log(`🔍 Starting recommendation generation for account: ${accountId}`)
    const recommendations = []

    // Get Google connection to check enabled accounts (same logic as campaigns API)
    let enabledGoogleAccounts: string[] = []
    const googleConnection = await this.prisma.providerConnection.findFirst({
      where: {
        accountId,
        provider: { in: ['google', 'GOOGLE'] }
      }
    })
    
    if (googleConnection) {
      const metadata = googleConnection.metadata as any
      enabledGoogleAccounts = metadata?.enabledAccounts || []
      console.log(`📋 Google enabled accounts: ${enabledGoogleAccounts.join(', ')}`)
    }

    // Build where clause to match campaign view filtering
    const where: any = {
      accountId,
      status: 'ACTIVE'
    }

    // Apply the same filtering logic as campaign view
    if (enabledGoogleAccounts.length > 0) {
      where.OR = [
        { provider: { notIn: ['google', 'GOOGLE'] } },
        { 
          provider: { in: ['google', 'GOOGLE'] },
          adAccount: {
            externalId: { in: enabledGoogleAccounts }
          }
        }
      ]
    }

    // Get campaigns that would be visible in campaign view
    const campaigns = await this.prisma.campaign.findMany({
      where,
      include: {
        adAccount: true,
        insights: {
          where: {
            window: 'day',
            date: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: {
            date: 'desc'
          }
        }
      }
    })

    console.log(`📊 Found ${campaigns.length} active campaigns to analyze`)
    console.log(`📝 Campaigns to analyze:`)
    campaigns.forEach(c => {
      console.log(`   - ${c.name} (${c.provider}, Account: ${c.adAccount?.externalId || 'N/A'})`)
    })

    for (const campaign of campaigns) {
      console.log(`\n📌 Analyzing campaign: ${campaign.name} (${campaign.id}, ${campaign.provider})`)
      
      if (!campaign.insights.length) {
        console.log(`⚠️ No insights found for campaign ${campaign.name}`)
        continue
      }

      console.log(`✅ Found ${campaign.insights.length} insights for campaign`)

      // Get latest metrics
      const latestInsight = campaign.insights[0]
      console.log(`📈 Latest insight date: ${latestInsight.date}`)
      console.log(`📊 Raw metrics:`, JSON.stringify(latestInsight.metrics, null, 2))
      
      const metrics: CampaignMetrics = {
        impressions: (latestInsight.metrics as any)?.impressions || 0,
        clicks: (latestInsight.metrics as any)?.clicks || 0,
        spend: (latestInsight.metrics as any)?.spend || 0,
        conversions: (latestInsight.metrics as any)?.conversions || 0,
        ctr: (latestInsight.metrics as any)?.ctr || 0,
        cpc: (latestInsight.metrics as any)?.cpc || 0,
        roas: (latestInsight.metrics as any)?.roas || 0
      }
      
      console.log(`📊 Parsed metrics:`, metrics)

      // Get historical data
      const history = campaign.insights.slice(1).map(i => i.metrics as any)
      console.log(`📚 Historical data points: ${history.length}`)

      // Check each rule
      console.log(`🔎 Checking ${this.rules.length} rules...`)
      for (const rule of this.rules) {
        console.log(`  📋 Checking rule: ${rule.name}`)
        const ruleMatches = rule.check(metrics, history)
        console.log(`    → Result: ${ruleMatches ? '✅ TRIGGERED' : '⏭️ SKIPPED'}`)
        
        if (ruleMatches) {
          // Check if recommendation already exists and is not dismissed
          const existingRec = await this.prisma.recommendation.findFirst({
            where: {
              accountId,
              scopeType: 'campaign',
              scopeId: campaign.id,
              ruleKey: rule.id,
              status: 'proposed',
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          })

          if (existingRec) {
            console.log(`    ⚠️ Recommendation already exists, skipping`)
          } else {
            console.log(`    🆕 Creating new recommendation...`)
            const baseRecommendation = {
              accountId,
              provider: campaign.provider,
              scopeType: 'campaign',
              scopeId: campaign.id,
              entityType: 'campaign', // For backwards compatibility
              entityId: campaign.id,
              ruleKey: rule.id,
              playbookKey: `auto-${rule.category}`,
              playbookId: '', // Deprecated
              ruleId: rule.id, // Deprecated
              type: rule.type,
              title: rule.name,
              description: rule.getMessage(metrics),
              priority: rule.priority,
              category: rule.category,
              metricsSnapshot: metrics,
              estimatedImpact: this.estimateImpact(rule.type, metrics),
              score: this.calculateScore(rule.priority, metrics),
              confidence: this.calculateConfidence(metrics, history),
              payload: {
                campaign: {
                  id: campaign.id,
                  name: campaign.name,
                  provider: campaign.provider
                },
                metrics,
                rule: rule.id
              }
            }

            // Enhance with AI description with historical context
            console.log(`    🤖 Generating AI description...`)
            const aiDescription = await this.generateAIDescription(
              campaign,
              baseRecommendation,
              metrics,
              history
            )
            console.log(`    ✨ AI description generated: ${aiDescription.substring(0, 100)}...`)

            const recommendation = await this.prisma.recommendation.create({
              data: {
                ...baseRecommendation,
                aiExplanation: aiDescription,
                aiModel: 'gpt-4o-mini'
              }
            })

            console.log(`    ✅ Recommendation created: ${recommendation.id}`)
            recommendations.push(recommendation)
          }
        }
      }
    }

    console.log(`\n🎯 Recommendation generation complete!`)
    console.log(`📊 Total recommendations created: ${recommendations.length}`)
    
    return recommendations
  }

  /**
   * Calculate recommendation score based on priority and metrics
   */
  private calculateScore(priority: string, metrics: CampaignMetrics): number {
    const priorityScores = {
      critical: 90,
      high: 70,
      medium: 50,
      low: 30
    }

    let score = priorityScores[priority as keyof typeof priorityScores] || 50

    // Adjust based on spend (higher spend = more important)
    if (metrics.spend > 1000) score += 10
    if (metrics.spend > 5000) score += 10

    // Adjust based on volume (higher volume = more important)
    if (metrics.impressions > 100000) score += 5
    if (metrics.conversions > 100) score += 5

    return Math.min(100, score)
  }

  /**
   * Calculate confidence based on data quality
   */
  private calculateConfidence(metrics: CampaignMetrics, history: any[]): number {
    let confidence = 0.5

    // More historical data = higher confidence
    if (history.length > 7) confidence += 0.2
    if (history.length > 14) confidence += 0.1

    // Higher volume = higher confidence
    if (metrics.impressions > 10000) confidence += 0.1
    if (metrics.clicks > 100) confidence += 0.1

    return Math.min(1, confidence)
  }

  /**
   * Estimate the impact of applying the recommendation
   */
  private estimateImpact(type: string, metrics: CampaignMetrics): any {
    const impacts: Record<string, any> = {
      creative_refresh: {
        ctr_increase: '20-30%',
        potential_clicks: Math.floor(metrics.impressions * 0.007), // Assuming 0.7% CTR
        confidence: 0.6
      },
      budget_change: {
        spend_optimization: '15-25%',
        roas_improvement: '10-20%',
        confidence: 0.7
      },
      pause: {
        spend_saved: metrics.spend * 7, // Weekly spend saved
        negative_conversions_prevented: metrics.conversions * -1,
        confidence: 0.9
      },
      budget_increase: {
        additional_conversions: Math.floor(metrics.conversions * 0.5),
        revenue_increase: `$${(metrics.conversions * metrics.roas * metrics.spend / metrics.conversions * 0.5).toFixed(0)}`,
        confidence: 0.5
      },
      bid_adjustment: {
        cpc_reduction: '10-20%',
        same_conversion_volume: true,
        confidence: 0.6
      },
      targeting_adjustment: {
        cvr_improvement: '15-30%',
        audience_quality: 'improved',
        confidence: 0.5
      },
      schedule_adjustment: {
        cpc_reduction: '5-15%',
        dayparting_optimization: true,
        confidence: 0.7
      }
    }

    return impacts[type] || { confidence: 0.5 }
  }

  /**
   * Mark recommendation as accepted
   */
  async acceptRecommendation(recommendationId: string, userId: string): Promise<void> {
    await this.prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        statusReason: `Accepted by user ${userId}`
      }
    })
  }

  /**
   * Mark recommendation as rejected/dismissed
   */
  async rejectRecommendation(recommendationId: string, reason?: string): Promise<void> {
    await this.prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        statusReason: reason || 'Dismissed by user'
      }
    })
  }

  /**
   * Snooze recommendation for later
   */
  async snoozeRecommendation(recommendationId: string, days: number = 7): Promise<void> {
    await this.prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        snoozedUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        statusReason: `Snoozed for ${days} days`
      }
    })
  }

  /**
   * Get active recommendations for an account
   */
  async getActiveRecommendations(accountId: string): Promise<any[]> {
    const recommendations = await this.prisma.recommendation.findMany({
      where: {
        accountId,
        status: 'proposed',
        OR: [
          { snoozedUntil: null },
          { snoozedUntil: { lt: new Date() } }
        ]
      },
      orderBy: [
        { score: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Fetch campaign details separately if needed
    for (const rec of recommendations) {
      if (rec.scopeType === 'campaign' && rec.scopeId) {
        const campaign = await this.prisma.campaign.findUnique({
          where: { id: rec.scopeId },
          select: {
            name: true,
            status: true,
            provider: true
          }
        })
        if (campaign) {
          ;(rec as any).campaign = campaign
        }
      }
    }

    return recommendations
  }

  async getAllRecommendations(): Promise<any[]> {
    const recommendations = await this.prisma.recommendation.findMany({
      where: {
        status: 'proposed',
        OR: [
          { snoozedUntil: null },
          { snoozedUntil: { lt: new Date() } }
        ]
      },
      include: {
        account: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { score: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Fetch campaign details separately if needed
    for (const rec of recommendations) {
      if (rec.scopeType === 'campaign' && rec.scopeId) {
        const campaign = await this.prisma.campaign.findUnique({
          where: { id: rec.scopeId },
          select: { name: true }
        })
        if (campaign) {
          ;(rec as any).campaignName = campaign.name
        }
      }
    }

    return recommendations
  }
}