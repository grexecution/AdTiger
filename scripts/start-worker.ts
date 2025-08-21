#!/usr/bin/env tsx

/**
 * AdTiger Sync Worker
 * 
 * This script starts the BullMQ worker that processes sync jobs.
 * It should be run as a separate process from the Next.js app.
 * 
 * Usage:
 *   npm run worker
 *   or
 *   npx tsx scripts/start-worker.ts
 */

import 'dotenv/config'
import '../services/sync/queue-worker'

console.log('🚀 AdTiger Sync Worker started')
console.log('📋 Queue: campaign-sync, ad-sync, insights-sync')
console.log('🔄 Concurrency: 3 jobs')
console.log('⏰ Retry: 3 attempts with exponential backoff')
console.log('🛑 Press Ctrl+C to stop')

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down worker...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Gracefully shutting down worker...')
  process.exit(0)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception in worker:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection in worker:', reason)
  process.exit(1)
})