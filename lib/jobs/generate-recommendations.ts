import { Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { RecommendationsJobData } from '@/lib/queue/queues'
import { playbookRepository } from '@/lib/playbooks/repository'
import { Playbook } from '@/lib/playbooks/types'

export async function generateRecommendations(job: Job<RecommendationsJobData>) {
  const { accountId, adAccountId, playbookIds } = job.data
  
  try {
    job.log('Starting recommendation generation')
    
    // Load playbooks using the repository
    const playbooks = playbookIds && playbookIds.length > 0
      ? playbookIds.map(id => playbookRepository.get(id)).filter(Boolean) as Playbook[]
      : playbookRepository.getFiltered({ enabled: true })
    job.log(`Loaded ${playbooks.length} playbooks`)
    
    // Get ad accounts to process
    const adAccounts = adAccountId
      ? await prisma.adAccount.findMany({
          where: { id: adAccountId, accountId },
        })
      : await prisma.adAccount.findMany({
          where: { accountId },
        })
    
    let totalRecommendations = 0
    let progress = 0
    
    for (const adAccount of adAccounts) {
      await job.updateProgress((progress / adAccounts.length) * 100)
      job.log(`Processing ad account: ${adAccount.name}`)
      
      // Get recent insights for analysis
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 30)
      
      // Process each entity level
      const levels = ['campaign', 'adset', 'ad']
      
      for (const level of levels) {
        const insights = await prisma.insight.findMany({
          where: {
            accountId,
            provider: adAccount.provider,
            entityType: level,
            date: { gte: recentDate },
          },
          orderBy: { date: 'desc' },
        })
        
        // Group insights by entity
        const insightsByEntity = insights.reduce((acc, insight) => {
          if (!acc[insight.entityId]) {
            acc[insight.entityId] = []
          }
          acc[insight.entityId].push(insight)
          return acc
        }, {} as Record<string, typeof insights>)
        
        // Apply playbook rules to each entity
        for (const [entityId, entityInsights] of Object.entries(insightsByEntity)) {
          const recommendations = await applyPlaybookRules(
            playbooks,
            entityId,
            level,
            entityInsights,
            adAccount
          )
          
          // Save recommendations
          for (const recommendation of recommendations) {
            // Check if similar recommendation already exists
            const existing = await prisma.recommendation.findFirst({
              where: {
                accountId,
                entityId,
                type: recommendation.type,
                status: 'pending',
              },
            })
            
            if (!existing) {
              await prisma.recommendation.create({
                data: {
                  accountId,
                  provider: adAccount.provider,
                  scopeType: level,
                  scopeId: entityId,
                  entityType: level, // Keep for backwards compatibility
                  entityId, // Keep for backwards compatibility
                  ruleKey: 'generated', // TODO: Get from actual rule
                  playbookKey: 'generated', // TODO: Get from actual playbook
                  ruleId: 'generated', // Deprecated
                  playbookId: 'generated', // Deprecated
                  type: recommendation.type,
                  priority: recommendation.priority,
                  category: 'performance', // TODO: Get from recommendation
                  status: 'proposed',
                  title: recommendation.title,
                  description: recommendation.description,
                  estimatedImpact: recommendation.estimatedImpact,
                  payload: {
                    suggestedAction: recommendation.suggestedAction,
                    ...recommendation.metadata,
                  },
                  score: 0,
                  confidence: 0.5,
                },
              })
              totalRecommendations++
            }
          }
        }
      }
      
      progress++
    }
    
    await job.updateProgress(100)
    job.log(`Generated ${totalRecommendations} recommendations`)
    
    return {
      success: true,
      totalRecommendations,
      timestamp: new Date().toISOString(),
    }
    
  } catch (error) {
    job.log(`Error generating recommendations: ${error}`)
    throw error
  }
}


