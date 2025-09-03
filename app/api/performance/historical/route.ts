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
    const entityType = searchParams.get('entityType') || 'campaign'
    const entityId = searchParams.get('entityId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!entityId) {
      return NextResponse.json({ error: 'Entity ID required' }, { status: 400 })
    }

    const startDate = subDays(new Date(), days)

    // Fetch insights for the entity
    const insights = await prisma.insight.findMany({
      where: {
        accountId: user.accountId,
        entityType,
        entityId,
        date: { gte: startDate },
        window: '1d'
      },
      orderBy: { date: 'asc' }
    })

    // Transform insights into performance data
    const data = insights.map(insight => {
      const metrics = insight.metrics as any
      return {
        date: insight.date.toISOString().split('T')[0],
        impressions: metrics.impressions || 0,
        clicks: metrics.clicks || 0,
        spend: metrics.spend || 0,
        ctr: metrics.ctr || 0,
        cpc: metrics.cpc || 0,
        cpm: metrics.cpm || 0,
        conversions: metrics.conversions || 0,
        likes: metrics.likes || 0,
        comments: metrics.comments || 0,
        shares: metrics.shares || 0,
        videoViews: metrics.videoViews || 0
      }
    })

    // Fill in missing dates with zero values
    const filledData = []
    const currentDate = new Date(startDate)
    const endDate = new Date()
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const existingData = data.find(d => d.date === dateStr)
      
      if (existingData) {
        filledData.push(existingData)
      } else {
        // Add zero values for missing dates
        filledData.push({
          date: dateStr,
          impressions: 0,
          clicks: 0,
          spend: 0,
          ctr: 0,
          cpc: 0,
          cpm: 0,
          conversions: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          videoViews: 0
        })
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Calculate summary statistics
    const summary = {
      totalImpressions: data.reduce((sum, d) => sum + d.impressions, 0),
      totalClicks: data.reduce((sum, d) => sum + d.clicks, 0),
      totalSpend: data.reduce((sum, d) => sum + d.spend, 0),
      avgCtr: data.length > 0 ? data.reduce((sum, d) => sum + d.ctr, 0) / data.length : 0,
      avgCpc: data.length > 0 ? data.reduce((sum, d) => sum + d.cpc, 0) / data.length : 0,
      avgCpm: data.length > 0 ? data.reduce((sum, d) => sum + d.cpm, 0) / data.length : 0
    }

    return NextResponse.json({
      data: filledData,
      summary
    })
  } catch (error) {
    console.error('Error fetching historical performance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}