import { Worker, Job } from 'bullmq'
import IORedis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { CampaignSyncJobData, SyncJobData } from '@/lib/queue'
import { MetaSyncService } from './meta-sync-service'
import { rateLimit } from '@/lib/redis'

const prisma = new PrismaClient()

// Create Redis connection for worker
const createWorkerRedisConnection = () => {
  if (!process.env.REDIS_URL || process.env.REDIS_URL.includes('localhost') || process.env.REDIS_URL.includes('127.0.0.1')) {
    return new IORedis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
    })
  }
  
  return new IORedis(process.env.BULLMQ_REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  })
}

const workerConnection = createWorkerRedisConnection()

// Rate limiting configuration
const RATE_LIMITS = {
  meta: {
    requestsPerHour: 200,    // Meta API rate limit
    requestsPerMinute: 10,   // Conservative per-minute limit
    concurrentJobs: 2,       // Max concurrent sync jobs per provider
  },
  google: {
    requestsPerHour: 100,    // Google Ads API rate limit
    requestsPerMinute: 5,    // Conservative per-minute limit
    concurrentJobs: 1,       // More conservative for Google
  },
}

// Track active jobs per provider to enforce concurrency limits
const activeJobs = new Map<string, number>()

// Enhanced error handling with categorization
class SyncError extends Error {
  constructor(
    message: string,
    public category: 'RATE_LIMIT' | 'API_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN',
    public retryable: boolean = true,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'SyncError'
  }
}

// Categorize errors for better handling
function categorizeError(error: any): SyncError {
  const message = error.message || 'Unknown error occurred'
  
  if (message.includes('rate limit') || message.includes('429')) {
    return new SyncError(message, 'RATE_LIMIT', true, error)
  }
  
  if (message.includes('401') || message.includes('403') || message.includes('invalid token')) {
    return new SyncError(message, 'API_ERROR', false, error) // Don't retry auth errors
  }
  
  if (message.includes('400') || message.includes('validation')) {
    return new SyncError(message, 'VALIDATION_ERROR', false, error)
  }
  
  if (message.includes('ECONNRESET') || message.includes('ETIMEDOUT') || message.includes('network')) {
    return new SyncError(message, 'NETWORK_ERROR', true, error)
  }
  
  return new SyncError(message, 'UNKNOWN', true, error)
}

