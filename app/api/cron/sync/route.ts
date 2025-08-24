import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // For local development, also allow no auth
    if (process.env.NODE_ENV === "production") {
      return new Response("Unauthorized", { status: 401 })
    }
  }

  try {
    console.log("Starting hourly sync cron job")

    // Get all active connections
    const activeConnections = await prisma.connection.findMany({
      where: {
        status: "active",
        provider: "meta"
      }
    })

    console.log(`Found ${activeConnections.length} active connections to sync`)

    const results = []
    
    for (const connection of activeConnections) {
      try {
        const credentials = connection.credentials as any
        const accessToken = credentials?.accessToken
        const selectedAccounts = credentials?.selectedAccounts || credentials?.accountIds || []

        if (!accessToken || selectedAccounts.length === 0) {
          console.log(`Skipping connection ${connection.id}: No token or accounts`)
          continue
        }

        // Trigger sync for this connection
        const syncUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3333'}/api/connections/${connection.id}/sync`
        const syncResponse = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add internal auth token if needed
          }
        })

        if (syncResponse.ok) {
          const syncData = await syncResponse.json()
          results.push({
            connectionId: connection.id,
            success: true,
            stats: syncData.stats
          })
        } else {
          results.push({
            connectionId: connection.id,
            success: false,
            error: `Sync failed with status ${syncResponse.status}`
          })
        }

        // Update last sync attempt time
        await prisma.connection.update({
          where: { id: connection.id },
          data: {
            metadata: {
              ...(connection.metadata as any),
              lastSyncAttempt: new Date().toISOString()
            }
          }
        })
      } catch (connectionError) {
        console.error(`Error syncing connection ${connection.id}:`, connectionError)
        results.push({
          connectionId: connection.id,
          success: false,
          error: connectionError instanceof Error ? connectionError.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      connectionsProcessed: activeConnections.length,
      results
    })
  } catch (error) {
    console.error("Cron sync failed:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
}