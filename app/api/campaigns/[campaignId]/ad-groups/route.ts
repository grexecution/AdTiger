import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    // Get ad groups for the campaign
    const adGroups = await prisma.adGroup.findMany({
      where: {
        campaignId: params.campaignId,
        accountId: user.accountId
      },
      include: {
        _count: {
          select: {
            ads: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform to include ads count
    const transformedAdGroups = adGroups.map(adGroup => ({
      ...adGroup,
      adsCount: adGroup._count.ads
    }))

    return NextResponse.json({
      adGroups: transformedAdGroups,
      total: transformedAdGroups.length
    })
  } catch (error) {
    console.error("Get ad groups error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}