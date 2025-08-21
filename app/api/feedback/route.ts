import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { FeedbackLabel } from "@prisma/client"

const feedbackSchema = z.object({
  recommendationId: z.string(),
  label: z.enum(["THUMBS_UP", "THUMBS_DOWN", "IGNORED"]),
  note: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { recommendationId, label, note } = feedbackSchema.parse(body)

    // Get the recommendation to verify account access
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
      select: { accountId: true }
    })

    if (!recommendation) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
    }

    // Create or update feedback
    const feedback = await prisma.feedback.upsert({
      where: {
        recommendationId_userId: {
          recommendationId,
          userId: session.user.id
        }
      },
      update: {
        label: label as FeedbackLabel,
        note,
        updatedAt: new Date()
      },
      create: {
        recommendationId,
        userId: session.user.id,
        accountId: recommendation.accountId,
        label: label as FeedbackLabel,
        note
      }
    })

    // Update recommendation status based on feedback
    if (label === "THUMBS_UP") {
      await prisma.recommendation.update({
        where: { id: recommendationId },
        data: { 
          status: "accepted",
          acceptedAt: new Date()
        }
      })
    } else if (label === "THUMBS_DOWN") {
      await prisma.recommendation.update({
        where: { id: recommendationId },
        data: { 
          status: "rejected",
          rejectedAt: new Date(),
          statusReason: note
        }
      })
    }

    // Update analytics
    await updatePlaybookAnalytics(recommendation.accountId, recommendationId, label as FeedbackLabel)

    return NextResponse.json(feedback)
  } catch (error) {
    console.error("Feedback error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function updatePlaybookAnalytics(
  accountId: string, 
  recommendationId: string,
  label: FeedbackLabel
) {
  const recommendation = await prisma.recommendation.findUnique({
    where: { id: recommendationId },
    select: { playbookKey: true }
  })

  if (!recommendation) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const analytics = await prisma.playbookAnalytics.upsert({
    where: {
      accountId_playbookKey_date: {
        accountId,
        playbookKey: recommendation.playbookKey,
        date: today
      }
    },
    update: {
      acceptedCount: label === "THUMBS_UP" ? { increment: 1 } : undefined,
      rejectedCount: label === "THUMBS_DOWN" ? { increment: 1 } : undefined,
      ignoredCount: label === "IGNORED" ? { increment: 1 } : undefined,
    },
    create: {
      accountId,
      playbookKey: recommendation.playbookKey,
      date: today,
      acceptedCount: label === "THUMBS_UP" ? 1 : 0,
      rejectedCount: label === "THUMBS_DOWN" ? 1 : 0,
      ignoredCount: label === "IGNORED" ? 1 : 0,
      proposalsCount: 1
    }
  })

  // Calculate accept rate
  const total = analytics.acceptedCount + analytics.rejectedCount + analytics.ignoredCount
  if (total > 0) {
    await prisma.playbookAnalytics.update({
      where: { id: analytics.id },
      data: {
        acceptRate: analytics.acceptedCount / total,
        rejectRate: analytics.rejectedCount / total
      }
    })
  }

  // Check if we need adaptive tuning suggestions
  await checkAdaptiveTuning(accountId, recommendation.playbookKey)
}

async function checkAdaptiveTuning(accountId: string, playbookKey: string) {
  // Get last 30 days of analytics
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const analytics = await prisma.playbookAnalytics.findMany({
    where: {
      accountId,
      playbookKey,
      date: { gte: thirtyDaysAgo }
    }
  })

  if (analytics.length === 0) return

  // Calculate overall accept rate
  const totals = analytics.reduce(
    (acc, curr) => ({
      accepted: acc.accepted + curr.acceptedCount,
      rejected: acc.rejected + curr.rejectedCount,
      total: acc.total + curr.acceptedCount + curr.rejectedCount + curr.ignoredCount
    }),
    { accepted: 0, rejected: 0, total: 0 }
  )

  const acceptRate = totals.total > 0 ? totals.accepted / totals.total : 0

  // If accept rate < 20%, create a tuning suggestion
  if (acceptRate < 0.2 && totals.total >= 10) {
    const existingSuggestion = await prisma.adaptiveTuningSuggestion.findFirst({
      where: {
        accountId,
        playbookKey,
        status: "pending"
      }
    })

    if (!existingSuggestion) {
      await prisma.adaptiveTuningSuggestion.create({
        data: {
          accountId,
          playbookKey,
          suggestionType: "threshold_adjustment",
          currentConfig: { acceptRate },
          suggestedConfig: { 
            action: "increase_thresholds",
            reason: "Low acceptance rate"
          },
          reason: `This playbook has an acceptance rate of ${(acceptRate * 100).toFixed(1)}% over the last 30 days. Consider adjusting thresholds to be less aggressive.`,
          metrics: totals,
          confidence: 0.8
        }
      })
    }
  }
}

// GET endpoint to fetch feedback for a recommendation
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const recommendationId = searchParams.get("recommendationId")

    if (!recommendationId) {
      return NextResponse.json({ error: "Recommendation ID required" }, { status: 400 })
    }

    const feedback = await prisma.feedback.findUnique({
      where: {
        recommendationId_userId: {
          recommendationId,
          userId: session.user.id
        }
      }
    })

    return NextResponse.json(feedback)
  } catch (error) {
    console.error("Get feedback error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}