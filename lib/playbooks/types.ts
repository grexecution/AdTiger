export interface Playbook {
  key: string
  name: string
  description_md: string
  applies_to: AppliesTo
  conditions: Conditions
  actions: Action[]
  explanation_template: string
  risk_notes: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  enabled?: boolean
  version?: string
  tags?: string[]
}

export interface AppliesTo {
  providers: ('meta' | 'google')[]
  levels: ('campaign' | 'ad_group' | 'ad')[]
  objectives?: string[]
  account_types?: string[]
}

export interface Conditions {
  all?: Condition[]
  any?: Condition[]
  none?: Condition[]
}

export interface Condition {
  metric?: string
  op?: '>' | '>=' | '<' | '<=' | '=' | '!=' | 'in' | 'not_in' | 'between'
  value?: number | string | number[]
  window?: string // e.g., "7d", "14d", "30d"
  trend?: TrendCondition
  custom?: CustomCondition
}

export interface TrendCondition {
  metric: string
  window: string
  direction: ('up' | 'down' | 'stable')[]
  min_change_pct?: number
  significance_level?: number // z-score threshold
}

export interface CustomCondition {
  type: string
  params: Record<string, any>
}

export interface Action {
  type: string
  target?: string
  params?: Record<string, any>
  change_pct?: number
  guardrails?: Guardrails
  template?: string
}

export interface Guardrails {
  max_daily_increase_pct?: number
  max_daily_decrease_pct?: number
  min_budget?: number
  max_budget?: number
  cooldown_hours?: number
  require_approval?: boolean
  approval_threshold?: number
}

export interface PlaybookEvaluation {
  playbook_key: string
  entity_id: string
  entity_type: string
  conditions_met: boolean
  condition_results: ConditionResult[]
  recommended_actions: RecommendedAction[]
  explanation: string
  risk_assessment: string
  confidence_score: number
  timestamp: Date
}

export interface ConditionResult {
  condition: Condition
  met: boolean
  actual_value?: any
  expected_value?: any
  details?: string
}

export interface RecommendedAction {
  type: string
  description: string
  params: Record<string, any>
  estimated_impact?: EstimatedImpact
  guardrails?: Guardrails
}

export interface EstimatedImpact {
  metric: string
  current_value: number
  projected_value: number
  change_pct: number
  confidence_interval?: [number, number]
}