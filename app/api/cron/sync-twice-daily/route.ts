import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addScheduledSyncJob, getQueueStats, cleanupOldJobs } from '@/lib/queue'
import { SyncHealthService } from '@/lib/services/sync-health-service'
import { SyncNotificationService } from '@/lib/services/sync-notification-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      console.error('Unauthorized cron request:', authHeader)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🕐 Starting twice-daily sync cron job...')

    const syncHealthService = new SyncHealthService(prisma)
    const notificationService = new SyncNotificationService(prisma)

    // Get all active provider connections that need syncing
    const connections = await prisma.connection.findMany({
      where: {
        status: 'active',
      },
      include: {
        account: {
          select: { id: true, name: true },
        },
      },
    })

    console.log(`Found ${connections.length} connections to sync`)

    const results = {
      total: connections.length,
      queued: 0,
      skipped: 0,
      healthChecks: [] as any[],
      errors: [] as string[],
    }

    // Process each connection
    for (const connection of connections) {
      try {
        // Get the first user for this account to use as userId
        const user = await prisma.user.findFirst({
          where: { accountId: connection.accountId },
          select: { id: true },
        })

        if (!user) {
          console.warn(`No user found for account ${connection.accountId}`)
          results.skipped++
          continue
        }

        // Perform health check before sync
        const healthReport = await syncHealthService.performHealthCheck(
          connection.accountId,
          connection.provider
        )

        results.healthChecks.push({
          accountId: connection.accountId,
          provider: connection.provider,
          healthStatus: healthReport.status,
          issuesCount: healthReport.accessIssues.length,
          discrepanciesCount: healthReport.dataDiscrepancies.length,
        })

        // If there are critical access issues, notify and skip sync
        if (healthReport.accessIssues.length > 0) {
          await notificationService.notifyAccessIssues(
            connection.accountId,
            connection.provider,
            healthReport.accessIssues
          )
          
          // Still attempt sync even with issues - the sync might auto-fix some problems
        }

        // Add scheduled sync job
        await addScheduledSyncJob({
          accountId: connection.accountId,
          userId: user.id,
          provider: connection.provider.toLowerCase() as 'meta' | 'google',
          syncType: 'full',
          metadata: {
            cronTriggered: true,
            twiceDailySync: true,
            connectionId: connection.id,
            healthStatus: healthReport.status,
          },
        })

        // Update connection's metadata with last sync time and health info
        await prisma.connection.update({
          where: { id: connection.id },
          data: { 
            metadata: {
              ...((connection.metadata as any) || {}),
              lastSyncAt: new Date().toISOString(),
              nextSyncAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
              lastHealthCheck: {
                timestamp: new Date().toISOString(),
                status: healthReport.status,
                accessIssues: healthReport.accessIssues.length,
                dataDiscrepancies: healthReport.dataDiscrepancies.length,
              },
            },
          },
        })

        results.queued++
        console.log(`✅ Queued sync for ${connection.provider} account ${connection.accountId} (Health: ${healthReport.status})`)

      } catch (error) {
        const errorMsg = `Failed to queue sync for ${connection.provider} account ${connection.accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(errorMsg)
        results.errors.push(errorMsg)
      }
    }

    // Get queue statistics
    const queueStats = await Promise.all([
      getQueueStats('campaign-sync'),
      getQueueStats('ad-sync'),
      getQueueStats('insights-sync'),
    ])

    // Cleanup old jobs
    try {
      await cleanupOldJobs()
      console.log('✅ Queue cleanup completed')
    } catch (error) {
      console.error('❌ Queue cleanup failed:', error)
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      syncType: 'twice_daily',
      results,
      queueStats: {
        'campaign-sync': queueStats[0],
        'ad-sync': queueStats[1],
        'insights-sync': queueStats[2],
      },
    }

    console.log('🎉 Twice-daily sync cron completed:', response)

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Twice-daily sync cron failed:', error)

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Health check for cron monitoring
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get quick stats for monitoring
    const [
      totalConnections,
      activeConnections,
      recentSyncs,
      failedSyncs,
      healthySyncs,
      queueStats,
    ] = await Promise.all([
      prisma.providerConnection.count(),
      prisma.providerConnection.count({
        where: { isActive: true, status: 'CONNECTED' },
      }),
      prisma.syncHistory.count({
        where: {
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.syncHistory.count({
        where: {
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          status: 'FAILED',
        },
      }),
      prisma.syncHistory.count({
        where: {
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          healthStatus: 'HEALTHY',
        },
      }),
      getQueueStats('campaign-sync'),
    ])

    return NextResponse.json({
      healthy: true,
      timestamp: new Date().toISOString(),
      stats: {
        connections: {
          total: totalConnections,
          active: activeConnections,
        },
        syncs24h: {
          total: recentSyncs,
          failed: failedSyncs,
          healthy: healthySyncs,
          successRate: recentSyncs > 0 ? ((recentSyncs - failedSyncs) / recentSyncs * 100).toFixed(1) : '0',
          healthRate: recentSyncs > 0 ? (healthySyncs / recentSyncs * 100).toFixed(1) : '0',
        },
        queue: queueStats,
      },
    })

  } catch (error) {
    console.error('Cron health check failed:', error)
    return NextResponse.json(
      { 
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}


