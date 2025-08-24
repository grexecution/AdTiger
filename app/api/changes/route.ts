import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"

import { ChangeTrackingService } from "@/services/change-tracking"

export const dynamic = 'force-dynamic'
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
    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")
    const limit = parseInt(searchParams.get("limit") || "50")

    const changeTracker = new ChangeTrackingService(prisma)

    // If specific entity requested
    if (entityType && entityId) {
      const changes = await changeTracker.getEntityChanges(
        user.accountId,
        entityType,
        entityId,
        limit
      )

      return NextResponse.json({ changes })
    }

    // Otherwise get recent changes for the account
    const changes = await changeTracker.getRecentChanges(user.accountId, limit)

    // Format changes for frontend
    const formattedChanges = changes.map(change => ({
      id: change.id,
      entityType: change.entityType,
      entityId: change.entityId,
      entityName: 'Entity ' + change.entityId,
      changeType: change.changeType,
      fieldName: change.fieldName,
      oldValue: change.oldValue,
      newValue: change.newValue,
      provider: change.provider,
      detectedAt: change.detectedAt,
    }))

    return NextResponse.json({ changes: formattedChanges })
  } catch (error) {
    console.error("Get changes error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}