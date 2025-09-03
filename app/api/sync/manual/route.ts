import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addManualSyncJob, isAccountSyncing, getAccountSyncStatus } from '@/lib/queue'
import { z } from 'zod'
import { ensureValidMetaToken } from '@/lib/utils/token-refresh'
import { MetaSyncService } from '@/services/sync/meta-sync-service'

export const dynamic = 'force-dynamic'
// Validation schema
const manualSyncSchema = z.object({
  provider: z.enum(['meta', 'google']),
  campaignIds: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { provider, campaignIds } = manualSyncSchema.parse(body)

    // Check manual sync rate limiting (max 3 per day)
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

    const maxManualSyncsPerDay = 3
    if (manualSyncsToday >= maxManualSyncsPerDay) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `You have reached the daily limit of ${maxManualSyncsPerDay} manual syncs. Please wait until tomorrow or wait for the next automatic sync.`,
          manualSyncsToday,
          maxManualSyncsPerDay,
          nextReset: tomorrow.toISOString()
        },
        { status: 429 }
      )
    }

    // Check if account is already syncing
    const alreadySyncing = await isAccountSyncing(user.accountId, provider)
    if (alreadySyncing) {
      return NextResponse.json(
        { 
          error: 'Sync already in progress',
          message: `${provider} sync is already running for this account`
        },
        { status: 409 }
      )
    }

    // Verify provider connection exists and is active
    const connection = await prisma.connection.findFirst({
      where: {
        accountId: user.accountId || "no-match",
        provider: provider.toLowerCase(),
        status: 'active',
      },
    })

    if (!connection) {
      return NextResponse.json(
        { 
          error: 'Provider not connected',
          message: `No active ${provider} connection found. Please connect your account first.`
        },
        { status: 400 }
      )
    }

    const connectionId = connection.id
    
    // Ensure token is valid and refresh if needed for Meta
    let accessToken: string | undefined
    if (provider === 'meta') {
      try {
        accessToken = await ensureValidMetaToken(connectionId)
      } catch (error) {
        console.error('Token validation/refresh failed:', error)
        return NextResponse.json(
          { 
            error: 'Token validation failed',
            message: 'Failed to validate or refresh access token. Please reconnect your account.'
          },
          { status: 401 }
        )
      }
    }

    // Instead of queuing, directly run the sync since we're not running workers
    // This is a temporary solution until queue workers are set up
    if (provider === 'meta' && accessToken) {
      const syncService = new MetaSyncService(prisma)
      
      try {
        // Run sync directly with proper history tracking
        const result = await syncService.syncAccount(
          user.accountId || "no-match",
          connectionId,
          accessToken,
          'MANUAL'
        )
        
        return NextResponse.json({
          success: result.success,
          message: result.success 
            ? `Successfully synced ${result.campaigns} campaigns, ${result.ads} ads, and ${result.insights} insights`
            : 'Sync completed with errors',
          stats: {
            campaigns: result.campaigns,
            adSets: result.adSets,
            ads: result.ads,
            insights: result.insights,
            errors: result.errors.length,
            errorDetails: result.errors
          }
        })
      } catch (error) {
        console.error('Direct sync failed:', error)
        return NextResponse.json(
          { 
            error: 'Sync failed',
            message: error instanceof Error ? error.message : 'Unknown error occurred during sync'
          },
          { status: 500 }
        )
      }
    }

    // Fallback to queue for other providers (not implemented yet)
    const job = await addManualSyncJob({
      accountId: user.accountId || "no-match",
      userId: session.user.id,
      provider,
      syncType: 'manual',
      campaignIds,
      metadata: {
        initiatedBy: session.user.email,
        timestamp: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      message: `${provider} sync job queued successfully`,
      jobId: job.id,
    })

  } catch (error) {
    console.error('Manual sync error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get manual sync status
export async function GET(request: NextRequest) {
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

    if (!provider || !['meta', 'google'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      )
    }

    // Get sync status for the account
    const syncStatus = await getAccountSyncStatus(user.accountId, provider)

    // Get recent sync history
    const recentSyncs = await prisma.syncHistory.findMany({
      where: {
        accountId: user.accountId || "no-match",
        provider: provider.toUpperCase() as any,
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        syncType: true,
        status: true,
        startedAt: true,
        completedAt: true,
        duration: true,
        campaignsSync: true,
        adGroupsSync: true,
        adsSync: true,
        errorMessage: true,
        errorCategory: true,
      },
    })

    // Get provider connection status
    const connection = await prisma.connection.findFirst({
      where: {
        accountId: user.accountId || "no-match",
        provider: provider.toLowerCase(),
      },
      select: {
        status: true,
        metadata: true,
      },
    })

    const connectionStatus = connection ? {
      status: connection.status?.toUpperCase(),
      lastSyncAt: (connection.metadata as any)?.lastSyncAt,
      nextSyncAt: null,
      syncErrors: null,
    } : null

    return NextResponse.json({
      syncStatus,
      recentSyncs,
      connection: connectionStatus,
      canSync: connection?.status === 'active' && !syncStatus.isActive,
    })

  } catch (error) {
    console.error('Get sync status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}