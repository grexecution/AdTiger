import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { MetaSyncService } from "@/services/sync/meta-sync-service"
import { ensureValidMetaToken } from "@/lib/utils/token-refresh"

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
        const metadata = connection.metadata as any
        
        // Get access token from credentials or metadata (for compatibility)
        const accessToken = credentials?.accessToken || metadata?.accessToken
        
        // Handle different formats: selectedAccountIds (OAuth), selectedAccounts (manual), accountIds (legacy)
        let selectedAccounts: string[] = []
        
        if (credentials?.selectedAccountIds) {
          // OAuth format - array of IDs
          selectedAccounts = credentials.selectedAccountIds
        } else if (credentials?.selectedAccounts) {
          // Manual format - array of objects or IDs
          selectedAccounts = credentials.selectedAccounts.map((acc: any) => 
            typeof acc === 'string' ? acc : acc.id
          )
        } else if (credentials?.accountIds) {
          // Legacy format
          selectedAccounts = credentials.accountIds
        }

        if (!accessToken || selectedAccounts.length === 0) {
          console.log(`Skipping connection ${connection.id}: No token or accounts (has token: ${!!accessToken}, accounts: ${selectedAccounts.length})`)
          continue
        }

        console.log(`Processing connection ${connection.id} with ${selectedAccounts.length} accounts`)

        // Ensure token is valid and refresh if needed
        let validToken = accessToken
        try {
          validToken = await ensureValidMetaToken(connection.id)
        } catch (error) {
          console.error(`Failed to refresh token for connection ${connection.id}:`, error)
        }

        // Use MetaSyncService directly instead of HTTP request
        const syncService = new MetaSyncService(prisma)
        
        try {
          const syncResult = await syncService.syncAccount(
            connection.accountId,
            connection.id,
            validToken,
            'INCREMENTAL'
          )
          
          results.push({
            connectionId: connection.id,
            success: syncResult.success,
            stats: {
              campaigns: syncResult.campaigns,
              adSets: syncResult.adSets,
              ads: syncResult.ads,
              insights: syncResult.insights,
              errors: syncResult.errors.length
            }
          })
          
          console.log(`Sync completed for ${connection.id}:`, syncResult)
        } catch (syncError) {
          console.error(`Sync failed for connection ${connection.id}:`, syncError)
          results.push({
            connectionId: connection.id,
            success: false,
            error: syncError instanceof Error ? syncError.message : 'Unknown sync error'
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