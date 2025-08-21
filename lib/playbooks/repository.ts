import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join } from 'path'
import * as yaml from 'js-yaml'
import { Playbook, PlaybookEvaluation, Condition, ConditionResult } from './types'

export class PlaybookRepository {
  private static instance: PlaybookRepository
  private playbooks: Map<string, Playbook> = new Map()
  private fileTimestamps: Map<string, number> = new Map()
  private readonly playbooksPath: string
  private cacheTimeout: number = 60000 // 1 minute cache

  private constructor() {
    this.playbooksPath = join(process.cwd(), 'storage', 'app', 'kb')
    this.loadPlaybooks()
  }

  static getInstance(): PlaybookRepository {
    if (!PlaybookRepository.instance) {
      PlaybookRepository.instance = new PlaybookRepository()
    }
    return PlaybookRepository.instance
  }

  /**
   * Load all playbooks from the filesystem
   */
  private loadPlaybooks(): void {
    if (!existsSync(this.playbooksPath)) {
      console.warn(`Playbooks directory not found: ${this.playbooksPath}`)
      return
    }

    const files = readdirSync(this.playbooksPath).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    
    for (const file of files) {
      this.loadPlaybook(file)
    }

    console.log(`Loaded ${this.playbooks.size} playbooks`)
  }

  /**
   * Load a single playbook file
   */
  private loadPlaybook(filename: string): void {
    try {
      const filepath = join(this.playbooksPath, filename)
      const stats = statSync(filepath)
      
      // Check if file has been modified
      const lastModified = stats.mtimeMs
      const cachedTimestamp = this.fileTimestamps.get(filename)
      
      if (cachedTimestamp && cachedTimestamp === lastModified) {
        return // File hasn't changed, skip reload
      }

      const content = readFileSync(filepath, 'utf-8')
      const playbook = yaml.load(content) as Playbook
      
      // Validate playbook structure
      if (this.validatePlaybook(playbook)) {
        this.playbooks.set(playbook.key, playbook)
        this.fileTimestamps.set(filename, lastModified)
        console.log(`Loaded playbook: ${playbook.key}`)
      } else {
        console.error(`Invalid playbook structure in ${filename}`)
      }
    } catch (error) {
      console.error(`Error loading playbook ${filename}:`, error)
    }
  }

  /**
   * Validate playbook structure
   */
  private validatePlaybook(playbook: any): playbook is Playbook {
    return (
      typeof playbook === 'object' &&
      typeof playbook.key === 'string' &&
      typeof playbook.name === 'string' &&
      typeof playbook.description_md === 'string' &&
      typeof playbook.applies_to === 'object' &&
      Array.isArray(playbook.applies_to.providers) &&
      Array.isArray(playbook.applies_to.levels) &&
      typeof playbook.conditions === 'object' &&
      Array.isArray(playbook.actions) &&
      typeof playbook.explanation_template === 'string'
    )
  }

  /**
   * Get all playbooks
   */
  getAll(): Playbook[] {
    this.checkForUpdates()
    return Array.from(this.playbooks.values())
  }

  /**
   * Get playbook by key
   */
  get(key: string): Playbook | undefined {
    this.checkForUpdates()
    return this.playbooks.get(key)
  }

  /**
   * Get playbooks filtered by criteria
   */
  getFiltered(filters: {
    provider?: 'meta' | 'google'
    level?: string
    objective?: string
    tags?: string[]
    enabled?: boolean
  }): Playbook[] {
    this.checkForUpdates()
    
    return this.getAll().filter(playbook => {
      if (filters.provider && !playbook.applies_to.providers.includes(filters.provider)) {
        return false
      }
      
      if (filters.level && !playbook.applies_to.levels.includes(filters.level as any)) {
        return false
      }
      
      if (filters.objective && playbook.applies_to.objectives && 
          !playbook.applies_to.objectives.includes(filters.objective)) {
        return false
      }
      
      if (filters.tags && playbook.tags) {
        const hasAllTags = filters.tags.every(tag => playbook.tags?.includes(tag))
        if (!hasAllTags) return false
      }
      
      if (filters.enabled !== undefined) {
        const isEnabled = playbook.enabled !== false // Default to true if not specified
        if (isEnabled !== filters.enabled) return false
      }
      
      return true
    })
  }

  /**
   * Check for file updates and reload if necessary
   */
  private checkForUpdates(): void {
    if (!existsSync(this.playbooksPath)) return
    
    const files = readdirSync(this.playbooksPath).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    
    for (const file of files) {
      const filepath = join(this.playbooksPath, file)
      const stats = statSync(filepath)
      const lastModified = stats.mtimeMs
      const cachedTimestamp = this.fileTimestamps.get(file)
      
      if (!cachedTimestamp || cachedTimestamp !== lastModified) {
        this.loadPlaybook(file)
      }
    }
  }