async function applyPlaybookRules(
  playbooks: Playbook[],
  entityId: string,
  entityType: string,
  insights: any[],
  adAccount: any
): Promise<any[]> {
  const recommendations: any[] = []
  
  for (const playbook of playbooks) {
    // Check if playbook applies to this provider and entity type
    if (!playbook.applies_to.providers.includes(adAccount.provider)) {
      continue
    }
    
    if (!playbook.applies_to.levels.includes(entityType as any)) {
      continue
    }
    
    // Calculate average metrics from insights
    const metrics = calculateMetrics(insights)
    
    // Evaluate playbook conditions
    const conditionResults = playbookRepository.evaluateConditions(
      playbook,
      { entityId, entityType, adAccountId: adAccount.id },
      metrics
    )
    
    const conditionsMet = playbookRepository.areConditionsMet(playbook, conditionResults)
    
    if (conditionsMet) {
      // Generate recommendations from actions
      for (const action of playbook.actions) {
        recommendations.push({
          type: action.type,
          priority: playbook.priority || 'medium',
          title: playbook.name,
          description: interpolateTemplate(playbook.explanation_template, metrics),
          estimatedImpact: calculateImpact(action, insights),
          suggestedAction: {
            type: action.type,
            target: action.target,
            changePct: action.change_pct,
            ...action.params,
          },
          metadata: {
            playbookKey: playbook.key,
            playbookName: playbook.name,
            riskNotes: playbook.risk_notes,
            guardrails: action.guardrails,
          },
        })
      }
    }
  }
  
  return recommendations
}

function calculateMetrics(insights: any[]): Record<string, any> {
  if (insights.length === 0) return {}
  
  const metrics: Record<string, any> = {}
  const latestInsight = insights[0]
  
  // Calculate aggregated metrics
  for (const insight of insights) {
    const insightMetrics = insight.metrics as any
    for (const [key, value] of Object.entries(insightMetrics)) {
      if (!metrics[key]) {
        metrics[key] = []
      }
      metrics[key].push(value)
    }
  }
  
  // Calculate averages and trends
  const result: Record<string, any> = {}
  for (const [key, values] of Object.entries(metrics)) {
    if (Array.isArray(values)) {
      result[key] = values[0] // Latest value
      result[`${key}_7d`] = values.slice(0, 7).reduce((a: any, b: any) => a + b, 0) / Math.min(values.length, 7)
      result[`${key}_14d`] = values.slice(0, 14).reduce((a: any, b: any) => a + b, 0) / Math.min(values.length, 14)
      result[`${key}_30d`] = values.reduce((a: any, b: any) => a + b, 0) / values.length
      
      // Calculate trend
      if (values.length >= 2) {
        const oldValue = values[values.length - 1]
        const newValue = values[0]
        result[`${key}_trend`] = oldValue > 0 ? ((newValue - oldValue) / oldValue * 100).toFixed(2) + '%' : 'N/A'
      }
    }
  }
  
  return result
}

function interpolateTemplate(template: string, metrics: Record<string, any>): string {
  let result = template
  
  // Replace all {{variable}} with actual values
  const matches = template.match(/\{\{(\w+)\}\}/g) || []
  for (const match of matches) {
    const key = match.replace(/\{\{|\}\}/g, '')
    const value = metrics[key] !== undefined ? metrics[key] : 'N/A'
    result = result.replace(match, String(value))
  }
  
  return result
}

function calculateImpact(action: any, insights: any[]): any {
  if (insights.length === 0) {
    return null
  }
  
  const latestMetrics = insights[0].metrics as any
  const changePct = action.change_pct || 0
  
  // Calculate projected impact based on action type
  switch (action.type) {
    case 'recommend_budget_change':
      return {
        metric: 'conversions',
        current: latestMetrics.conversions || 0,
        projected: Math.round((latestMetrics.conversions || 0) * (1 + changePct / 100)),
        change: `+${changePct}%`,
      }
    
    case 'recommend_pause':
      return {
        metric: 'spend',
        current: latestMetrics.spend || 0,
        projected: 0,
        change: '-100%',
        savings: latestMetrics.spend || 0,
      }
    
    case 'recommend_creative_refresh':
      return {
        metric: 'ctr',
        current: latestMetrics.ctr || 0,
        projected: (latestMetrics.ctr || 0) * 1.25, // Estimate 25% CTR improvement
        change: '+25%',
      }
    
    default:
      return {
        metric: 'performance',
        current: 'current',
        projected: 'improved',
        change: 'positive',
      }
  }
}