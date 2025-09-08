#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import cronParser from 'cron-parser'

const prisma = new PrismaClient()

// Check Vercel cron configuration
const verelCrons = [
  {
    path: '/api/cron/sync-hourly',
    schedule: '0 12 * * *', // Daily at 12:00 UTC
    description: 'Daily sync at noon UTC'
  },
  {
    path: '/api/cron/daily-insights',
    schedule: '0 2 * * *', // Daily at 2:00 AM UTC
    description: 'Daily insights sync at 2 AM UTC'
  }
]

async function testCronScheduling() {
  console.log('🕐 Testing Cron Job Scheduling...\n')
  
  console.log('=== CONFIGURED CRON JOBS (vercel.json) ===\n')
  
  for (const cron of verelCrons) {
    console.log(`📍 ${cron.path}`)
    console.log(`   Schedule: ${cron.schedule}`)
    console.log(`   Description: ${cron.description}`)
    
    try {
      const interval = cronParser.parseExpression(cron.schedule)
      console.log(`   Next 3 runs:`)
      for (let i = 0; i < 3; i++) {
        const next = interval.next()
        console.log(`     - ${next.toDate().toLocaleString()}`)
      }
    } catch (e) {
      console.log(`   ⚠️  Invalid cron expression`)
    }
    console.log()
  }
  
  console.log('=== RECENT SYNC HISTORY ===\n')
  
  // Check recent sync history to see if crons are running
  const recentSyncs = await prisma.syncHistory.findMany({
    where: {
      metadata: {
        path: ['source'],
        equals: 'cron'
      }
    },
    orderBy: { startedAt: 'desc' },
    take: 5
  })
  
  if (recentSyncs.length === 0) {
    console.log('No cron-triggered syncs found in history')
    console.log('This could mean:')
    console.log('  1. Cron jobs haven\'t run yet')
    console.log('  2. Cron jobs are failing before creating sync history')
    console.log('  3. Metadata doesn\'t mark cron source properly')
  } else {
    console.log(`Found ${recentSyncs.length} cron-triggered syncs:`)
    recentSyncs.forEach(sync => {
      console.log(`  - ${sync.startedAt.toLocaleString()} - ${sync.provider} - ${sync.status}`)
    })
  }
  
  console.log('\n=== TESTING CRON ENDPOINTS ===\n')
  
  // Test if cron endpoints are accessible
  const endpoints = [
    '/api/cron/sync-hourly',
    '/api/cron/daily-insights'
  ]
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`)
    
    try {
      const response = await fetch(`http://localhost:3333${endpoint}`, {
        headers: {
          'Authorization': 'Bearer dev' // Development auth
        }
      })
      
      if (response.status === 401) {
        console.log(`  ⚠️  Endpoint requires proper CRON_SECRET`)
      } else if (response.ok) {
        const data = await response.json()
        console.log(`  ✅ Endpoint accessible:`, JSON.stringify(data).substring(0, 100))
      } else {
        console.log(`  ❌ Endpoint returned status ${response.status}`)
      }
    } catch (e: any) {
      console.log(`  ❌ Failed to reach endpoint: ${e.message}`)
    }
  }
  
  console.log('\n=== ENVIRONMENT CHECK ===\n')
  
  // Check if required environment variables are set
  const cronSecret = process.env.CRON_SECRET
  console.log(`CRON_SECRET: ${cronSecret ? '✅ Set' : '❌ Not set'}`)
  
  if (!cronSecret) {
    console.log('\n⚠️  CRON_SECRET not set in environment')
    console.log('Set it in .env.local for local development:')
    console.log('CRON_SECRET=your-secret-here')
    console.log('\nIn production (Vercel), this is automatically set')
  }
  
  console.log('\n=== RECOMMENDATIONS ===\n')
  
  console.log('For Production (Vercel):')
  console.log('  1. Cron jobs are automatically triggered by Vercel')
  console.log('  2. Check Vercel Functions logs for execution history')
  console.log('  3. CRON_SECRET is automatically set by Vercel')
  
  console.log('\nFor Local Testing:')
  console.log('  1. Manually trigger cron endpoints with Bearer token')
  console.log('  2. Example: curl -H "Authorization: Bearer dev" http://localhost:3333/api/cron/sync-hourly')
  console.log('  3. Or use the manual sync button in the UI')
}

testCronScheduling()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())