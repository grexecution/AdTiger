import { Worker } from 'bullmq'
import { createRedisConnection } from '@/lib/queue/redis'
import { syncMetaEntities } from './sync-meta-entities'
import { syncMetaInsights } from './sync-meta-insights'
import { generateRecommendations } from './generate-recommendations'

// Meta Sync Worker
export const metaSyncWorker = new Worker(
  'meta-sync',
  syncMetaEntities,
  {
    connection: createRedisConnection(),
    concurrency: 2, // Process 2 jobs concurrently
    limiter: {
      max: 10,
      duration: 60000, // Max 10 jobs per minute (Meta API rate limits)
    },
  }
)

// Insights Sync Worker
export const insightsSyncWorker = new Worker(
  'insights-sync',
  syncMetaInsights,
  {
    connection: createRedisConnection(),
    concurrency: 3,
    limiter: {
      max: 20,
      duration: 60000, // Max 20 jobs per minute
    },
  }
)

// Recommendations Worker
export const recommendationsWorker = new Worker(
  'recommendations',
  generateRecommendations,
  {
    connection: createRedisConnection(),
    concurrency: 5,
  }
)

// Worker event handlers
metaSyncWorker.on('completed', (job) => {
  console.log(`✅ Meta sync job ${job.id} completed`)
})

metaSyncWorker.on('failed', (job, err) => {
  console.error(`❌ Meta sync job ${job?.id} failed:`, err)
})

insightsSyncWorker.on('completed', (job) => {
  console.log(`✅ Insights sync job ${job.id} completed`)
})

insightsSyncWorker.on('failed', (job, err) => {
  console.error(`❌ Insights sync job ${job?.id} failed:`, err)
})

recommendationsWorker.on('completed', (job) => {
  console.log(`✅ Recommendations job ${job.id} completed`)
})

recommendationsWorker.on('failed', (job, err) => {
  console.error(`❌ Recommendations job ${job?.id} failed:`, err)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing workers...')
  await metaSyncWorker.close()
  await insightsSyncWorker.close()
  await recommendationsWorker.close()
  process.exit(0)
})