import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addManualSyncJob, isAccountSyncing, getAccountSyncStatus } from '@/lib/queue'
import { z } from 'zod'

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
    // First check the Connection table (for manual connections)
    let connectionId = null
    const manualConnection = await prisma.connection.findFirst({
      where: {
        accountId: user.accountId,
        provider: provider.toLowerCase(),
        status: 'active',
      },
    })

    if (manualConnection) {
      connectionId = manualConnection.id
    } else {
      // Fallback to ProviderConnection table
      const providerConnection = await prisma.providerConnection.findFirst({
        where: {
          accountId: user.accountId,
          provider: provider.toUpperCase(),
          status: 'CONNECTED',
          isActive: true,
        },
      })
      
      if (providerConnection) {
        connectionId = providerConnection.id
      }
    }

    if (!connectionId) {
      return NextResponse.json(
        { 
          error: 'Provider not connected',
          message: `No active ${provider} connection found. Please connect your account first.`
        },
        { status: 400 }
      )
    }

    // For provider connections, check if token is expired
    if (providerConnection && providerConnection.expiresAt && providerConnection.expiresAt < new Date()) {
      await prisma.providerConnection.update({
        where: { id: providerConnection.id },
        data: { status: 'EXPIRED' },
      })

      return NextResponse.json(
        { 
          error: 'Connection expired',
          message: `Your ${provider} connection has expired. Please reconnect your account.`
        },
        { status: 400 }
      )
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
    const connection = await prisma.providerConnection.findFirst({
      where: {
        accountId: user.accountId,
        provider: provider.toUpperCase(),
      },
      select: {
        status: true,
        lastSyncAt: true,
        nextSyncAt: true,
        syncErrors: true,
      },
    })

    return NextResponse.json({
      syncStatus,
      recentSyncs,
      connection,
      canSync: connection?.status === 'CONNECTED' && !syncStatus.isActive,
    })

  } catch (error) {
    console.error('Get sync status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}