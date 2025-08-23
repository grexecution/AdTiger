import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addManualSyncJob, isAccountSyncing, getAccountSyncStatus } from '@/lib/queue'
import { z } from 'zod'
import { ensureValidMetaToken } from '@/lib/utils/token-refresh'

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
        accountId: user.accountId,
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
        accountId: user.accountId,
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
    if (provider === 'meta') {
      try {
        await ensureValidMetaToken(connectionId)
      } catch (error) {
        console.error('Token validation/refresh failed:', error)
        // Don't fail here, let the sync worker handle it
      }
    }

    // Add manual sync job to queue
    const job = await addManualSyncJob({
      accountId: user.accountId,
      userId: session.user.id,
      provider,
      syncType: 'manual',
      campaignIds,
      metadata: {
        initiatedBy: session.user.email,
        timestamp: new Date().toISOString(),
      },
    })

    // Get updated sync status
    const syncStatus = await getAccountSyncStatus(user.accountId, provider)

    return NextResponse.json({
      success: true,
      message: `${provider} sync job queued successfully`,
      jobId: job.id,
      syncStatus,
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
        accountId: user.accountId,
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
        accountId: user.accountId,
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