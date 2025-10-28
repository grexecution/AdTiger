import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ChangeTrackingService } from '@/services/change-tracking'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true },
    })

    if (!user?.accountId) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const adId = searchParams.get('adId')
    const campaignId = searchParams.get('campaignId')
    const daysAround = parseInt(searchParams.get('daysAround') || '7')

    if (!adId && !campaignId) {
      return NextResponse.json(
        { error: 'Either adId or campaignId is required' },
        { status: 400 }
      )
    }

    const changeTracker = new ChangeTrackingService(prisma)

    // Get changes with performance data
    let changes
    if (adId) {
      changes = await changeTracker.getChangesWithPerformance(
        user.accountId,
        'ad',
        adId,
        daysAround
      )
    } else if (campaignId) {
      changes = await changeTracker.getChangesWithPerformance(
        user.accountId,
        'campaign',
        campaignId,
        daysAround
      )
    }

    return NextResponse.json({
      changes: changes || [],
      daysAround,
    })

  } catch (error) {
    console.error('Error fetching timeline:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


