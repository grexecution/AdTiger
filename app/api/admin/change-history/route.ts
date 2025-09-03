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
      select: { accountId: true }
    })

    if (!user?.accountId) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const provider = searchParams.get('provider')
    const entityType = searchParams.get('entityType')
    const changeType = searchParams.get('changeType')

    const startDate = subDays(new Date(), days)

    // Build where clause
    const where: any = {
      accountId: user.accountId,
      detectedAt: { gte: startDate }
    }

    if (provider && provider !== 'all') {
      where.provider = provider.toLowerCase()
    }

    if (entityType && entityType !== 'all') {
      where.entityType = entityType
    }

    if (changeType && changeType !== 'all') {
      where.changeType = changeType
    }

    // Fetch change history
    const changes = await prisma.changeHistory.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
      take: 100,
      include: {
        campaign: {
          select: {
            name: true
          }
        },
        adGroup: {
          select: {
            name: true
          }
        },
        ad: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      changes
    })
  } catch (error) {
    console.error('Error fetching change history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}