import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's account
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true, role: true }
    })

    if (!user?.accountId) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const provider = searchParams.get('provider')
    const syncType = searchParams.get('syncType')
    const status = searchParams.get('status')

    const startDate = subDays(new Date(), days)

    // Build where clause
    const where: any = {
      accountId: user.accountId,
      startedAt: { gte: startDate }
    }

    if (provider && provider !== 'all') {
      where.provider = provider
    }

    if (syncType && syncType !== 'all') {
      where.syncType = syncType
    }

    if (status && status !== 'all') {
      where.status = status
    }

    // Fetch sync history
    const history = await prisma.syncHistory.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 100
    })

    // Calculate stats
    const stats = {
      totalSyncs: history.length,
      successRate: history.length > 0 
        ? (history.filter(h => h.status === 'SUCCESS').length / history.length) * 100
        : 0,
      avgDuration: history.length > 0
        ? history.reduce((sum, h) => sum + (h.duration || 0), 0) / history.filter(h => h.duration).length * 1000
        : 0,
      totalInsights: history.reduce((sum, h) => sum + h.insightsSync, 0)
    }

    return NextResponse.json({
      history,
      stats
    })
  } catch (error) {
    console.error('Error fetching sync history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create manual sync entry
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true }
    })

    if (!user?.accountId) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }

    const body = await request.json()
    const { provider, syncType } = body

    // Create sync history entry
    const syncHistory = await prisma.syncHistory.create({
      data: {
        accountId: user.accountId,
        provider: provider.toUpperCase(),
        syncType: syncType?.toUpperCase() || 'MANUAL',
        status: 'SUCCESS',
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 0,
        campaignsSync: 0,
        adGroupsSync: 0,
        adsSync: 0,
        insightsSync: 0,
        metadata: {
          triggeredBy: session.user.email,
          manual: true
        }
      }
    })

    return NextResponse.json(syncHistory)
  } catch (error) {
    console.error('Error creating sync history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}