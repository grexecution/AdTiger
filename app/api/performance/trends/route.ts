import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PerformanceTrackingService } from "@/services/performance-tracking"

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")
    const period = searchParams.get("period") as '7d' | '30d' | '90d' | '365d'

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    // Get user's account
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true }
    })

    if (!user?.accountId) {
      return NextResponse.json({ error: "No account found" }, { status: 404 })
    }

    // Verify entity belongs to user's account
    let entityExists = false
    if (entityType === 'campaign') {
      const campaign = await prisma.campaign.findFirst({
        where: { id: entityId, accountId: user.accountId }
      })
      entityExists = !!campaign
    } else if (entityType === 'ad_group') {
      const adGroup = await prisma.adGroup.findFirst({
        where: { id: entityId, accountId: user.accountId }
      })
      entityExists = !!adGroup
    } else if (entityType === 'ad') {
      const ad = await prisma.ad.findFirst({
        where: { id: entityId, accountId: user.accountId }
      })
      entityExists = !!ad
    }

    if (!entityExists) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 })
    }

    // Get performance trend data
    const performanceService = new PerformanceTrackingService(prisma)
    const trendData = await performanceService.getPerformanceTrend(
      entityType,
      entityId,
      period || '30d'
    )

    // Get snapshots if available
    let snapshots: any[] = []
    if (entityType === 'campaign') {
      snapshots = await prisma.performanceSnapshot.findMany({
        where: {
          accountId: user.accountId || "no-match",
          entityType,
          entityId
        },
        orderBy: {
          periodStart: 'desc'
        },
        take: 3
      })
    }

    return NextResponse.json({
      ...trendData,
      snapshots
    })
  } catch (error) {
    console.error("Get performance trends error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}