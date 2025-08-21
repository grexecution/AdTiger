import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addScheduledSyncJob, getQueueStats, cleanupOldJobs } from '@/lib/queue'

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

    console.log('🕐 Starting hourly sync cron job...')

    // Get all active provider connections that need syncing
    const connections = await prisma.providerConnection.findMany({
      where: {
        isActive: true,
        status: 'CONNECTED',
        // Only sync if last sync was more than 50 minutes ago (with 10min buffer)
        OR: [
          { lastSyncAt: null },
          { lastSyncAt: { lt: new Date(Date.now() - 50 * 60 * 1000) } },
        ],
      },
      include: {
        account: {
          select: { id: true, name: true },
        },
      },
    })

    console.log(`Found ${connections.length} connections that need syncing`)

    const results = {
      total: connections.length,
      queued: 0,
      skipped: 0,
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

        // Add scheduled sync job
        await addScheduledSyncJob({
          accountId: connection.accountId,
          userId: user.id,
          provider: connection.provider.toLowerCase() as 'meta' | 'google',
          syncType: 'full',
          metadata: {
            cronTriggered: true,
            connectionId: connection.id,
            lastSyncAt: connection.lastSyncAt?.toISOString(),
          },
        })

        // Update connection's next sync time
        await prisma.providerConnection.update({
          where: { id: connection.id },
          data: { 
            nextSyncAt: new Date(Date.now() + 60 * 60 * 1000), // Next hour
          },
        })

        results.queued++
        console.log(`✅ Queued sync for ${connection.provider} account ${connection.accountId}`)

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

    // Cleanup old jobs (run every hour)
    try {
      await cleanupOldJobs()
      console.log('✅ Queue cleanup completed')
    } catch (error) {
      console.error('❌ Queue cleanup failed:', error)
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      results,
      queueStats: {
        'campaign-sync': queueStats[0],
        'ad-sync': queueStats[1],
        'insights-sync': queueStats[2],
      },
    }

    console.log('🎉 Hourly sync cron completed:', response)

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Hourly sync cron failed:', error)

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
          successRate: recentSyncs > 0 ? ((recentSyncs - failedSyncs) / recentSyncs * 100).toFixed(1) : '0',
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