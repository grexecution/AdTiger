import { Playbook, Condition, Action, Guardrails } from '@/lib/playbooks/types'
import { MetricsSnapshot, WindowPeriod, metricsWindowService } from '@/lib/metrics/window-service'
import { prisma } from '@/lib/prisma'

export interface RuleContext {
  accountId: string
  provider: 'meta' | 'google'
  entityType: 'campaign' | 'ad_group' | 'ad'
  entityId: string
  entityData?: Record<string, any>
  metrics: Record<WindowPeriod, MetricsSnapshot>
}

export interface RuleEvaluationResult {
  playbookKey: string
  playbookName: string
  matched: boolean
  conditionResults: ConditionEvaluation[]
  actions: ActionPayload[]
  score: number
  confidence: number
  explanation: string
  riskAssessment?: string
}

export interface ConditionEvaluation {
  condition: Condition
  passed: boolean
  actualValue: any
  expectedValue: any
  operator: string
  details: string
}

export interface ActionPayload {
  type: string
  target: string
  params: Record<string, any>
  changePct?: number
  guardrails: Guardrails
  metricsSnapshot: MetricsSnapshot
  estimatedImpact: EstimatedImpact
}

export interface EstimatedImpact {
  metric: string
  currentValue: number
  projectedValue: number
  changePct: number
  confidence: number
  revenueImpact?: number
  costSavings?: number
}

export class RuleEngine {
  /**
   * Evaluate a playbook against an entity
   */
  async evaluatePlaybook(
    playbook: Playbook,
    context: RuleContext
  ): Promise<RuleEvaluationResult> {
    // Check if playbook applies to this context
    if (!this.playbookApplies(playbook, context)) {
      return this.createEmptyResult(playbook, 'Playbook does not apply to this entity')
    }
    
    // Evaluate conditions
    const conditionResults = await this.evaluateConditions(
      playbook.conditions,
      context
    )
    
    // Check if conditions are met
    const matched = this.areConditionsMet(
      playbook.conditions,
      conditionResults
    )
    
    if (!matched) {
      return this.createEmptyResult(playbook, 'Conditions not met')
    }
    
    // Build action payloads
    const actions = await this.buildActionPayloads(
      playbook.actions,
      context,
      conditionResults
    )
    
    // Calculate score
    const score = this.calculateScore(actions, context)
    
    // Generate explanation
    const explanation = this.generateExplanation(
      playbook,
      conditionResults,
      context
    )
    
    return {
      playbookKey: playbook.key,
      playbookName: playbook.name,
      matched: true,
      conditionResults,
      actions,
      score,
      confidence: this.calculateConfidence(conditionResults),
      explanation,
      riskAssessment: playbook.risk_notes,
    }
  }
  
  /**
   * Evaluate multiple playbooks
   */
  async evaluatePlaybooks(
    playbooks: Playbook[],
    context: RuleContext
  ): Promise<RuleEvaluationResult[]> {
    const results = await Promise.all(
      playbooks.map(playbook => this.evaluatePlaybook(playbook, context))
    )
    
    // Sort by score descending
    return results
      .filter(r => r.matched)
      .sort((a, b) => b.score - a.score)
  }
  
  /**
   * Check if playbook applies to context
   */
  private playbookApplies(playbook: Playbook, context: RuleContext): boolean {
    const { applies_to } = playbook
    
    // Check provider
    if (!applies_to.providers.includes(context.provider)) {
      return false
    }
    
    // Check entity level
    if (!applies_to.levels.includes(context.entityType)) {
      return false
    }
    
    // Check objectives if specified
    if (applies_to.objectives && context.entityData?.objective) {
      if (!applies_to.objectives.includes(context.entityData.objective)) {
        return false
      }
    }
    
    return true
  }
  