// Process campaign sync job
async function processCampaignSync(job: Job<CampaignSyncJobData>) {
  const { accountId, userId, provider, syncType, campaignIds, metadata } = job.data
  
  console.log(`Processing ${syncType} sync for account ${accountId} (${provider})`)
  
  // Update job progress
  await job.updateProgress(10)
  
  let connection: any = null
  
  try {
    // Check rate limits
    const hourlyLimit = RATE_LIMITS[provider].requestsPerHour
    const minuteLimit = RATE_LIMITS[provider].requestsPerMinute
    
    const [hourlyCheck, minuteCheck] = await Promise.all([
      rateLimit(`sync:${provider}:${accountId}:hour`, hourlyLimit, 3600),
      rateLimit(`sync:${provider}:${accountId}:minute`, minuteLimit, 60),
    ])
    
    if (!hourlyCheck.success || !minuteCheck.success) {
      throw new SyncError(
        `Rate limit exceeded for ${provider}. Hourly: ${hourlyLimit - hourlyCheck.remaining}/${hourlyLimit}, Minute: ${minuteLimit - minuteCheck.remaining}/${minuteLimit}`,
        'RATE_LIMIT',
        true
      )
    }
    
    await job.updateProgress(20)
    
    // Check concurrency limits
    const currentActive = activeJobs.get(`${provider}:${accountId}`) || 0
    if (currentActive >= RATE_LIMITS[provider].concurrentJobs) {
      throw new SyncError(
        `Concurrency limit reached for ${provider}. Active jobs: ${currentActive}/${RATE_LIMITS[provider].concurrentJobs}`,
        'RATE_LIMIT',
        true
      )
    }
    
    // Increment active job counter
    activeJobs.set(`${provider}:${accountId}`, currentActive + 1)
    
    await job.updateProgress(30)
    
    // Get user's connection details
    connection = await prisma.connection.findFirst({
      where: {
        accountId,
        provider: provider.toLowerCase(),
        status: 'active',
      },
    })
    
    if (!connection) {
      throw new SyncError(
        `No active ${provider} connection found for account ${accountId}`,
        'VALIDATION_ERROR',
        false
      )
    }
    
    await job.updateProgress(40)
    
    // Initialize sync service based on provider
    let syncResult
    
    if (provider === 'meta') {
      const metaSync = new MetaSyncService(prisma)
      const accessToken = (connection.metadata as any)?.accessToken
      if (!accessToken) {
        throw new SyncError(
          `No access token found for ${provider} connection`,
          'API_ERROR',
          false
        )
      }
      syncResult = await metaSync.syncAccount(accountId, connection.id, accessToken, syncType.toUpperCase() as any)
      
      await job.updateProgress(80)
      
      // Update connection last sync time
      await prisma.connection.update({
        where: { id: connection.id },
        data: { 
          metadata: {
            ...(connection.metadata as any || {}),
            lastSyncAt: new Date().toISOString(),
            lastSyncResult: {
              success: true,
              timestamp: new Date().toISOString(),
              campaignsCount: (syncResult as any).campaigns || 0,
              adsCount: (syncResult as any).ads || 0,
            },
          },
        },
      })
    } else {
      // TODO: Implement Google Ads sync
      throw new SyncError(
        `Google Ads sync not yet implemented`,
        'VALIDATION_ERROR',
        false
      )
    }
    
    await job.updateProgress(90)
    
    // Sync history is already created by MetaSyncService, no need to duplicate
    
    await job.updateProgress(100)
    
    console.log(`✅ Sync completed for account ${accountId} (${provider}):`, {
      campaigns: (syncResult as any).campaigns || 0,
      adSets: (syncResult as any).adSets || 0,
      ads: (syncResult as any).ads || 0,
      insights: (syncResult as any).insights || 0,
    })
    
    return {
      success: true,
      campaigns: (syncResult as any).campaigns || 0,
      adSets: (syncResult as any).adSets || 0,
      ads: (syncResult as any).ads || 0,
      insights: (syncResult as any).insights || 0,
      syncType,
      timestamp: new Date(),
    }
    
  } catch (error) {
    const syncError = categorizeError(error)
    
    console.error(`❌ Sync failed for account ${accountId} (${provider}):`, {
      category: syncError.category,
      message: syncError.message,
      retryable: syncError.retryable,
      attempt: job.attemptsMade + 1,
    })
    
    // Sync history is already created by MetaSyncService, just log the error
    
    // Update connection with error info if it's an API error
    if (syncError.category === 'API_ERROR' && connection) {
      await prisma.connection.update({
        where: { id: connection.id },
        data: { 
          status: 'error',
          metadata: {
            ...(connection.metadata as any || {}),
            lastError: {
              message: syncError.message,
              timestamp: new Date().toISOString(),
              category: syncError.category,
            },
          },
        },
      })
    }
    
    throw syncError
  } finally {
    // Decrement active job counter
    const currentActive = activeJobs.get(`${provider}:${accountId}`) || 1
    if (currentActive <= 1) {
      activeJobs.delete(`${provider}:${accountId}`)
    } else {
      activeJobs.set(`${provider}:${accountId}`, currentActive - 1)
    }
  }
}

// Create and start workers
export const campaignSyncWorker = new Worker<CampaignSyncJobData>(
  'campaign-sync',
  processCampaignSync,
  {
    connection: workerConnection,
    concurrency: 3, // Process up to 3 jobs concurrently
    stalledInterval: 30 * 1000, // Check for stalled jobs every 30s
    maxStalledCount: 1, // Retry stalled jobs once
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 20 },
  }
)

// Worker event handlers
campaignSyncWorker.on('completed', (job: Job, result: any) => {
  console.log(`✅ Campaign sync job ${job.id} completed:`, result)
})

campaignSyncWorker.on('failed', (job: Job | undefined, error: Error) => {
  console.error(`❌ Campaign sync job ${job?.id} failed:`, error.message)
})

campaignSyncWorker.on('stalled', (jobId: string) => {
  console.warn(`⚠️ Campaign sync job ${jobId} stalled`)
})

campaignSyncWorker.on('error', (error: Error) => {
  console.error('Campaign sync worker error:', error)
})

// Graceful shutdown
async function gracefulShutdown() {
  console.log('Shutting down sync workers...')
  try {
    await campaignSyncWorker.close()
    await workerConnection.disconnect()
    await prisma.$disconnect()
    console.log('✅ Sync workers shut down successfully')
  } catch (error) {
    console.error('❌ Error during worker shutdown:', error)
  }
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

export default campaignSyncWorker