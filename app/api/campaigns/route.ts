import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get("provider")
    const status = searchParams.get("status")

    // Get Google connection to check enabled accounts
    let enabledGoogleAccounts: string[] = []
    if (!provider || provider === "all" || provider === "google") {
      const googleConnection = await prisma.providerConnection.findFirst({
        where: {
          accountId: user.accountId,
          provider: { in: ['google', 'GOOGLE'] }
        }
      })
      
      if (googleConnection) {
        const metadata = googleConnection.metadata as any
        enabledGoogleAccounts = metadata?.enabledAccounts || []
      }
    }

    // Build where clause
    const where: any = {
      accountId: user.accountId
    }

    if (provider && provider !== "all") {
      where.provider = provider
    }

    if (status && status !== "all") {
      where.status = status
    }

    // If we have Google enabled accounts, filter campaigns
    if (enabledGoogleAccounts.length > 0) {
      // Get campaigns that either:
      // 1. Are not from Google, OR
      // 2. Are from Google AND belong to enabled accounts
      where.OR = [
        { provider: { notIn: ['google', 'GOOGLE'] } },
        { 
          provider: { in: ['google', 'GOOGLE'] },
          adAccount: {
            externalId: { in: enabledGoogleAccounts }
          }
        }
      ]
    }

    // Fetch campaigns with their ad groups and latest insights
    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        adGroups: {
          include: {
            ads: {
              take: 10 // Limit ads per ad group
            }
          }
        },
        insights: {
          where: {
            window: "day"
          },
          orderBy: {
            date: "desc"
          },
          take: 1
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    })

    // Transform data to include metrics
    const campaignsWithMetrics = await Promise.all(
      campaigns.map(async (campaign) => {
        // Get aggregated metrics for the campaign
        const latestInsight = campaign.insights[0]
        
        // Mock metrics if no insights available
        const metrics = latestInsight?.metrics || {
          spend: Math.random() * 5000,
          impressions: Math.floor(Math.random() * 100000),
          clicks: Math.floor(Math.random() * 2000),
          conversions: Math.floor(Math.random() * 100),
          ctr: Math.random() * 2 + 0.5,
          cpc: Math.random() * 2 + 0.5,
          roas: Math.random() * 4 + 1
        }

        // Add metrics to ad groups and include ads
        const adGroupsWithMetrics = campaign.adGroups.map(adGroup => ({
          id: adGroup.id,
          name: adGroup.name,
          status: adGroup.status,
          budgetAmount: adGroup.budgetAmount || 0,
          metrics: {
            spend: Math.random() * 1000,
            clicks: Math.floor(Math.random() * 500),
            conversions: Math.floor(Math.random() * 50)
          },
          ads: adGroup.ads.map(ad => ({
            id: ad.id,
            name: ad.name,
            status: ad.status,
            type: ad.creative?.type || 'display',
            metadata: ad.metadata
          }))
        }))

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          provider: campaign.provider,
          objective: campaign.objective,
          budgetAmount: campaign.budgetAmount || 0,
          budgetCurrency: campaign.budgetCurrency || "USD",
          metrics: metrics as any,
          adGroups: adGroupsWithMetrics
        }
      })
    )

    return NextResponse.json({ campaigns: campaignsWithMetrics })
  } catch (error) {
    console.error("Get campaigns error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}