  /**
   * Evaluate all conditions
   */
  private async evaluateConditions(
    conditions: any,
    context: RuleContext
  ): Promise<ConditionEvaluation[]> {
    const results: ConditionEvaluation[] = []
    
    // Evaluate ALL conditions
    if (conditions.all) {
      for (const condition of conditions.all) {
        const result = await this.evaluateCondition(condition, context)
        results.push(result)
      }
    }
    
    // Evaluate ANY conditions
    if (conditions.any) {
      for (const condition of conditions.any) {
        const result = await this.evaluateCondition(condition, context)
        results.push(result)
      }
    }
    
    // Evaluate NONE conditions
    if (conditions.none) {
      for (const condition of conditions.none) {
        const result = await this.evaluateCondition(condition, context)
        // Invert the result for NONE conditions
        result.passed = !result.passed
        results.push(result)
      }
    }
    
    return results
  }
  
  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: Condition,
    context: RuleContext
  ): Promise<ConditionEvaluation> {
    // Handle metric conditions
    if (condition.metric && condition.op) {
      return this.evaluateMetricCondition(condition, context)
    }
    
    // Handle trend conditions
    if (condition.trend) {
      return this.evaluateTrendCondition(condition.trend, context)
    }
    
    // Handle custom conditions
    if (condition.custom) {
      return this.evaluateCustomCondition(condition.custom, context)
    }
    
    return {
      condition,
      passed: false,
      actualValue: null,
      expectedValue: null,
      operator: 'unknown',
      details: 'Unknown condition type',
    }
  }
  
  /**
   * Evaluate metric condition
   */
  private evaluateMetricCondition(
    condition: Condition,
    context: RuleContext
  ): ConditionEvaluation {
    const window = (condition.window || '7d') as WindowPeriod
    const metrics = context.metrics[window]
    
    if (!metrics) {
      return {
        condition,
        passed: false,
        actualValue: null,
        expectedValue: condition.value,
        operator: condition.op!,
        details: `No metrics available for window ${window}`,
      }
    }
    
    const actualValue = (metrics as any)[condition.metric!]
    const expectedValue = condition.value
    
    let passed = false
    switch (condition.op) {
      case '>':
        passed = actualValue > expectedValue!
        break
      case '>=':
        passed = actualValue >= expectedValue!
        break
      case '<':
        passed = actualValue < expectedValue!
        break
      case '<=':
        passed = actualValue <= expectedValue!
        break
      case '=':
        passed = actualValue === expectedValue
        break
      case '!=':
        passed = actualValue !== expectedValue
        break
      case 'between':
        if (Array.isArray(expectedValue) && expectedValue.length === 2) {
          passed = actualValue >= expectedValue[0] && actualValue <= expectedValue[1]
        }
        break
    }
    
    return {
      condition,
      passed,
      actualValue,
      expectedValue,
      operator: condition.op!,
      details: `${condition.metric} (${actualValue}) ${condition.op} ${expectedValue}`,
    }
  }
  
  /**
   * Evaluate trend condition
   */
  private evaluateTrendCondition(
    trend: any,
    context: RuleContext
  ): ConditionEvaluation {
    const window = (trend.window || '14d') as WindowPeriod
    const metrics = context.metrics[window]
    
    if (!metrics || !metrics.trend) {
      return {
        condition: { trend },
        passed: false,
        actualValue: null,
        expectedValue: trend.direction,
        operator: 'trend',
        details: 'No trend data available',
      }
    }
    
    const actualDirection = metrics.trend.direction
    const expectedDirections = Array.isArray(trend.direction) 
      ? trend.direction 
      : [trend.direction]
    
    let passed = expectedDirections.includes(actualDirection)
    
    // Check minimum change percentage if specified
    if (passed && trend.min_change_pct !== undefined) {
      passed = Math.abs(metrics.trend.changePct) >= Math.abs(trend.min_change_pct)
    }
    
    // Check significance level if specified
    if (passed && trend.significance_level !== undefined) {
      const significance = metrics.trend.significance || 'none'
      const requiredLevels = ['high', 'medium', 'low', 'none']
      const currentLevel = requiredLevels.indexOf(significance)
      const requiredLevel = requiredLevels.indexOf(trend.significance_level)
      passed = currentLevel <= requiredLevel
    }
    
    return {
      condition: { trend },
      passed,
      actualValue: {
        direction: actualDirection,
        changePct: metrics.trend.changePct,
        significance: metrics.trend.significance,
      },
      expectedValue: {
        direction: expectedDirections,
        min_change_pct: trend.min_change_pct,
        significance_level: trend.significance_level,
      },
      operator: 'trend',
      details: `Trend ${actualDirection} (${metrics.trend.changePct.toFixed(2)}%)`,
    }
  }
  
  /**
   * Evaluate custom condition
   */
  private evaluateCustomCondition(
    custom: any,
    context: RuleContext
  ): ConditionEvaluation {
    // Extensible for custom business logic
    let passed = false
    let actualValue: any = null
    let details = ''
    
    switch (custom.type) {
      case 'hourly_variance':
        // Check hourly performance variance
        // This would need hourly data implementation
        passed = false
        details = 'Hourly variance check not implemented'
        break
      
      case 'audience_overlap':
        // Check audience overlap percentage
        passed = false
        details = 'Audience overlap check not implemented'
        break
      
      case 'competitive_position':
        // Check competitive metrics
        passed = false
        details = 'Competitive position check not implemented'
        break
      
      default:
        details = `Unknown custom condition type: ${custom.type}`
    }
    
    return {
      condition: { custom },
      passed,
      actualValue,
      expectedValue: custom.params,
      operator: 'custom',
      details,
    }
  }
  
  /**
   * Check if conditions are met based on results
   */
  private areConditionsMet(
    conditions: any,
    results: ConditionEvaluation[]
  ): boolean {
    // Check ALL conditions
    if (conditions.all) {
      const allResults = results.filter(r => 
        conditions.all.includes(r.condition)
      )
      if (allResults.some(r => !r.passed)) return false
    }
    
    // Check ANY conditions
    if (conditions.any) {
      const anyResults = results.filter(r => 
        conditions.any.includes(r.condition)
      )
      if (anyResults.length > 0 && !anyResults.some(r => r.passed)) return false
    }
    
    // Check NONE conditions (already inverted in evaluation)
    if (conditions.none) {
      const noneResults = results.filter(r => 
        conditions.none.includes(r.condition)
      )
      if (noneResults.some(r => !r.passed)) return false
    }
    
    return true
  }
  
  /**
   * Build action payloads
   */
  private async buildActionPayloads(
    actions: Action[],
    context: RuleContext,
    conditionResults: ConditionEvaluation[]
  ): Promise<ActionPayload[]> {
    const payloads: ActionPayload[] = []
    const primaryMetrics = context.metrics['7d'] || context.metrics['14d']
    
    for (const action of actions) {
      const impact = this.estimateImpact(action, primaryMetrics, context)
      
      payloads.push({
        type: action.type,
        target: action.target || context.entityId,
        params: action.params || {},
        changePct: action.change_pct,
        guardrails: this.applyGuardrails(action.guardrails || {}, context),
        metricsSnapshot: primaryMetrics,
        estimatedImpact: impact,
      })
    }
    
    return payloads
  }
  
  /**
   * Estimate impact of an action
   */
  private estimateImpact(
    action: Action,
    metrics: MetricsSnapshot,
    context: RuleContext
  ): EstimatedImpact {
    let impact: EstimatedImpact = {
      metric: 'conversions',
      currentValue: metrics.conversions,
      projectedValue: metrics.conversions,
      changePct: 0,
      confidence: 0.5,
    }
    
    switch (action.type) {
      case 'recommend_budget_change':
        const budgetChange = action.change_pct || 0
        impact = {
          metric: 'conversions',
          currentValue: metrics.conversions,
          projectedValue: metrics.conversions * (1 + budgetChange / 100),
          changePct: budgetChange,
          confidence: 0.7,
          revenueImpact: (metrics.revenue * budgetChange / 100),
        }
        break
      
      case 'recommend_pause':
        impact = {
          metric: 'spend',
          currentValue: metrics.spend,
          projectedValue: 0,
          changePct: -100,
          confidence: 1.0,
          costSavings: metrics.spend,
        }
        break
      
      case 'recommend_bid_adjustment':
        const bidChange = action.params?.bid_change_pct || 0
        impact = {
          metric: 'cpc',
          currentValue: metrics.cpc,
          projectedValue: metrics.cpc * (1 + bidChange / 100),
          changePct: bidChange,
          confidence: 0.6,
        }
        break
      
      case 'recommend_creative_refresh':
        // Estimate CTR improvement
        impact = {
          metric: 'ctr',
          currentValue: metrics.ctr,
          projectedValue: metrics.ctr * 1.25, // 25% improvement estimate
          changePct: 25,
          confidence: 0.5,
          revenueImpact: metrics.revenue * 0.25,
        }
        break
    }
    
    return impact
  }
  
  /**
   * Apply guardrails to action
   */
  private applyGuardrails(
    guardrails: Guardrails,
    context: RuleContext
  ): Guardrails {
    // Apply default guardrails and merge with specified ones
    const defaults: Guardrails = {
      max_daily_increase_pct: 50,
      max_daily_decrease_pct: 50,
      cooldown_hours: 24,
      require_approval: false,
    }
    
    return { ...defaults, ...guardrails }
  }
  
  /**
   * Calculate score for recommendations
   */
  private calculateScore(
    actions: ActionPayload[],
    context: RuleContext
  ): number {
    let score = 0
    
    for (const action of actions) {
      const impact = action.estimatedImpact
      
      // Base score on estimated impact
      if (impact.revenueImpact) {
        score += impact.revenueImpact * 10
      }
      
      if (impact.costSavings) {
        score += impact.costSavings * 5
      }
      
      // Adjust by confidence
      score *= impact.confidence
      
      // Adjust by metric importance
      const metricWeights: Record<string, number> = {
        conversions: 1.0,
        revenue: 1.0,
        roas: 0.9,
        cpa: 0.8,
        ctr: 0.6,
        spend: 0.5,
      }
      
      const weight = metricWeights[impact.metric] || 0.5
      score *= weight
    }
    
    // Normalize score to 0-100 range
    return Math.min(100, Math.max(0, score))
  }
  
  /**
   * Calculate confidence based on condition results
   */
  private calculateConfidence(results: ConditionEvaluation[]): number {
    if (results.length === 0) return 0
    
    const passedCount = results.filter(r => r.passed).length
    const confidence = passedCount / results.length
    
    // Adjust confidence based on data quality
    // (would check data points, recency, etc. in production)
    
    return confidence
  }
  
  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    playbook: Playbook,
    conditionResults: ConditionEvaluation[],
    context: RuleContext
  ): string {
    let explanation = playbook.explanation_template || playbook.description_md
    
    // Replace template variables with actual values
    const metrics = context.metrics['7d'] || {}
    
    // Common replacements
    const replacements: Record<string, any> = {
      entity_type: context.entityType,
      entity_id: context.entityId,
      ...this.flattenMetrics(metrics),
    }
    
    // Add condition results
    conditionResults.forEach((result, index) => {
      replacements[`condition_${index}_passed`] = result.passed
      replacements[`condition_${index}_actual`] = result.actualValue
      replacements[`condition_${index}_expected`] = result.expectedValue
    })
    
    // Replace all {{variable}} patterns
    for (const [key, value] of Object.entries(replacements)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      explanation = explanation.replace(pattern, String(value))
    }
    
    return explanation
  }
  
  /**
   * Flatten metrics object for template replacement
   */
  private flattenMetrics(metrics: any): Record<string, any> {
    const flat: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(metrics)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Handle nested objects like trend
        for (const [subKey, subValue] of Object.entries(value)) {
          flat[`${key}_${subKey}`] = subValue
        }
      } else {
        flat[key] = value
      }
    }
    
    return flat
  }
  
  /**
   * Create empty result when playbook doesn't match
   */
  private createEmptyResult(playbook: Playbook, reason: string): RuleEvaluationResult {
    return {
      playbookKey: playbook.key,
      playbookName: playbook.name,
      matched: false,
      conditionResults: [],
      actions: [],
      score: 0,
      confidence: 0,
      explanation: reason,
    }
  }
}

// Export singleton instance
export const ruleEngine = new RuleEngine()