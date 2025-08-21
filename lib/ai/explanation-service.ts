import OpenAI from 'openai'
import { Playbook } from '@/lib/playbooks/types'
import { RuleEvaluationResult, ActionPayload } from '@/lib/rules/engine'
import { MetricsSnapshot } from '@/lib/metrics/window-service'

export interface ExplanationRequest {
  playbook: Playbook
  evaluationResult: RuleEvaluationResult
  metricsSnapshots: {
    '7d'?: MetricsSnapshot
    '14d'?: MetricsSnapshot
    '30d'?: MetricsSnapshot
  }
  entityType: string
  entityName?: string
  provider: string
}

export interface ExplanationResponse {
  whatToDo: string
  why: string
  steps: string[]
  risks: string[]
  whatToMonitor: string[]
  summary: string
  confidence: string
  model: string
}

const SYSTEM_PROMPT = `You are a senior performance marketer with 10+ years of experience managing large-scale ad campaigns.

Your role is to explain optimization recommendations in a clear, actionable way for marketing teams.

Guidelines:
- Use concise, concrete language
- Be specific with numbers and metrics
- Never invent or fabricate data
- If uncertain about something, explicitly say so
- Focus on practical implementation
- Consider both opportunities and risks
- Provide monitoring guidance for after implementation

Format your response as a JSON object with these fields:
- whatToDo: Brief description of the recommended action (1-2 sentences)
- why: Clear explanation of why this action is recommended (2-3 sentences)
- steps: Array of specific implementation steps (3-5 items)
- risks: Array of potential risks or considerations (2-3 items)
- whatToMonitor: Array of metrics to watch after implementation (3-4 items)
- summary: Executive summary in one sentence
- confidence: "high", "medium", or "low" based on data quality and clarity`

export class ExplanationService {
  private openai: OpenAI | null = null
  private model: string = 'gpt-4-turbo-preview'
  
