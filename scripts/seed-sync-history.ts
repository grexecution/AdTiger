import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedSyncHistory() {
  console.log('🌱 Seeding sync history...')

  // Get the test account
  const account = await prisma.account.findFirst({
    where: { name: 'Acme Marketing Agency' }
  })

  if (!account) {
    throw new Error('Test account not found. Run the main seed first.')
  }

  // Clear existing sync history
  await prisma.syncHistory.deleteMany({
    where: { accountId: account.id }
  })

  console.log('🗑️  Cleared existing sync history')

  // Create mock sync history for the last week
  const now = new Date()
  const syncHistory = []

  // Create some successful scheduled syncs
  for (let i = 0; i < 10; i++) {
    const startedAt = new Date(now.getTime() - (i * 2 * 60 * 60 * 1000)) // Every 2 hours back
    const completedAt = new Date(startedAt.getTime() + (15000 + Math.random() * 30000)) // 15-45 seconds duration
    const duration = completedAt.getTime() - startedAt.getTime()

    syncHistory.push({
      accountId: account.id,
      provider: 'META' as any,
      syncType: 'FULL' as any,
      status: 'SUCCESS' as any,
      startedAt,
      completedAt,
      duration,
      campaignsSync: Math.floor(Math.random() * 5) + 3,
      adGroupsSync: Math.floor(Math.random() * 15) + 8,
      adsSync: Math.floor(Math.random() * 30) + 15,
      insightsSync: Math.floor(Math.random() * 50) + 25,
      metadata: {
        triggeredBy: 'system',
        batchSize: 100
      }
    })
  }

  // Add a few manual syncs (including one today to test rate limiting)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Manual sync from 2 hours ago (successful)
  const manualSync1Start = new Date(now.getTime() - (2 * 60 * 60 * 1000))
  const manualSync1End = new Date(manualSync1Start.getTime() + 25000)
  syncHistory.push({
    accountId: account.id,
    provider: 'META' as any,
    syncType: 'MANUAL' as any,
    status: 'SUCCESS' as any,
    startedAt: manualSync1Start,
    completedAt: manualSync1End,
    duration: manualSync1End.getTime() - manualSync1Start.getTime(),
    campaignsSync: 4,
    adGroupsSync: 12,
    adsSync: 25,
    insightsSync: 45,
    metadata: {
      triggeredBy: 'user',
      userId: 'test-user'
    }
  })

  // Manual sync from 4 hours ago (failed due to rate limiting)
  const manualSync2Start = new Date(now.getTime() - (4 * 60 * 60 * 1000))
  syncHistory.push({
    accountId: account.id,
    provider: 'META' as any,
    syncType: 'MANUAL' as any,
    status: 'FAILED' as any,
    startedAt: manualSync2Start,
    completedAt: new Date(manualSync2Start.getTime() + 5000),
    duration: 5000,
    campaignsSync: 0,
    adGroupsSync: 0,
    adsSync: 0,
    insightsSync: 0,
    errorMessage: 'Rate limit exceeded',
    errorCategory: 'RATE_LIMIT' as any,
    retryCount: 0,
    metadata: {
      triggeredBy: 'user',
      userId: 'test-user'
    }
  })

  // Bulk insert sync history
  await prisma.syncHistory.createMany({
    data: syncHistory
  })

  console.log(`✅ Created ${syncHistory.length} sync history records`)

  // Update provider connection to show it's active
  await prisma.providerConnection.upsert({
    where: {
      accountId_provider_externalAccountId: {
        accountId: account.id,
        provider: 'META',
        externalAccountId: 'test_meta_account'
      }
    },
    update: {
      isActive: true,
      status: 'CONNECTED',
      lastSyncAt: syncHistory[0].completedAt,
      nextSyncAt: new Date(now.getTime() + (60 * 60 * 1000)) // Next hour
    },
    create: {
      accountId: account.id,
      provider: 'META',
      externalAccountId: 'test_meta_account',
      isActive: true,
      status: 'CONNECTED',
      lastSyncAt: syncHistory[0].completedAt,
      nextSyncAt: new Date(now.getTime() + (60 * 60 * 1000)),
      metadata: {
        note: 'Test Meta connection for sync status demo'
      }
    }
  })

  console.log('✅ Updated provider connection status')
  console.log('🎉 Sync history seeded successfully!')
  console.log(`📊 Created sync history with ${syncHistory.filter(s => s.syncType === 'manual').length} manual syncs today`)
}

async function main() {
  try {
    await seedSyncHistory()
  } catch (error) {
    console.error('❌ Sync history seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()