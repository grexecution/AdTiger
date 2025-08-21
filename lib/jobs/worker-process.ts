#!/usr/bin/env node

import { metaSyncWorker, insightsSyncWorker, recommendationsWorker } from './workers'
import { scheduler } from './scheduler'
import { createRedisConnection } from '@/lib/queue/redis'

// Environment check
const isProduction = process.env.NODE_ENV === 'production'

async function startWorkers() {
  console.log('🚀 Starting AdTiger ETL Workers...')
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
  
  try {
    // Test Redis connection
    const redis = createRedisConnection()
    await redis.ping()
    console.log('✅ Redis connection established')
    redis.disconnect()
    
    // Start workers
    console.log('📦 Starting queue workers...')
    
    // Workers are already instantiated and listening in workers.ts
    console.log('  ✅ Meta sync worker started')
    console.log('  ✅ Insights sync worker started')
    console.log('  ✅ Recommendations worker started')
    
    // Start scheduler
    console.log('⏰ Starting job scheduler...')
    await scheduler.start()
    
    console.log('\n✨ All workers and scheduler started successfully!')
    console.log('\n📊 Worker Configuration:')
    console.log('  - Meta Sync: 2 concurrent, max 10/min')
    console.log('  - Insights Sync: 3 concurrent, max 20/min')
    console.log('  - Recommendations: 5 concurrent')
    
    console.log('\n⏱️ Scheduled Jobs:')
    console.log('  - Entity Sync: Daily at 2:00 AM')
    console.log('  - Full Insights: Daily at 3:00 AM (30 days)')
    console.log('  - Delta Insights: Every 30 minutes (last 24h)')
    console.log('  - Recommendations: Daily at 4:05 AM')
    
    if (!isProduction) {
      console.log('\n🧪 Development Commands:')
      console.log('  - Trigger entity sync: await scheduler.triggerEntitySync()')
      console.log('  - Trigger full insights: await scheduler.triggerFullSync()')
      console.log('  - Trigger delta insights: await scheduler.triggerDeltaSync()')
      console.log('  - Trigger recommendations: await scheduler.triggerRecommendations()')
    }
    
  } catch (error) {
    console.error('❌ Failed to start workers:', error)
    process.exit(1)
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`)
  
  try {
    // Stop scheduler first
    await scheduler.stop()
    
    // Workers handle their own shutdown via SIGTERM
    console.log('✅ Shutdown complete')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error)
  gracefulShutdown('UNCAUGHT_EXCEPTION')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason)
  gracefulShutdown('UNHANDLED_REJECTION')
})

// Start the workers
startWorkers().catch((error) => {
  console.error('❌ Failed to start worker process:', error)
  process.exit(1)
})