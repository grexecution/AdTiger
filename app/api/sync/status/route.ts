import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getQueueStats, getAccountSyncStatus } from '@/lib/queue'

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's account
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true },
    })

    if (!user?.accountId) {
      return NextResponse.json(
        { error: 'No account found' },
        { status: 400 }
      )
    }

    // Get sync status for all connected providers
    const connections = await prisma.providerConnection.findMany({
      where: {
        accountId: user.accountId || "no-match",
        isActive: true,
      },
      select: {
        id: true,
        provider: true,
        status: true,
        lastSyncAt: true,
        nextSyncAt: true,
        syncErrors: true,
      },
    })

    // Get sync status for each provider
    const providerStatuses = await Promise.all(
      connections.map(async (connection) => {
        const provider = connection.provider.toLowerCase() as 'meta' | 'google'
        const syncStatus = await getAccountSyncStatus(user.accountId || "no-match", provider)
        
        return {
          provider,
          connection: {
            status: connection.status,
            lastSyncAt: connection.lastSyncAt,
            nextSyncAt: connection.nextSyncAt,
            hasErrors: !!connection.syncErrors,
          },
          queue: syncStatus,
        }
      })
    )

    // Get recent sync history
    const recentSyncs = await prisma.syncHistory.findMany({
      where: {
        accountId: user.accountId || "no-match",
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        provider: true,
        syncType: true,
        status: true,
        startedAt: true,
        completedAt: true,
        duration: true,
        campaignsSync: true,
        adGroupsSync: true,
        adsSync: true,
        insightsSync: true,
        errorMessage: true,
        errorCategory: true,
        retryCount: true,
      },
    })

    // Get manual sync rate limiting info for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const manualSyncsToday = await prisma.syncHistory.count({
      where: {
        accountId: user.accountId || "no-match",
        syncType: 'MANUAL',
        startedAt: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    // Calculate next scheduled sync (hourly)
    const now = new Date()
    const nextScheduledSync = new Date()
    nextScheduledSync.setMinutes(0, 0, 0)
    nextScheduledSync.setHours(nextScheduledSync.getHours() + 1)

    // Calculate sync statistics
    const stats = {
      totalSyncs: recentSyncs.length,
      successfulSyncs: recentSyncs.filter(s => s.status === 'SUCCESS').length,
      failedSyncs: recentSyncs.filter(s => s.status === 'FAILED').length,
      avgDuration: recentSyncs
        .filter(s => s.duration && s.status === 'SUCCESS')
        .reduce((sum, s) => sum + (s.duration || 0), 0) / 
        Math.max(1, recentSyncs.filter(s => s.duration && s.status === 'SUCCESS').length),
      
      lastSuccessfulSync: recentSyncs.find(s => s.status === 'SUCCESS'),
      lastFailedSync: recentSyncs.find(s => s.status === 'FAILED'),
      
      // Manual sync rate limiting
      manualSyncsToday,
      maxManualSyncsPerDay: 3,
      canSyncManually: manualSyncsToday < 3,
      nextScheduledSync,
      
      errorCategories: recentSyncs
        .filter(s => s.errorCategory)
        .reduce((acc, s) => {
          acc[s.errorCategory!] = (acc[s.errorCategory!] || 0) + 1
          return acc
        }, {} as Record<string, number>),
    }

    // Get overall queue statistics
    const queueStats = await Promise.all([
      getQueueStats('campaign-sync'),
      getQueueStats('ad-sync'),
      getQueueStats('insights-sync'),
    ])

    // Simplified response for the sync status indicator
    const isRunning = providerStatuses.some(p => p.queue.isActive || p.queue.isWaiting)
    const currentProvider = providerStatuses.find(p => p.queue.isActive)?.provider
    
    // Get the last successful sync
    const lastSuccessfulSync = recentSyncs.find(s => s.status === 'SUCCESS')
    
    return NextResponse.json({
      isRunning,
      currentProvider,
      progress: isRunning ? 50 : undefined, // Simple progress estimate
      message: isRunning ? `Syncing ${currentProvider || 'data'}...` : undefined,
      lastSync: lastSuccessfulSync ? {
        provider: lastSuccessfulSync.provider.toLowerCase(),
        status: lastSuccessfulSync.status,
        completedAt: lastSuccessfulSync.completedAt,
        duration: lastSuccessfulSync.duration || 0,
        campaignsSync: lastSuccessfulSync.campaignsSync,
        adsSync: lastSuccessfulSync.adsSync,
        insightsSync: lastSuccessfulSync.insightsSync
      } : null,
      nextSync: {
        provider: 'meta',
        scheduledAt: stats.nextScheduledSync
      },
      queueStatus: queueStats[0], // Campaign sync queue
      recentErrors: stats.failedSyncs,
      // Additional data for detailed views
      fullStats: {
        accountId: user.accountId || "no-match",
        providers: providerStatuses,
        recentSyncs,
        stats: {
          ...stats,
          avgDurationMs: Math.round(stats.avgDuration),
          avgDurationFormatted: stats.avgDuration > 0 
            ? `${(stats.avgDuration / 1000).toFixed(1)}s`
            : 'N/A',
          successRate: stats.totalSyncs > 0 
            ? `${((stats.successfulSyncs / stats.totalSyncs) * 100).toFixed(1)}%`
            : '0%',
        },
        queues: {
          'campaign-sync': queueStats[0],
          'ad-sync': queueStats[1],
          'insights-sync': queueStats[2],
        },
        timestamp: new Date().toISOString(),
      }
    })

  } catch (error) {
    console.error('Get sync status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Cancel active sync job
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true },
    })

    if (!user?.accountId) {
      return NextResponse.json(
        { error: 'No account found' },
        { status: 400 }
      )
    }

    const url = new URL(request.url)
    const provider = url.searchParams.get('provider') as 'meta' | 'google'
    const jobId = url.searchParams.get('jobId')

    if (!provider || !['meta', 'google'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      )
    }

    // For now, we'll just mark any active sync as cancelled in the database
    // In a full implementation, you'd also cancel the actual queue job
    
    // Find active sync history records and mark them as cancelled
    const updatedSyncs = await prisma.syncHistory.updateMany({
      where: {
        accountId: user.accountId || "no-match",
        provider: provider.toUpperCase() as any,
        status: 'FAILED', // We can only cancel jobs that haven't completed
        completedAt: null,
      },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        errorMessage: 'Cancelled by user',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Sync cancellation requested',
      cancelledJobs: updatedSyncs.count,
    })

  } catch (error) {
    console.error('Cancel sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}