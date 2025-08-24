import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'import { UserRole } from "@prisma/client"

export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    // Get table information using Prisma's introspection
    const tables = [
      { name: "User", count: await prisma.user.count() },
      { name: "Account", count: await prisma.account.count() },
      { name: "Session", count: await prisma.session.count() },
      { name: "Campaign", count: await prisma.campaign.count() },
      { name: "AdGroup", count: await prisma.adGroup.count() },
      { name: "Ad", count: await prisma.ad.count() },
      { name: "AdAccount", count: await prisma.adAccount.count() },
      { name: "Insight", count: await prisma.insight.count() },
      { name: "Recommendation", count: await prisma.recommendation.count() },
      { name: "ProviderConnection", count: await prisma.providerConnection.count() },
      { name: "SyncHistory", count: await prisma.syncHistory.count() },
      { name: "Feedback", count: await prisma.feedback.count() },
    ]

    return NextResponse.json({ tables })
  } catch (error) {
    console.error("Failed to fetch tables:", error)
    return NextResponse.json(
      { error: "Failed to fetch table information" },
      { status: 500 }
    )
  }
}