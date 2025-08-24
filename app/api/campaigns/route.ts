import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's account and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true, role: true }
    })

    // Admin users can see all campaigns, regular users need an account
    const isAdmin = user?.role === "ADMIN"
    
    if (!isAdmin && !user?.accountId) {
      return NextResponse.json({ error: "No account found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get("provider")
    const status = searchParams.get("status")
    const accountIdParam = searchParams.get("accountId") // Allow admins to filter by account

    // Get Google connection to check enabled accounts
    let enabledGoogleAccounts: string[] = []
    const targetAccountId = isAdmin && accountIdParam ? accountIdParam : user?.accountId
    
    if (targetAccountId && (!provider || provider === "all" || provider === "google")) {
      const googleConnection = await prisma.providerConnection.findFirst({
        where: {
          accountId: targetAccountId,
          provider: { in: ['google', 'GOOGLE'] }
        }
      })
      
      if (googleConnection) {
        const metadata = googleConnection.metadata as any
        enabledGoogleAccounts = metadata?.enabledAccounts || []
      }
    }

    // Build where clause
    const where: any = isAdmin ? {} : { accountId: user.accountId }
    
    // If admin and accountId is specified, filter by that account
    if (isAdmin && accountIdParam) {
      where.accountId = accountIdParam
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
        const campaignMetadata = campaign.metadata as any
        
        // Use real metrics from metadata.insights or latestInsight, or defaults
        const metrics = campaignMetadata?.insights || latestInsight?.metrics || {
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          ctr: 0,
          cpc: 0,
          cpm: 0,
          roas: 0
        }

        // Add metrics to ad groups and include ads
        const adGroupsWithMetrics = campaign.adGroups.map(adGroup => {
          const adGroupMetadata = adGroup.metadata as any
          return {
            id: adGroup.id,
            name: adGroup.name,
            status: adGroup.status,
            budgetAmount: adGroup.budgetAmount || 0,
            metadata: adGroup.metadata,
            metrics: adGroupMetadata?.insights || {
              spend: 0,
              clicks: 0,
              conversions: 0
            },
            ads: adGroup.ads.map(ad => ({
              id: ad.id,
              name: ad.name,
              status: ad.status,
              type: (ad.creative as any)?.type || 'display',
              creative: ad.creative,
              metadata: ad.metadata
            }))
          }
        })

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          provider: campaign.provider,
          objective: campaign.objective,
          budgetAmount: campaign.budgetAmount || 0,
          budgetCurrency: campaign.budgetCurrency || "USD",
          metrics: metrics as any,
          metadata: campaign.metadata,
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