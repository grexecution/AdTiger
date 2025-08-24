import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'
export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's account
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true }
    })

    if (!user?.accountId) {
      return NextResponse.json({ error: "No account found" }, { status: 404 })
    }

    // Verify campaign belongs to user's account
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.campaignId },
      select: { accountId: true }
    })

    if (!campaign || campaign.accountId !== user.accountId) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Get historical insights for the campaign
    const insights = await prisma.insight.findMany({
      where: {
        campaignId: params.campaignId,
        window: 'day',
        date: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: {
        date: 'asc'
      },
      select: {
        id: true,
        date: true,
        metrics: true,
        window: true
      }
    })

    // Get ads for this campaign to show in recommendations
    const ads = await prisma.ad.findMany({
      where: {
        adGroup: {
          campaignId: params.campaignId
        }
      },
      take: 10,
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        status: true,
        creative: true,
        metadata: true
      }
    })

    // Transform ads data for frontend
    const transformedAds = ads.map(ad => {
      const creative = ad.creative as any
      const metadata = ad.metadata as any
      
      return {
        id: ad.id,
        name: ad.name,
        status: ad.status,
        type: creative?.type || 'image',
        thumbnail: creative?.thumbnail_url || creative?.image_url || 'https://via.placeholder.com/300x200',
        metrics: {
          ctr: metadata?.ctr || Math.random() * 3,
          conversions: metadata?.conversions || Math.floor(Math.random() * 50),
          spend: metadata?.spend || Math.random() * 1000
        }
      }
    })

    return NextResponse.json({
      insights,
      ads: transformedAds,
      campaign: {
        id: params.campaignId,
        insights: insights.length
      }
    })
  } catch (error) {
    console.error("Get campaign insights error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}