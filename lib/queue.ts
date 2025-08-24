import { Queue, Worker, Job } from 'bullmq'
import IORedis from 'ioredis'

// Create IORedis instance for BullMQ (separate from Upstash Redis)
const createRedisConnection = () => {
  // During build time or when BULLMQ_REDIS_URL is not set, return a dummy connection
  // This prevents connection attempts during static generation
  if (!process.env.BULLMQ_REDIS_URL || process.env.NODE_ENV === 'production' && !process.env.BULLMQ_REDIS_URL) {
    console.warn('BULLMQ_REDIS_URL not configured, queue operations will be disabled')
    // Return a dummy connection that won't attempt to connect
    return new IORedis({
      host: 'dummy',
      port: 6379,
      maxRetriesPerRequest: 0,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: () => null, // Disable retries
    })
  }
  
  // For production with Redis URL
  return new IORedis(process.env.BULLMQ_REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  })
}

// Only create connection if we're not in build phase
const redisConnection = typeof window === 'undefined' && process.env.BULLMQ_REDIS_URL 
  ? createRedisConnection()
  : null

// Queue configuration
const queueConfig = redisConnection ? {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep only 10 completed jobs
    removeOnFail: 20,     // Keep only 20 failed jobs for debugging
    attempts: 3,          // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,        // Start with 2 second delay
    },
  },
} : {} as any

// Sync job data interfaces
export interface SyncJobData {
  accountId: string
  userId: string
  provider: 'meta' | 'google'
  syncType: 'full' | 'incremental' | 'manual'
  priority?: number
  metadata?: Record<string, any>
}

export interface CampaignSyncJobData extends SyncJobData {
  campaignIds?: string[]
  lastSyncAt?: Date
}

// Create sync queues (only if Redis is configured)
export const campaignSyncQueue = redisConnection ? new Queue<CampaignSyncJobData>('campaign-sync', queueConfig) : null as any
export const adSyncQueue = redisConnection ? new Queue<SyncJobData>('ad-sync', queueConfig) : null as any
export const insightsSyncQueue = redisConnection ? new Queue<SyncJobData>('insights-sync', queueConfig) : null as any

// Job priorities
export const JOB_PRIORITY = {
  MANUAL: 1,      // Highest priority - user-initiated
  SCHEDULED: 5,   // Normal priority - automated hourly sync
  RETRY: 10,      // Lower priority - retry jobs
} as const

// Add job to campaign sync queue
export async function addCampaignSyncJob(
  data: CampaignSyncJobData,
  options?: {
    delay?: number
    priority?: number
    jobId?: string
  }
) {
  if (!campaignSyncQueue) {
    console.warn('Campaign sync queue not available (Redis not configured)')
    return null
  }
  
  try {
    const job = await campaignSyncQueue.add('sync-campaigns', data, {
      ...options,
      priority: options?.priority || JOB_PRIORITY.SCHEDULED,
      // Prevent duplicate jobs for the same account
      jobId: options?.jobId || `campaign-sync-${data.accountId}-${data.provider}-${Date.now()}`,
    })
    
    console.log(`Campaign sync job added for account ${data.accountId}:`, job.id)
    return job
  } catch (error) {
    console.error('Failed to add campaign sync job:', error)
    throw error
  }
}

// Add manual sync job (highest priority)
export async function addManualSyncJob(data: CampaignSyncJobData) {
  return addCampaignSyncJob(
    { ...data, syncType: 'manual' },
    { 
      priority: JOB_PRIORITY.MANUAL,
      jobId: `manual-sync-${data.accountId}-${data.provider}-${Date.now()}`
    }
  )
}

// Add scheduled sync job
export async function addScheduledSyncJob(data: CampaignSyncJobData) {
  return addCampaignSyncJob(
    { ...data, syncType: 'full' },
    { 
      priority: JOB_PRIORITY.SCHEDULED,
      jobId: `scheduled-sync-${data.accountId}-${data.provider}-${Math.floor(Date.now() / 3600000)}` // Hour-based ID
    }
  )
}

