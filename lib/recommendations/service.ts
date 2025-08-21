import { prisma } from '@/lib/prisma'
import { playbookRepository } from '@/lib/playbooks/repository'
import { ruleEngine, RuleContext } from '@/lib/rules/engine'
import { metricsWindowService, WindowPeriod } from '@/lib/metrics/window-service'
import { explanationService } from '@/lib/ai/explanation-service'
import { addDays, subDays } from 'date-fns'

export interface GenerateRecommendationsParams {
  accountId: string
  provider: 'meta' | 'google'
  entityType?: 'campaign' | 'ad_group' | 'ad'
  entityIds?: string[]
  playbookKeys?: string[]
  windows?: WindowPeriod[]
}

export interface RecommendationAction {
  recommendationId: string
  action: 'accept' | 'reject' | 'snooze' | 'apply' | 'revert'
  reason?: string
  snoozeDays?: number
  result?: any
}

export class RecommendationService {
  /**
   * Generate recommendations for entities
   */
  async generateRecommendations(
    params: GenerateRecommendationsParams
  ): Promise<string[]> {
    const { accountId, provider, entityType, entityIds, playbookKeys, windows = ['7d', '14d', '30d'] } = params
    
    // Get playbooks to evaluate
    const playbooks = playbookKeys
      ? playbookKeys.map(key => playbookRepository.get(key)).filter(Boolean)
      : playbookRepository.getFiltered({ provider, enabled: true })
    
    if (playbooks.length === 0) {
      console.log('No playbooks found for evaluation')
      return []
    }
    
    // Get entities to evaluate
    const entities = await this.getEntities(accountId, provider, entityType, entityIds)
    
    const recommendationIds: string[] = []
    
    for (const entity of entities) {
      // Get metrics for all windows
      const metrics: Record<WindowPeriod, any> = {} as any
      
      for (const window of windows) {
        try {
          metrics[window] = await metricsWindowService.getMetrics({
            accountId,
            provider,
            entityType: entity.type,
            entityId: entity.id,
            window,
            compareWindow: window, // For trend analysis
          })
        } catch (error) {
          console.error(`Failed to get metrics for ${entity.id}:`, error)
        }
      }
      
      // Skip if no metrics available
      if (Object.keys(metrics).length === 0) {
        continue
      }
      
      // Create rule context
      const context: RuleContext = {
        accountId,
        provider,
        entityType: entity.type,
        entityId: entity.id,
        entityData: entity.data,
        metrics,
      }
      
      // Evaluate playbooks
      const results = await ruleEngine.evaluatePlaybooks(playbooks as any, context)
      
      // Create recommendations for matched rules
      for (const result of results) {
        if (result.matched && result.score > 10) { // Minimum score threshold
          const recommendation = await this.createRecommendation(
            result,
            context,
            entity
          )
          
          if (recommendation) {
            recommendationIds.push(recommendation.id)
          }
        }
      }
    }
    
    return recommendationIds
  }
  
  /**
   * Get entities to evaluate
   */
  private async getEntities(
    accountId: string,
    provider: string,
    entityType?: string,
    entityIds?: string[]
  ): Promise<any[]> {
    const entities: any[] = []
    
    // Get campaigns
    if (!entityType || entityType === 'campaign') {
      const campaigns = await prisma.campaign.findMany({
        where: {
          accountId,
          provider,
          ...(entityIds && entityType === 'campaign' ? { id: { in: entityIds } } : {}),
          status: { in: ['ACTIVE', 'ENABLED'] },
        },
      })
      
      entities.push(...campaigns.map(c => ({
        type: 'campaign' as const,
        id: c.id,
        data: c,
      })))
    }
    
    // Get ad groups
    if (!entityType || entityType === 'ad_group') {
      const adGroups = await prisma.adGroup.findMany({
        where: {
          accountId,
          provider,
          ...(entityIds && entityType === 'ad_group' ? { id: { in: entityIds } } : {}),
          status: { in: ['ACTIVE', 'ENABLED'] },
        },
        include: {
          campaign: true,
        },
      })
      
      entities.push(...adGroups.map(ag => ({
        type: 'ad_group' as const,
        id: ag.id,
        data: ag,
      })))
    }
    
    // Get ads
    if (!entityType || entityType === 'ad') {
      const ads = await prisma.ad.findMany({
        where: {
          accountId,
          provider,
          ...(entityIds && entityType === 'ad' ? { id: { in: entityIds } } : {}),
          status: { in: ['ACTIVE', 'ENABLED'] },
        },
        include: {
          adGroup: {
            include: {
              campaign: true,
            },
          },
        },
      })
      
      entities.push(...ads.map(ad => ({
        type: 'ad' as const,
        id: ad.id,
        data: ad,
      })))
    }
    
    return entities
  }
  
