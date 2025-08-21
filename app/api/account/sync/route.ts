import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AccountSyncService } from "@/services/sync/account-sync"

export async function POST() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  try {
    // Get user's account
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true }
    })

    if (!user?.accountId) {
      return NextResponse.json(
        { error: "No account found" },
        { status: 404 }
      )
    }

    // Initialize sync service
    const syncService = new AccountSyncService(prisma)
    
    // Sync all provider accounts
    const results = await syncService.syncAllProviderAccounts(user.accountId)
    
    // Get updated stats
    const stats = await syncService.getAccountStats(user.accountId)
    
    return NextResponse.json({
      success: true,
      message: "Account data synced successfully",
      results,
      stats
    })
  } catch (error) {
    console.error("Error syncing account:", error)
    return NextResponse.json(
      { error: "Failed to sync account data" },
      { status: 500 }
    )
  }
}