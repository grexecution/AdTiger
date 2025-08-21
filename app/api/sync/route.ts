import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SyncService } from "@/services/sync/sync-service"
import { z } from "zod"

const syncSchema = z.object({
  provider: z.enum(["meta", "google"]),
  type: z.enum(["full", "campaigns", "insights"]).optional(),
  adAccountId: z.string().optional()
})

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

    const body = await request.json()
    const { provider, type = "full", adAccountId } = syncSchema.parse(body)

    const syncService = new SyncService(prisma)

    let result
    if (type === "full") {
      result = await syncService.syncAccount(user.accountId, provider)
    } else if (type === "campaigns" && adAccountId) {
      result = await syncService.syncCampaigns(user.accountId, adAccountId, provider)
    } else if (type === "insights" && adAccountId) {
      // For insights, sync for the ad account
      result = await syncService.syncInsights(
        user.accountId,
        "ad_account",
        adAccountId,
        provider
      )
    } else {
      return NextResponse.json(
        { error: "Invalid sync parameters" },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Sync error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

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
    const jobId = searchParams.get("jobId")
    const provider = searchParams.get("provider")

    const syncService = new SyncService(prisma)

    if (jobId) {
      const status = await syncService.getSyncStatus(jobId)
      return NextResponse.json(status)
    }

    const lastSync = await syncService.getLastSync(
      user.accountId,
      provider || undefined
    )

    return NextResponse.json(lastSync)
  } catch (error) {
    console.error("Get sync status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}