  /**
   * Create a recommendation from evaluation result
   */
  private async createRecommendation(
    result: any,
    context: RuleContext,
    entity: any
  ): Promise<any> {
    // Check if similar recommendation already exists
    const existing = await prisma.recommendation.findFirst({
      where: {
        accountId: context.accountId,
        scopeType: context.entityType,
        scopeId: context.entityId,
        playbookKey: result.playbookKey,
        status: { in: ['proposed', 'accepted'] },
        createdAt: { gte: subDays(new Date(), 7) }, // Within last 7 days
      },
    })
    
    if (existing) {
      console.log(`Skipping duplicate recommendation for ${context.entityId}`)
      return null
    }
    
    // Generate AI explanation
    let aiExplanation: string | null = null
    let aiModel: string | null = null
    
    try {
      const playbook = playbookRepository.get(result.playbookKey)
      
      if (playbook) {
        const explanationResponse = await explanationService.generateExplanation({
          playbook,
          evaluationResult: result,
          metricsSnapshots: {
            '7d': context.metrics['7d'],
            '14d': context.metrics['14d'],
            '30d': context.metrics['30d'],
          },
          entityType: context.entityType,
          entityName: entity.data?.name,
          provider: context.provider,
        })
        
        if (explanationService.validateExplanation(explanationResponse)) {
          aiExplanation = explanationService.formatExplanation(explanationResponse)
          aiModel = explanationResponse.model
          
          // Apply guardrails to action payload
          if (result.actions[0]) {
            result.actions[0] = this.applyActionGuardrails(result.actions[0], explanationResponse)
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate AI explanation:', error)
      // Continue without AI explanation
    }
    
    // Create new recommendation
    const recommendation = await prisma.recommendation.create({
      data: {
        accountId: context.accountId,
        provider: context.provider,
        scopeType: context.entityType,
        scopeId: context.entityId,
        entityType: context.entityType, // For backwards compatibility
        entityId: context.entityId, // For backwards compatibility
        ruleKey: result.playbookKey,
        playbookKey: result.playbookKey,
        playbookId: result.playbookKey, // For backwards compatibility
        ruleId: result.playbookKey, // For backwards compatibility
        type: result.actions[0]?.type || 'optimization',
        title: result.playbookName,
        description: result.explanation,
        priority: this.getPriority(result.score),
        category: this.getCategory(result.actions[0]?.type),
        payload: result.actions[0] || {},
        metricsSnapshot: result.actions[0]?.metricsSnapshot || {},
        estimatedImpact: result.actions[0]?.estimatedImpact || {},
        score: result.score,
        confidence: result.confidence,
        status: 'proposed',
        aiExplanation,
        aiModel,
        expiresAt: addDays(new Date(), 30), // Expire after 30 days
      },
    })
    
    return recommendation
  }
  
  /**
   * Apply guardrails from AI explanation to action
   */
  private applyActionGuardrails(action: any, explanation: any): any {
    const guardrails = action.guardrails || {}
    
    // Apply budget change caps
    if (action.type === 'recommend_budget_change' && action.changePct) {
      const maxIncrease = guardrails.max_daily_increase_pct || 50
      const maxDecrease = guardrails.max_daily_decrease_pct || 50
      
      if (action.changePct > 0) {
        action.changePct = Math.min(action.changePct, maxIncrease)
      } else {
        action.changePct = Math.max(action.changePct, -maxDecrease)
      }
      
      // Update estimated impact based on capped change
      if (action.estimatedImpact) {
        action.estimatedImpact.changePct = action.changePct
      }
    }
    
    // Ensure minimum and maximum budget limits
    if (guardrails.min_budget && action.params?.new_budget) {
      action.params.new_budget = Math.max(action.params.new_budget, guardrails.min_budget)
    }
    
    if (guardrails.max_budget && action.params?.new_budget) {
      action.params.new_budget = Math.min(action.params.new_budget, guardrails.max_budget)
    }
    
    // Add flag to never auto-apply in MVP
    action.params = {
      ...action.params,
      manual_implementation_required: true,
      guardrails_applied: true,
    }
    
    return action
  }
  
  /**
   * Get priority based on score
   */
  private getPriority(score: number): string {
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }
  
  /**
   * Get category from action type
   */
  private getCategory(actionType?: string): string {
    if (!actionType) return 'optimization'
    
    if (actionType.includes('budget')) return 'budget'
    if (actionType.includes('creative')) return 'creative'
    if (actionType.includes('audience') || actionType.includes('target')) return 'targeting'
    if (actionType.includes('bid')) return 'bidding'
    if (actionType.includes('schedule') || actionType.includes('daypart')) return 'scheduling'
    
    return 'performance'
  }
  
  /**
   * Get recommendations for account
   */
  async getRecommendations(
    accountId: string,
    filters?: {
      provider?: string
      status?: string
      priority?: string
      category?: string
      scopeType?: string
      limit?: number
    }
  ) {
    const where: any = { accountId }
    
    if (filters?.provider) where.provider = filters.provider
    if (filters?.status) where.status = filters.status
    if (filters?.priority) where.priority = filters.priority
    if (filters?.category) where.category = filters.category
    if (filters?.scopeType) where.scopeType = filters.scopeType
    
    // Exclude expired recommendations
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ]
    
    return prisma.recommendation.findMany({
      where,
      orderBy: [
        { score: 'desc' },
        { createdAt: 'desc' },
      ],
      take: filters?.limit || 100,
      include: {
        feedbacks: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })
  }
  
  /**
   * Perform action on recommendation
   */
  async performAction(action: RecommendationAction) {
    const { recommendationId, action: actionType, reason, snoozeDays, result } = action
    
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
    })
    
    if (!recommendation) {
      throw new Error('Recommendation not found')
    }
    
    const updates: any = {
      status: actionType,
      statusReason: reason,
      updatedAt: new Date(),
    }
    
    switch (actionType) {
      case 'accept':
        updates.status = 'accepted'
        updates.acceptedAt = new Date()
        break
      
      case 'reject':
        updates.status = 'rejected'
        updates.rejectedAt = new Date()
        break
      
      case 'snooze':
        updates.status = 'proposed' // Keep as proposed
        updates.snoozedUntil = addDays(new Date(), snoozeDays || 7)
        break
      
      case 'apply':
        updates.status = 'applied'
        updates.appliedAt = new Date()
        updates.applicationResult = result
        
        // TODO: Actually apply the recommendation via API
        await this.applyRecommendation(recommendation)
        break
      
      case 'revert':
        updates.status = 'reverted'
        updates.revertedAt = new Date()
        updates.revertReason = reason
        
        // TODO: Revert the recommendation via API
        await this.revertRecommendation(recommendation)
        break
    }
    
    return prisma.recommendation.update({
      where: { id: recommendationId },
      data: updates,
    })
  }
  
  /**
   * Apply recommendation via provider API
   */
  private async applyRecommendation(recommendation: any) {
    // This would integrate with provider APIs to apply changes
    console.log('Applying recommendation:', recommendation.id)
    
    // Example implementation would:
    // 1. Get provider connection
    // 2. Build API request based on action type
    // 3. Execute API call
    // 4. Return result
  }
  
  /**
   * Revert recommendation via provider API
   */
  private async revertRecommendation(recommendation: any) {
    // This would integrate with provider APIs to revert changes
    console.log('Reverting recommendation:', recommendation.id)
    
    // Example implementation would:
    // 1. Get original state from metricsSnapshot
    // 2. Build API request to restore original state
    // 3. Execute API call
    // 4. Return result
  }
  
  /**
   * Add feedback to recommendation
   */
  async addFeedback(
    recommendationId: string,
    accountId: string,
    userId: string,
    type: 'thumbs_up' | 'thumbs_down' | 'comment',
    comment?: string
  ) {
    // Map type to label
    const labelMap = {
      'thumbs_up': 'THUMBS_UP',
      'thumbs_down': 'THUMBS_DOWN',
      'comment': 'IGNORED'
    }
    
    return prisma.feedback.create({
      data: {
        recommendationId,
        accountId,
        userId,
        label: labelMap[type] as any,
        note: comment,
      },
    })
  }
  
  /**
   * Get recommendation statistics
   */
  async getStatistics(accountId: string) {
    const [total, byStatus, byPriority, byCategory, avgScore] = await Promise.all([
      // Total recommendations
      prisma.recommendation.count({
        where: { accountId },
      }),
      
      // By status
      prisma.recommendation.groupBy({
        by: ['status'],
        where: { accountId },
        _count: true,
      }),
      
      // By priority
      prisma.recommendation.groupBy({
        by: ['priority'],
        where: { accountId },
        _count: true,
      }),
      
      // By category
      prisma.recommendation.groupBy({
        by: ['category'],
        where: { accountId },
        _count: true,
      }),
      
      // Average score
      prisma.recommendation.aggregate({
        where: { accountId },
        _avg: { score: true },
      }),
    ])
    
    return {
      total,
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
      byPriority: Object.fromEntries(byPriority.map(p => [p.priority, p._count])),
      byCategory: Object.fromEntries(byCategory.map(c => [c.category, c._count])),
      avgScore: avgScore._avg.score || 0,
    }
  }
}

// Export singleton instance
export const recommendationService = new RecommendationService()