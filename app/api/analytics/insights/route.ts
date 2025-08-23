import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { subDays, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'No account found' }, { status: 400 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const daysBack = parseInt(searchParams.get('days') || '30')
    const platform = searchParams.get('platform') || 'all'
    const campaignId = searchParams.get('campaignId') || 'all'
    const metric = searchParams.get('metric') || 'all'
    
    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(endDate, daysBack))

    // Build where clause
    const whereClause: any = {
      accountId: user.accountId || "no-match",
      date: {
        gte: startDate,
        lte: endDate
      },
      window: '1d' // Get daily data for charts
    }

    if (platform !== 'all') {
      whereClause.provider = platform
    }

    if (campaignId !== 'all') {
      whereClause.campaignId = campaignId
    }

    // Fetch insights from database
    const insights = await prisma.insight.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            provider: true
          }
        },
        ad: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Get campaigns for filter dropdown
    const campaigns = await prisma.campaign.findMany({
      where: {
        accountId: user.accountId || "no-match",
        ...(platform !== 'all' ? { provider: platform } : {})
      },
      select: {
        id: true,
        name: true,
        provider: true,
        status: true
      }
    })

    // Aggregate data by date for charts
    const dailyData = new Map()
    
    insights.forEach(insight => {
      const dateKey = insight.date.toISOString().split('T')[0]
      const metrics = insight.metrics as any
      
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          date: dateKey,
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          ctr: 0,
          cpc: 0,
          cpm: 0,
          roas: 0,
          count: 0
        })
      }
      
      const dayData = dailyData.get(dateKey)
      dayData.impressions += metrics.impressions || 0
      dayData.clicks += metrics.clicks || 0
      dayData.spend += metrics.spend || 0
      dayData.conversions += metrics.conversions || 0
      dayData.likes += metrics.likes || 0
      dayData.comments += metrics.comments || 0
      dayData.shares += metrics.shares || 0
      dayData.count++
      
      // Calculate averages for rate metrics
      if (dayData.impressions > 0) {
        dayData.ctr = (dayData.clicks / dayData.impressions) * 100
        dayData.cpm = (dayData.spend / dayData.impressions) * 1000
      }
      if (dayData.clicks > 0) {
        dayData.cpc = dayData.spend / dayData.clicks
      }
      if (dayData.spend > 0 && metrics.purchaseRoas) {
        dayData.roas = metrics.purchaseRoas
      }
    })

    // Convert to array and sort by date
    const performanceData = Array.from(dailyData.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Calculate platform breakdown
    const platformBreakdown = new Map()
    insights.forEach(insight => {
      const provider = insight.provider
      const metrics = insight.metrics as any
      
      if (!platformBreakdown.has(provider)) {
        platformBreakdown.set(provider, {
          name: provider === 'meta' ? 'Meta' : 'Google',
          value: 0,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0
        })
      }
      
      const platform = platformBreakdown.get(provider)
      platform.spend += metrics.spend || 0
      platform.impressions += metrics.impressions || 0
      platform.clicks += metrics.clicks || 0
      platform.conversions += metrics.conversions || 0
    })

    const platformData = Array.from(platformBreakdown.values()).map(p => ({
      ...p,
      value: p.spend, // For pie chart
      color: p.name === 'Meta' ? '#1877F2' : '#4285F4'
    }))

    // Calculate campaign performance
    const campaignPerformance = new Map()
    insights.forEach(insight => {
      if (!insight.campaign) return
      
      const campaignId = insight.campaign.id
      const metrics = insight.metrics as any
      
      if (!campaignPerformance.has(campaignId)) {
        campaignPerformance.set(campaignId, {
          id: campaignId,
          name: insight.campaign.name,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          roas: 0
        })
      }
      
      const campaign = campaignPerformance.get(campaignId)
      campaign.spend += metrics.spend || 0
      campaign.impressions += metrics.impressions || 0
      campaign.clicks += metrics.clicks || 0
      campaign.conversions += metrics.conversions || 0
      campaign.likes += metrics.likes || 0
      campaign.comments += metrics.comments || 0
      campaign.shares += metrics.shares || 0
      if (metrics.purchaseRoas) {
        campaign.roas = metrics.purchaseRoas
      }
    })

    const campaignPerformanceData = Array.from(campaignPerformance.values())
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10) // Top 10 campaigns

    // Calculate totals and changes
    const totals = performanceData.reduce((acc, day) => ({
      impressions: acc.impressions + day.impressions,
      clicks: acc.clicks + day.clicks,
      spend: acc.spend + day.spend,
      conversions: acc.conversions + day.conversions,
      likes: acc.likes + day.likes,
      comments: acc.comments + day.comments,
      shares: acc.shares + day.shares
    }), {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      likes: 0,
      comments: 0,
      shares: 0
    })

    // Calculate average rates
    const avgCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
    const avgCPC = totals.clicks > 0 ? totals.spend / totals.clicks : 0
    const avgCPM = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0
    const avgROAS = totals.spend > 0 ? (totals.conversions * 50) / totals.spend : 0 // Assuming $50 avg order value

    return NextResponse.json({
      performanceData,
      platformData,
      campaignPerformance: campaignPerformanceData,
      campaigns,
      totals: {
        ...totals,
        ctr: avgCTR,
        cpc: avgCPC,
        cpm: avgCPM,
        roas: avgROAS
      },
      dateRange: {
        from: startDate,
        to: endDate
      }
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}