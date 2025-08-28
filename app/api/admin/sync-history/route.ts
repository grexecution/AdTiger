import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { account: true }
    })

    if (!user?.accountId) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const provider = searchParams.get('provider')
    const syncType = searchParams.get('syncType')
    const status = searchParams.get('status')

    const startDate = subDays(new Date(), days)

    // Build where clause
    const where: any = {
      accountId: user.accountId,
      startedAt: {
        gte: startDate
      }
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
      orderBy: {
        startedAt: 'desc'
      },
      take: 100 // Limit to last 100 entries
    })

    // Calculate stats
    const stats = {
      totalSyncs: history.length,
      successRate: history.length > 0 
        ? (history.filter(h => h.status === 'SUCCESS').length / history.length) * 100 
        : 0,
      avgDuration: history.length > 0
        ? history.reduce((sum, h) => sum + (h.duration || 0), 0) / history.length
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
      { error: 'Failed to fetch sync history' },
      { status: 500 }
    )
  }
}