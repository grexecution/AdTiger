#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function systemHealthCheck() {
  console.log('🏥 System Health Check\n')
  console.log('='.repeat(80))
  
  const results: Record<string, boolean> = {}
  
  // 1. Database connectivity
  console.log('\n📊 Database Check:')
  try {
    await prisma.$connect()
    console.log('  ✅ Database connected')
    results.database = true
  } catch (e) {
    console.log('  ❌ Database connection failed')
    results.database = false
  }
  
  // 2. Check data presence
  console.log('\n📈 Data Presence:')
  const counts = {
    accounts: await prisma.account.count(),
    users: await prisma.user.count(),
    connections: await prisma.connection.count(),
    campaigns: await prisma.campaign.count(),
    adGroups: await prisma.adGroup.count(),
    ads: await prisma.ad.count(),
    insights: await prisma.insight.count(),
    syncHistory: await prisma.syncHistory.count(),
    changeHistory: await prisma.changeHistory.count(),
    assetStorage: await prisma.assetStorage.count()
  }
  
  for (const [table, count] of Object.entries(counts)) {
    const icon = count > 0 ? '✅' : '⚠️'
    console.log(`  ${icon} ${table}: ${count}`)
    results[`data_${table}`] = count > 0
  }
  
  // 3. Check connections status
  console.log('\n🔌 Provider Connections:')
  const connections = await prisma.connection.findMany()
  
  if (connections.length === 0) {
    console.log('  ⚠️  No connections found')
    results.connections = false
  } else {
    for (const conn of connections) {
      const credentials = conn.credentials as any
      const hasToken = !!credentials?.accessToken
      const icon = conn.status === 'active' && hasToken ? '✅' : '⚠️'
      console.log(`  ${icon} ${conn.provider}: ${conn.status} (Token: ${hasToken ? 'Yes' : 'No'})`)
    }
    results.connections = connections.some(c => c.status === 'active')
  }
  
  // 4. Check sync history
  console.log('\n🔄 Recent Sync Activity:')
  const recentSyncs = await prisma.syncHistory.findMany({
    orderBy: { startedAt: 'desc' },
    take: 5
  })
  
  if (recentSyncs.length === 0) {
    console.log('  ⚠️  No sync history found')
    results.syncHistory = false
  } else {
    const successCount = recentSyncs.filter(s => s.status === 'SUCCESS').length
    const failCount = recentSyncs.filter(s => s.status === 'FAILED').length
    console.log(`  Last 5 syncs: ${successCount} successful, ${failCount} failed`)
    
    const lastSync = recentSyncs[0]
    const hoursSinceLastSync = (Date.now() - lastSync.startedAt.getTime()) / (1000 * 60 * 60)
    console.log(`  Last sync: ${hoursSinceLastSync.toFixed(1)} hours ago`)
    
    results.syncHistory = successCount > 0
    results.recentSync = hoursSinceLastSync < 24
  }
  
  // 5. Check change tracking
  console.log('\n📝 Change Tracking:')
  const recentChanges = await prisma.changeHistory.count({
    where: {
      detectedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    }
  })
  
  if (recentChanges > 0) {
    console.log(`  ✅ ${recentChanges} changes tracked in last 7 days`)
    results.changeTracking = true
  } else {
    console.log('  ⚠️  No changes tracked in last 7 days')
    results.changeTracking = false
  }
  
  // 6. Check asset storage
  console.log('\n🖼️  Asset Storage:')
  const assetCount = await prisma.assetStorage.count()
  const recentAssets = await prisma.assetStorage.count({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    }
  })
  
  console.log(`  Total assets: ${assetCount}`)
  console.log(`  Assets added in last 7 days: ${recentAssets}`)
  results.assetStorage = assetCount > 0
  
  // 7. Check placements
  console.log('\n📍 Placement Data:')
  const adGroupsWithPlacements = await prisma.adGroup.findMany({
    where: {
      metadata: {
        path: ['placementData'],
        not: null
      }
    },
    take: 5
  })
  
  if (adGroupsWithPlacements.length > 0) {
    console.log(`  ✅ ${adGroupsWithPlacements.length} ad groups have placement data`)
    results.placements = true
  } else {
    console.log('  ⚠️  No ad groups with placement data found')
    results.placements = false
  }
  
  // 8. Check thumbnails
  console.log('\n🎨 Thumbnail Coverage:')
  const adsWithCreative = await prisma.ad.count({
    where: {
      creative: {
        not: null
      }
    }
  })
  
  console.log(`  Ads with creative data: ${adsWithCreative}`)
  results.thumbnails = adsWithCreative > 0
  
  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('\n📊 OVERALL HEALTH SUMMARY:\n')
  
  const totalChecks = Object.keys(results).length
  const passedChecks = Object.values(results).filter(v => v).length
  const healthScore = (passedChecks / totalChecks) * 100
  
  console.log(`Health Score: ${healthScore.toFixed(0)}% (${passedChecks}/${totalChecks} checks passed)`)
  
  if (healthScore === 100) {
    console.log('\n🎉 System is fully operational!')
  } else if (healthScore >= 75) {
    console.log('\n✅ System is mostly healthy with minor issues')
  } else if (healthScore >= 50) {
    console.log('\n⚠️  System has several issues that need attention')
  } else {
    console.log('\n❌ System has critical issues')
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:\n')
  
  if (!results.connections) {
    console.log('• No active connections - reconnect Meta/Google accounts')
  }
  if (!results.recentSync) {
    console.log('• No recent syncs - run a manual sync or check cron jobs')
  }
  if (!results.changeTracking) {
    console.log('• No recent changes tracked - verify sync is updating data')
  }
  if (!results.placements) {
    console.log('• No placement data - run a sync to fetch placement information')
  }
  if (!results.assetStorage) {
    console.log('• No assets stored - run sync to download ad images')
  }
  
  if (healthScore === 100) {
    console.log('• All systems operational - no action needed')
  }
}

systemHealthCheck()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())