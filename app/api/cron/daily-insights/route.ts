import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchHistoricalDataForAllAds } from '@/lib/meta-historical-sync'
import { subDays, format } from 'date-fns'

export const maxDuration = 300 // 5 minutes for cron job

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  let syncHistory: any = null
  
  try {
    // Verify cron secret - Vercel will send this automatically
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // In production, Vercel sends the cron secret
    // In development, allow "Bearer dev" for testing
    const isValidAuth = authHeader === `Bearer ${cronSecret}` || 
                       (process.env.NODE_ENV === 'development' && authHeader === 'Bearer dev')
    
    if (!isValidAuth && process.env.NODE_ENV === 'production') {
      console.log('[CRON] Unauthorized request - invalid cron secret')
      return new Response('Unauthorized', { status: 401 })
    }

    console.log('[CRON] Starting daily insights sync at', new Date().toISOString())
    
    // Get all active Meta connections
    const connections = await prisma.connection.findMany({
      where: {
        provider: 'meta',
        status: 'active'
      },
      include: {
        account: true
      }
    })

    console.log(`[CRON] Found ${connections.length} active Meta connections`)
    
    const results = []
    let totalAdsProcessed = 0
    let totalInsightsCreated = 0
    let totalErrors = 0
    
    for (const connection of connections) {
      const credentials = connection.credentials as any
      const accessToken = credentials?.accessToken
      if (!accessToken) continue
      
      // Create sync history entry for this account
      const accountSyncHistory = await prisma.syncHistory.create({
        data: {
          accountId: connection.accountId,
          provider: 'META',
          syncType: 'INCREMENTAL', // Daily sync is incremental
          status: 'SUCCESS', // Will update if failed
          startedAt: new Date(),
          metadata: {
            source: 'daily_cron',
            daysBack: 7,
            connectionId: connection.id
          }
        }
      })
      
      try {
        console.log(`[CRON] Syncing insights for account ${connection.accountId}`)
        
        // Fetch last 7 days of data (for daily sync, we just need recent data)
        const syncResults = await fetchHistoricalDataForAllAds(
          connection.accountId,
          accessToken,
          7 // Just sync last 7 days in daily job
        )
        
        const successCount = syncResults.filter(r => r.success).length
        const failCount = syncResults.filter(r => !r.success).length
        const totalDaysProcessed = syncResults.reduce((sum, r) => sum + (r.days || 0), 0)
        
        totalAdsProcessed += syncResults.length
        totalInsightsCreated += totalDaysProcessed
        totalErrors += failCount
        
        results.push({
          accountId: connection.accountId,
          success: true,
          adsProcessed: syncResults.length,
          successfulAds: successCount,
          failedAds: failCount,
          insightsCreated: totalDaysProcessed,
          details: syncResults
        })
        
        // Update sync history with success
        await prisma.syncHistory.update({
          where: { id: accountSyncHistory.id },
          data: {
            status: 'SUCCESS',
            completedAt: new Date(),
            duration: Date.now() - accountSyncHistory.startedAt.getTime(),
            adsSync: successCount,
            insightsSync: totalDaysProcessed,
            metadata: {
              ...(accountSyncHistory.metadata as any || {}),
              successfulAds: successCount,
              failedAds: failCount,
              totalDaysProcessed,
              errors: syncResults.filter(r => !r.success).map(r => ({
                adId: r.adId,
                error: r.error
              }))
            }
          }
        })
        
        // Update last sync timestamp
        await prisma.providerConnection.update({
          where: { id: connection.id },
          data: {
            metadata: {
              ...(connection.metadata as any || {}),
              lastDailySync: new Date().toISOString(),
              lastDailySyncStatus: 'success'
            }
          }
        })
        
      } catch (error) {
        console.error(`[CRON] Error syncing account ${connection.accountId}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        totalErrors++
        
        results.push({
          accountId: connection.accountId,
          success: false,
          adsProcessed: 0,
          successfulAds: 0,
          failedAds: 0,
          insightsCreated: 0,
          error: errorMessage
        })
        
        // Update sync history with error
        await prisma.syncHistory.update({
          where: { id: accountSyncHistory.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            duration: Date.now() - accountSyncHistory.startedAt.getTime(),
            errorMessage,
            errorCategory: 'API_ERROR',
            metadata: {
              ...(accountSyncHistory.metadata as any || {}),
              errorDetails: error instanceof Error ? error.stack : String(error)
            }
          }
        })
        
        // Update connection with error status
        await prisma.providerConnection.update({
          where: { id: connection.id },
          data: {
            metadata: {
              ...(connection.metadata as any || {}),
              lastDailySync: new Date().toISOString(),
              lastDailySyncStatus: 'error',
              lastDailySyncError: errorMessage
            }
          }
        })
      }
    }
    
    // Log summary
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    console.log(`[CRON] Daily insights sync completed: ${successful} succeeded, ${failed} failed`)
    console.log(`[CRON] Total: ${totalAdsProcessed} ads, ${totalInsightsCreated} insights created`)
    
    // Create overall sync history summary
    if (connections.length > 0) {
      await prisma.syncHistory.create({
        data: {
          accountId: connections[0].accountId, // Use first account as reference
          provider: 'META',
          syncType: 'INCREMENTAL',
          status: failed > 0 ? 'FAILED' : 'SUCCESS',
          startedAt: new Date(startTime),
          completedAt: new Date(),
          duration: Date.now() - startTime,
          adsSync: totalAdsProcessed,
          insightsSync: totalInsightsCreated,
          metadata: {
            source: 'daily_cron_summary',
            accountsProcessed: results.length,
            successful,
            failed,
            totalErrors,
            results: results.map(r => ({
              accountId: r.accountId,
              success: r.success,
              adsProcessed: r.adsProcessed,
              insightsCreated: r.insightsCreated,
              error: r.error
            }))
          }
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      summary: {
        accountsProcessed: results.length,
        successful,
        failed,
        totalAdsProcessed,
        totalInsightsCreated,
        totalErrors
      },
      results
    })
    
  } catch (error) {
    console.error('[CRON] Fatal error in daily insights sync:', error)
    return NextResponse.json(
      { 
        error: 'Cron job failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}