  /**
   * Evaluate conditions for a given entity
   */
  evaluateConditions(
    playbook: Playbook,
    entityData: Record<string, any>,
    metrics: Record<string, any>
  ): ConditionResult[] {
    const results: ConditionResult[] = []
    
    // Evaluate ALL conditions
    if (playbook.conditions.all) {
      for (const condition of playbook.conditions.all) {
        const result = this.evaluateCondition(condition, entityData, metrics)
        results.push(result)
      }
    }
    
    // Evaluate ANY conditions
    if (playbook.conditions.any) {
      const anyResults = playbook.conditions.any.map(condition => 
        this.evaluateCondition(condition, entityData, metrics)
      )
      results.push(...anyResults)
    }
    
    // Evaluate NONE conditions (should all be false)
    if (playbook.conditions.none) {
      const noneResults = playbook.conditions.none.map(condition => {
        const result = this.evaluateCondition(condition, entityData, metrics)
        // Invert the result for NONE conditions
        return { ...result, met: !result.met }
      })
      results.push(...noneResults)
    }
    
    return results
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: Condition,
    entityData: Record<string, any>,
    metrics: Record<string, any>
  ): ConditionResult {
    if (condition.metric && condition.op && condition.value !== undefined) {
      const actualValue = metrics[condition.metric]
      const expectedValue = condition.value
      
      let met = false
      switch (condition.op) {
        case '>':
          met = actualValue > expectedValue
          break
        case '>=':
          met = actualValue >= expectedValue
          break
        case '<':
          met = actualValue < expectedValue
          break
        case '<=':
          met = actualValue <= expectedValue
          break
        case '=':
          met = actualValue === expectedValue
          break
        case '!=':
          met = actualValue !== expectedValue
          break
        case 'between':
          if (Array.isArray(expectedValue) && expectedValue.length === 2) {
            met = actualValue >= expectedValue[0] && actualValue <= expectedValue[1]
          }
          break
      }
      
      return {
        condition,
        met,
        actual_value: actualValue,
        expected_value: expectedValue,
        details: `${condition.metric} ${condition.op} ${expectedValue}: ${actualValue}`
      }
    }
    
    if (condition.trend) {
      // Simplified trend evaluation - would need historical data
      const trendMet = this.evaluateTrend(condition.trend, metrics)
      return {
        condition,
        met: trendMet,
        details: `Trend evaluation for ${condition.trend.metric}`
      }
    }
    
    if (condition.custom) {
      // Custom condition evaluation - extensible for special logic
      const customMet = this.evaluateCustomCondition(condition.custom, entityData, metrics)
      return {
        condition,
        met: customMet,
        details: `Custom condition: ${condition.custom.type}`
      }
    }
    
    return {
      condition,
      met: false,
      details: 'Unknown condition type'
    }
  }

  /**
   * Evaluate trend conditions
   */
  private evaluateTrend(
    trend: any,
    metrics: Record<string, any>
  ): boolean {
    // Simplified implementation - would need historical data
    // In production, this would analyze time series data
    return true
  }

  /**
   * Evaluate custom conditions
   */
  private evaluateCustomCondition(
    custom: any,
    entityData: Record<string, any>,
    metrics: Record<string, any>
  ): boolean {
    // Extensible for custom business logic
    switch (custom.type) {
      case 'hourly_variance':
        // Check if hourly variance meets threshold
        return metrics.hourly_variance > (custom.params.min_variance || 0)
      default:
        return false
    }
  }

  /**
   * Check if all conditions are met
   */
  areConditionsMet(playbook: Playbook, results: ConditionResult[]): boolean {
    // Check ALL conditions
    if (playbook.conditions.all) {
      const allResults = results.filter(r => 
        playbook.conditions.all?.includes(r.condition)
      )
      if (allResults.some(r => !r.met)) return false
    }
    
    // Check ANY conditions
    if (playbook.conditions.any) {
      const anyResults = results.filter(r => 
        playbook.conditions.any?.includes(r.condition)
      )
      if (anyResults.length > 0 && !anyResults.some(r => r.met)) return false
    }
    
    // Check NONE conditions (all should be false after inversion)
    if (playbook.conditions.none) {
      const noneResults = results.filter(r => 
        playbook.conditions.none?.includes(r.condition)
      )
      if (noneResults.some(r => !r.met)) return false
    }
    
    return true
  }

  /**
   * Reload all playbooks from disk
   */
  reload(): void {
    this.playbooks.clear()
    this.fileTimestamps.clear()
    this.loadPlaybooks()
  }

  /**
   * Get playbook statistics
   */
  getStats(): {
    total: number
    enabled: number
    byProvider: Record<string, number>
    byLevel: Record<string, number>
    byTag: Record<string, number>
  } {
    const playbooks = this.getAll()
    const stats = {
      total: playbooks.length,
      enabled: playbooks.filter(p => p.enabled !== false).length,
      byProvider: {} as Record<string, number>,
      byLevel: {} as Record<string, number>,
      byTag: {} as Record<string, number>
    }
    
    for (const playbook of playbooks) {
      // Count by provider
      for (const provider of playbook.applies_to.providers) {
        stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1
      }
      
      // Count by level
      for (const level of playbook.applies_to.levels) {
        stats.byLevel[level] = (stats.byLevel[level] || 0) + 1
      }
      
      // Count by tag
      if (playbook.tags) {
        for (const tag of playbook.tags) {
          stats.byTag[tag] = (stats.byTag[tag] || 0) + 1
        }
      }
    }
    
    return stats
  }
}

// Export singleton instance
export const playbookRepository = PlaybookRepository.getInstance()