// Get queue stats
export async function getQueueStats(queueName: 'campaign-sync' | 'ad-sync' | 'insights-sync') {
  const queue = queueName === 'campaign-sync' ? campaignSyncQueue : 
                queueName === 'ad-sync' ? adSyncQueue : insightsSyncQueue
  
  if (!queue) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
    }
  }
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(),
    queue.getFailed(),
    queue.getDelayed(),
  ])

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
    total: waiting.length + active.length + completed.length + failed.length + delayed.length,
  }
}

// Check if account is currently syncing
export async function isAccountSyncing(accountId: string, provider: string): Promise<boolean> {
  if (!campaignSyncQueue) {
    return false
  }
  
  try {
    const activeJobs = await campaignSyncQueue.getActive()
    return activeJobs.some(job => 
      job.data.accountId === accountId && 
      job.data.provider === provider
    )
  } catch (error) {
    console.error('Error checking if account is syncing:', error)
    return false
  }
}

// Get sync status for account
export async function getAccountSyncStatus(accountId: string, provider: string) {
  if (!campaignSyncQueue) {
    return {
      isActive: false,
      isWaiting: false,
      hasRecentFailures: false,
      activeJob: null,
      queuePosition: null,
      recentFailures: [],
    }
  }
  
  try {
    const [active, waiting, failed] = await Promise.all([
      campaignSyncQueue.getActive(),
      campaignSyncQueue.getWaiting(),
      campaignSyncQueue.getFailed()
    ])

    const accountJobs = {
      active: active.filter(job => job.data.accountId === accountId && job.data.provider === provider),
      waiting: waiting.filter(job => job.data.accountId === accountId && job.data.provider === provider),
      failed: failed.filter(job => job.data.accountId === accountId && job.data.provider === provider).slice(0, 5), // Last 5 failed jobs
    }

    return {
      isActive: accountJobs.active.length > 0,
      isWaiting: accountJobs.waiting.length > 0,
      hasRecentFailures: accountJobs.failed.length > 0,
      activeJob: accountJobs.active[0] || null,
      queuePosition: accountJobs.waiting.length > 0 ? 
        waiting.findIndex(job => job.data.accountId === accountId && job.data.provider === provider) + 1 : 
        null,
      recentFailures: accountJobs.failed.map(job => ({
        id: job.id,
        error: job.failedReason,
        timestamp: job.timestamp,
        attempts: job.attemptsMade,
      })),
    }
  } catch (error) {
    console.error('Error getting account sync status:', error)
    return {
      isActive: false,
      isWaiting: false,
      hasRecentFailures: false,
      activeJob: null,
      queuePosition: null,
      recentFailures: [],
    }
  }
}

// Cleanup completed and failed jobs
export async function cleanupOldJobs() {
  const queues = [campaignSyncQueue, adSyncQueue, insightsSyncQueue].filter(Boolean)
  
  if (queues.length === 0) {
    console.log('No queues available for cleanup')
    return
  }
  
  try {
    for (const queue of queues) {
      await queue.clean(24 * 60 * 60 * 1000, 50, 'completed') // Clean completed jobs older than 24h, keep 50
      await queue.clean(7 * 24 * 60 * 60 * 1000, 100, 'failed') // Clean failed jobs older than 7 days, keep 100
    }
    
    console.log('Queue cleanup completed')
  } catch (error) {
    console.error('Error during queue cleanup:', error)
  }
}

// Graceful shutdown
export async function closeQueues() {
  try {
    const closeTasks = []
    
    if (campaignSyncQueue) closeTasks.push(campaignSyncQueue.close())
    if (adSyncQueue) closeTasks.push(adSyncQueue.close())
    if (insightsSyncQueue) closeTasks.push(insightsSyncQueue.close())
    if (redisConnection) closeTasks.push(redisConnection.disconnect())
    
    if (closeTasks.length > 0) {
      await Promise.all(closeTasks)
      console.log('All queues closed successfully')
    }
  } catch (error) {
    console.error('Error closing queues:', error)
  }
}

// Handle graceful shutdown
process.on('SIGTERM', closeQueues)
process.on('SIGINT', closeQueues)

const queueExports = {
  campaignSyncQueue,
  adSyncQueue,
  insightsSyncQueue,
  addCampaignSyncJob,
  addManualSyncJob,
  addScheduledSyncJob,
  getQueueStats,
  isAccountSyncing,
  getAccountSyncStatus,
  cleanupOldJobs,
  closeQueues,
}

export default queueExports