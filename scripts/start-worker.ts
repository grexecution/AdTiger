#!/usr/bin/env node

import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })

// Start the worker
import '../services/sync/queue-worker'

console.log('🚀 Sync worker started')
console.log('   Listening for sync jobs...')
console.log('   Press Ctrl+C to stop')

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down worker...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down worker...')
  process.exit(0)
})