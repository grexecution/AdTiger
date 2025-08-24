import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"

import { AIRecommendationService } from "@/services/ai-recommendations"

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

    const isAdmin = user?.role === "ADMIN"
    
    if (!isAdmin && !user?.accountId) {
      return NextResponse.json({ error: "No account found" }, { status: 404 })
    }

    const recommendationService = new AIRecommendationService(prisma)
    
    // Admin can see all recommendations, regular users only their account's
    const recommendations = isAdmin 
      ? await recommendationService.getAllRecommendations()
      : await recommendationService.getActiveRecommendations(user.accountId!)

    // Group recommendations by category
    const grouped = recommendations.reduce((acc, rec) => {
      if (!acc[rec.category]) {
        acc[rec.category] = []
      }
      acc[rec.category].push(rec)
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      recommendations,
      grouped,
      total: recommendations.length,
      categories: Object.keys(grouped),
      stats: {
        critical: recommendations.filter(r => r.priority === 'critical').length,
        high: recommendations.filter(r => r.priority === 'high').length,
        medium: recommendations.filter(r => r.priority === 'medium').length,
        low: recommendations.filter(r => r.priority === 'low').length,
      }
    })
  } catch (error) {
    console.error("Get recommendations error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Accept a recommendation
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { recommendationId, action } = body

    if (!recommendationId || !action) {
      return NextResponse.json(
        { error: "Missing recommendationId or action" },
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

    // Verify recommendation belongs to user's account
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId }
    })

    if (!recommendation || recommendation.accountId !== user.accountId) {
      return NextResponse.json(
        { error: "Recommendation not found" },
        { status: 404 }
      )
    }

    const recommendationService = new AIRecommendationService(prisma)

    switch (action) {
      case 'accept':
        await recommendationService.acceptRecommendation(recommendationId, session.user.id)
        break
      case 'reject':
      case 'dismiss':
        await recommendationService.rejectRecommendation(
          recommendationId,
          body.reason || 'Dismissed by user'
        )
        break
      case 'snooze':
        await recommendationService.snoozeRecommendation(
          recommendationId,
          body.days || 7
        )
        break
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      recommendationId
    })
  } catch (error) {
    console.error("Update recommendation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}