import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchHistoricalAdData, getAdMetricsForDateRange } from '@/lib/meta-historical-sync'
import { subDays, startOfDay, endOfDay } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: { adId: string } }
) {
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

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    // Get the ad
    const ad = await prisma.ad.findFirst({
      where: {
        id: params.adId,
        accountId: user.accountId
      }
    })

    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(endDate, days))

    // Check if we need to fetch fresh data
    let existingData = await getAdMetricsForDateRange(ad.id, startDate, endDate)
    
    // If we don't have enough data or force refresh, fetch from Meta API
    if (existingData.length < days - 1 || forceRefresh) {
      // Get the connection for access token
      const connection = await prisma.providerConnection.findFirst({
        where: {
          accountId: user.accountId,
          provider: 'meta',
          isActive: true
        }
      })

      if (connection?.accessToken) {
        try {
          await fetchHistoricalAdData(
            ad.id,
            ad.externalId,
            connection.accessToken,
            user.accountId,
            days
          )
          
          // Re-fetch from database
          existingData = await getAdMetricsForDateRange(ad.id, startDate, endDate)
        } catch (error) {
          console.error('Error fetching from Meta API:', error)
          // Continue with existing data
        }
      }
    }

    // Format data for the frontend charts
    const chartData = {
      dates: existingData.map(d => d.date),
      metrics: {
        impressions: existingData.map(d => d.impressions || 0),
        clicks: existingData.map(d => d.clicks || 0),
        spend: existingData.map(d => d.spend || 0),
        conversions: existingData.map(d => d.conversions || 0),
        ctr: existingData.map(d => d.ctr || 0),
        cpc: existingData.map(d => d.cpc || 0),
        cpm: existingData.map(d => d.cpm || 0),
        reach: existingData.map(d => d.reach || 0),
        frequency: existingData.map(d => d.frequency || 0),
        videoViews: existingData.map(d => d.videoViews || 0),
        engagement: existingData.map(d => d.engagement || 0)
      },
      summary: {
        totalImpressions: existingData.reduce((sum, d) => sum + (d.impressions || 0), 0),
        totalClicks: existingData.reduce((sum, d) => sum + (d.clicks || 0), 0),
        totalSpend: existingData.reduce((sum, d) => sum + (d.spend || 0), 0),
        totalConversions: existingData.reduce((sum, d) => sum + (d.conversions || 0), 0),
        avgCtr: existingData.reduce((sum, d) => sum + (d.ctr || 0), 0) / existingData.length,
        avgCpc: existingData.reduce((sum, d) => sum + (d.cpc || 0), 0) / existingData.length,
        avgCpm: existingData.reduce((sum, d) => sum + (d.cpm || 0), 0) / existingData.length
      },
      dataPoints: existingData.length,
      startDate,
      endDate
    }

    return NextResponse.json(chartData)
  } catch (error) {
    console.error('Error fetching historical data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical data' },
      { status: 500 }
    )
  }
}

// Trigger historical data sync
export async function POST(
  request: NextRequest,
  { params }: { params: { adId: string } }
) {
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

    const { days = 30 } = await request.json()

    // Get the ad
    const ad = await prisma.ad.findFirst({
      where: {
        id: params.adId,
        accountId: user.accountId
      }
    })

    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    // Get the connection
    const connection = await prisma.providerConnection.findFirst({
      where: {
        accountId: user.accountId,
        provider: 'meta',
        isActive: true
      }
    })

    if (!connection?.accessToken) {
      return NextResponse.json({ error: 'No active Meta connection' }, { status: 400 })
    }

    // Fetch historical data
    const metrics = await fetchHistoricalAdData(
      ad.id,
      ad.externalId,
      connection.accessToken,
      user.accountId,
      days
    )

    return NextResponse.json({
      success: true,
      daysImported: metrics.length,
      adId: ad.id
    })
  } catch (error) {
    console.error('Error syncing historical data:', error)
    return NextResponse.json(
      { error: 'Failed to sync historical data' },
      { status: 500 }
    )
  }
}