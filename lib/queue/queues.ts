import { Queue } from 'bullmq'
import { createRedisConnection } from './redis'

// Create queues for different job types
export const metaSyncQueue = new Queue('meta-sync', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 100,     // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
})

export const insightsQueue = new Queue('insights-sync', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 50,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  },
})

export const recommendationsQueue = new Queue('recommendations', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 50,
    },
    removeOnFail: {
      age: 3 * 24 * 3600,
    },
  },
})

// Job types
export interface MetaSyncJobData {
  accountId: string
  providerConnectionId: string
  syncType: 'full' | 'delta'
  entityTypes?: ('adAccounts' | 'campaigns' | 'adGroups' | 'ads')[]
}

export interface InsightsSyncJobData {
  accountId: string
  adAccountId: string
  provider: string
  level: 'account' | 'campaign' | 'adset' | 'ad'
  dateRange: {
    start: string
    end: string
  }
  syncType: 'full' | 'delta'
}

export interface RecommendationsJobData {
  accountId: string
  adAccountId?: string
  playbookIds?: string[]
}