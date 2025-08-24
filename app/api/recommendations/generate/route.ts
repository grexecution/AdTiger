import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"

import { AIRecommendationService } from "@/services/ai-recommendations"

export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
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

    console.log(`🤖 Manually generating recommendations for account ${user.accountId}...`)

    const recommendationService = new AIRecommendationService(prisma)
    const recommendations = await recommendationService.generateRecommendations(user.accountId)

    console.log(`✅ Generated ${recommendations.length} new recommendations`)

    return NextResponse.json({
      success: true,
      count: recommendations.length,
      recommendations,
      message: `Generated ${recommendations.length} new recommendations`
    })
  } catch (error) {
    console.error("Generate recommendations error:", error)
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    )
  }
}