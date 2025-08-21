// Environment constants
export const META_APP_ID = process.env.META_APP_ID || '1234567890123456'
export const META_APP_SECRET = process.env.META_APP_SECRET || 'abcdef1234567890abcdef1234567890'
export const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || ''
export const META_WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || ''

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
export const GOOGLE_DEVELOPER_TOKEN = process.env.GOOGLE_DEVELOPER_TOKEN || ''
export const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || ''

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

export const REDIS_URL = process.env.REDIS_URL || ''
export const REDIS_TOKEN = process.env.REDIS_TOKEN || ''

export const CRON_SECRET = process.env.CRON_SECRET || ''

// Application constants
export const APP_NAME = 'AdTiger'
export const APP_DESCRIPTION = 'AI-Powered Performance Marketing Dashboard'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3333'

// Provider constants
export const SUPPORTED_PROVIDERS = ['meta', 'google'] as const
export type SupportedProvider = typeof SUPPORTED_PROVIDERS[number]

// Sync constants
export const DEFAULT_SYNC_INTERVAL = 6 * 60 * 60 * 1000 // 6 hours
export const MAX_SYNC_RETRIES = 3
export const SYNC_RETRY_DELAY = 5000 // 5 seconds

// API Rate limits
export const META_API_RATE_LIMIT = 200 // requests per hour
export const GOOGLE_API_RATE_LIMIT = 15000 // operations per day

// Insights windows
export const INSIGHT_WINDOWS = ['1d', '7d', '14d', '28d', '30d', '90d'] as const
export type InsightWindow = typeof INSIGHT_WINDOWS[number]