  constructor() {
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    }
  }
  
  /**
   * Generate AI explanation for a recommendation
   */
  async generateExplanation(request: ExplanationRequest): Promise<ExplanationResponse> {
    // If no AI service is configured, return a template explanation
    if (!this.openai) {
      return this.generateTemplateExplanation(request)
    }
    
    try {
      const userContent = this.buildUserContent(request)
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3, // Lower temperature for more consistent output
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      })
      
      const response = completion.choices[0]?.message?.content
      
      if (!response) {
        throw new Error('No response from AI')
      }
      
      const parsed = JSON.parse(response) as ExplanationResponse
      parsed.model = this.model
      
      // Apply guardrails to the explanation
      return this.applyGuardrails(parsed, request)
      
    } catch (error) {
      console.error('Error generating AI explanation:', error)
      // Fallback to template explanation
      return this.generateTemplateExplanation(request)
    }
  }
  
  /**
   * Build user content for the AI prompt
   */
  private buildUserContent(request: ExplanationRequest): string {
    const { playbook, evaluationResult, metricsSnapshots, entityType, entityName, provider } = request
    
    // Get the primary action
    const action = evaluationResult.actions[0]
    
    // Prepare metrics summary
    const metricsSummary = this.summarizeMetrics(metricsSnapshots)
    
    const content = {
      context: {
        provider,
        entityType,
        entityName: entityName || 'Unknown',
        playbookName: playbook.name,
        playbookDescription: playbook.description_md,
      },
      currentPerformance: metricsSummary,
      recommendation: {
        type: action?.type || 'optimization',
        changePct: action?.changePct,
        estimatedImpact: action?.estimatedImpact,
        score: evaluationResult.score,
        confidence: evaluationResult.confidence,
      },
      conditions: evaluationResult.conditionResults.map(c => ({
        metric: c.condition.metric,
        operator: c.operator,
        expected: c.expectedValue,
        actual: c.actualValue,
        passed: c.passed,
      })),
      guardrails: action?.guardrails || {},
      riskNotes: playbook.risk_notes,
    }
    
    return JSON.stringify(content, null, 2)
  }
  
  /**
   * Summarize metrics for AI context
   */
  private summarizeMetrics(snapshots: ExplanationRequest['metricsSnapshots']) {
    const summary: any = {}
    
    for (const [period, snapshot] of Object.entries(snapshots)) {
      if (!snapshot) continue
      
      summary[period] = {
        impressions: snapshot.impressions,
        clicks: snapshot.clicks,
        spend: snapshot.spend,
        conversions: snapshot.conversions,
        revenue: snapshot.revenue,
        ctr: `${snapshot.ctr.toFixed(2)}%`,
        cpc: `$${snapshot.cpc.toFixed(2)}`,
        cpa: `$${snapshot.cpa.toFixed(2)}`,
        roas: snapshot.roas.toFixed(2),
        cvr: `${snapshot.cvr.toFixed(2)}%`,
        trend: snapshot.trend ? {
          direction: snapshot.trend.direction,
          changePct: `${snapshot.trend.changePct.toFixed(2)}%`,
        } : null,
      }
    }
    
    return summary
  }
  
  /**
   * Apply guardrails to AI explanation
   */
  private applyGuardrails(
    explanation: ExplanationResponse,
    request: ExplanationRequest
  ): ExplanationResponse {
    const action = request.evaluationResult.actions[0]
    
    if (!action) return explanation
    
    // Apply budget change guardrails
    if (action.type === 'recommend_budget_change' && action.changePct) {
      const maxIncrease = action.guardrails?.max_daily_increase_pct || 50
      const maxDecrease = action.guardrails?.max_daily_decrease_pct || 50
      
      let actualChangePct = action.changePct
      
      if (actualChangePct > 0) {
        actualChangePct = Math.min(actualChangePct, maxIncrease)
      } else {
        actualChangePct = Math.max(actualChangePct, -maxDecrease)
      }
      
      // Update explanation if change was capped
      if (actualChangePct !== action.changePct) {
        explanation.risks.unshift(
          `Budget change capped at ${actualChangePct}% due to guardrails (requested: ${action.changePct}%)`
        )
      }
    }
    
    // Add monitoring for cooldown period
    if (action.guardrails?.cooldown_hours) {
      explanation.whatToMonitor.push(
        `Wait ${action.guardrails.cooldown_hours} hours before making additional changes`
      )
    }
    
    // Add approval requirement notice
    if (action.guardrails?.require_approval) {
      explanation.steps.unshift('⚠️ This action requires approval before implementation')
    }
    
    // Ensure we never suggest direct API changes in MVP
    explanation.steps = explanation.steps.map(step => {
      if (step.toLowerCase().includes('api') || step.toLowerCase().includes('automatically')) {
        return step + ' (Manual implementation required in current version)'
      }
      return step
    })
    
    return explanation
  }
  
  /**
   * Generate template-based explanation when AI is not available
   */
  private generateTemplateExplanation(request: ExplanationRequest): ExplanationResponse {
    const { playbook, evaluationResult, metricsSnapshots, entityType } = request
    const action = evaluationResult.actions[0]
    const metrics = metricsSnapshots['7d'] || metricsSnapshots['14d'] || metricsSnapshots['30d']
    
    let whatToDo = ''
    let why = ''
    let steps: string[] = []
    let risks: string[] = []
    let whatToMonitor: string[] = []
    
    // Generate based on action type
    switch (action?.type) {
      case 'recommend_budget_change':
        const changePct = Math.min(
          action.changePct || 15,
          action.guardrails?.max_daily_increase_pct || 50
        )
        whatToDo = `Increase budget by ${changePct}% for this ${entityType}`
        why = `Performance metrics show strong ROAS (${metrics?.roas.toFixed(2)}) with ${metrics?.conversions} conversions. Scaling budget can capture more conversions while maintaining efficiency.`
        steps = [
          `Review current budget allocation`,
          `Calculate new budget (current + ${changePct}%)`,
          `Apply change in ad platform`,
          `Set calendar reminder to review in 48 hours`,
        ]
        risks = [
          'Increased spend may affect overall account budget',
          'Performance may not scale linearly with budget',
          'Monitor for audience saturation signals',
        ]
        whatToMonitor = [
          'ROAS maintenance above target threshold',
          'CPA trends over next 7 days',
          'Frequency to detect audience fatigue',
          'Conversion volume changes',
        ]
        break
      
      case 'recommend_pause':
        whatToDo = `Pause this underperforming ${entityType}`
        why = `Current spend ($${metrics?.spend.toFixed(2)}) is not generating sufficient conversions (${metrics?.conversions}). Pausing will prevent further budget waste.`
        steps = [
          `Document current performance metrics`,
          `Pause in ad platform`,
          `Analyze root causes (creative, targeting, etc.)`,
          `Create improvement plan before reactivation`,
        ]
        risks = [
          'Loss of any marginal conversions',
          'Learning phase reset if reactivated',
        ]
        whatToMonitor = [
          'Budget reallocation to other campaigns',
          'Overall account performance impact',
          'Competitive position changes',
        ]
        break
      
      case 'recommend_creative_refresh':
        whatToDo = `Refresh creative assets for this ${entityType}`
        why = `CTR has declined to ${metrics?.ctr.toFixed(2)}% and frequency is ${metrics?.frequency.toFixed(1)}, indicating creative fatigue.`
        steps = [
          `Analyze top performing creative elements`,
          `Develop 3-5 new creative variations`,
          `Set up A/B test structure`,
          `Launch with same targeting parameters`,
        ]
        risks = [
          'New creatives may underperform initially',
          'Testing period may temporarily reduce efficiency',
        ]
        whatToMonitor = [
          'CTR improvement vs. baseline',
          'Engagement metrics',
          'Frequency reduction',
          'Cost per result changes',
        ]
        break
      
      default:
        whatToDo = playbook.name
        why = playbook.description_md
        steps = ['Review recommendation details', 'Implement as appropriate']
        risks = ['Review specific implementation risks']
        whatToMonitor = ['Key performance metrics']
    }
    
    // Add risk notes from playbook
    if (playbook.risk_notes) {
      risks.push(...playbook.risk_notes.split('\n').filter(r => r.trim()))
    }
    
    return {
      whatToDo,
      why,
      steps,
      risks: risks.slice(0, 3), // Limit to 3 risks
      whatToMonitor: whatToMonitor.slice(0, 4), // Limit to 4 metrics
      summary: whatToDo,
      confidence: evaluationResult.confidence > 0.7 ? 'high' : 
                  evaluationResult.confidence > 0.4 ? 'medium' : 'low',
      model: 'template',
    }
  }
  
  /**
   * Validate and sanitize explanation
   */
  validateExplanation(explanation: ExplanationResponse): boolean {
    // Check required fields
    if (!explanation.whatToDo || !explanation.why) {
      return false
    }
    
    // Check array fields
    if (!Array.isArray(explanation.steps) || explanation.steps.length === 0) {
      return false
    }
    
    if (!Array.isArray(explanation.risks) || explanation.risks.length === 0) {
      return false
    }
    
    if (!Array.isArray(explanation.whatToMonitor) || explanation.whatToMonitor.length === 0) {
      return false
    }
    
    // Validate confidence
    const validConfidence = ['high', 'medium', 'low']
    if (!validConfidence.includes(explanation.confidence)) {
      return false
    }
    
    return true
  }
  
  /**
   * Format explanation for display
   */
  formatExplanation(explanation: ExplanationResponse): string {
    const sections = [
      `## What to Do\n${explanation.whatToDo}`,
      `\n## Why\n${explanation.why}`,
      `\n## Implementation Steps\n${explanation.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
      `\n## Risks & Considerations\n${explanation.risks.map(r => `• ${r}`).join('\n')}`,
      `\n## What to Monitor\n${explanation.whatToMonitor.map(m => `• ${m}`).join('\n')}`,
      `\n---\n*Confidence: ${explanation.confidence} | Model: ${explanation.model}*`,
    ]
    
    return sections.join('\n')
  }
  
  /**
   * Generate batch explanations
   */
  async generateBatchExplanations(
    requests: ExplanationRequest[]
  ): Promise<ExplanationResponse[]> {
    // Process in parallel with rate limiting
    const batchSize = 3 // Process 3 at a time to avoid rate limits
    const results: ExplanationResponse[] = []
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(req => this.generateExplanation(req))
      )
      results.push(...batchResults)
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return results
  }
}

// Export singleton instance
export const explanationService = new ExplanationService()