import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true },
    })

    if (!user?.accountId) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }

    // Try to find sync history by jobId (queueJobId)
    const syncHistory = await prisma.syncHistory.findFirst({
      where: {
        OR: [
          { id: params.jobId },
          { queueJobId: params.jobId },
        ],
        accountId: user.accountId,
      },
      orderBy: {
        startedAt: 'desc',
      },
    })

    if (!syncHistory) {
      // Check if it's a pending job in SyncJob table
      const syncJob = await prisma.syncJob.findFirst({
        where: {
          OR: [
            { id: params.jobId },
          ],
          accountId: user.accountId,
        },
      })

      if (syncJob) {
        // Job exists but hasn't completed yet
        return NextResponse.json({
          jobId: syncJob.id,
          status: syncJob.status,
          progress: calculateProgress(syncJob),
          stage: getCurrentStage(syncJob),
          recordsProcessed: syncJob.recordsSynced,
          startedAt: syncJob.startedAt,
          estimatedTimeRemaining: estimateTimeRemaining(syncJob),
          metadata: syncJob.metadata,
        })
      }

      return NextResponse.json(
        { error: 'Sync job not found' },
        { status: 404 }
      )
    }

    // Calculate progress based on sync history
    const isComplete = syncHistory.status !== 'SUCCESS' || syncHistory.completedAt !== null
    const progress = isComplete ? 100 : calculateProgressFromHistory(syncHistory)

    return NextResponse.json({
      jobId: syncHistory.queueJobId || syncHistory.id,
      syncHistoryId: syncHistory.id,
      status: syncHistory.status,
      healthStatus: syncHistory.healthStatus,
      progress,
      stage: isComplete ? 'completed' : 'processing',
      recordsProcessed: {
        campaigns: syncHistory.campaignsSync,
        adGroups: syncHistory.adGroupsSync,
        ads: syncHistory.adsSync,
        insights: syncHistory.insightsSync,
        total: syncHistory.campaignsSync + syncHistory.adGroupsSync + syncHistory.adsSync + syncHistory.insightsSync,
      },
      startedAt: syncHistory.startedAt,
      completedAt: syncHistory.completedAt,
      duration: syncHistory.duration,
      provider: syncHistory.provider,
      syncType: syncHistory.syncType,
      errorMessage: syncHistory.errorMessage,
      detectedChanges: syncHistory.detectedChanges,
      accessIssues: syncHistory.accessIssues,
      dataDiscrepancies: syncHistory.dataDiscrepancies,
      metadata: syncHistory.metadata,
    })

  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateProgress(syncJob: any): number {
  if (syncJob.status === 'completed') return 100
  if (syncJob.status === 'failed' || syncJob.status === 'cancelled') return 0

  // Estimate based on records synced and metadata
  const metadata = syncJob.metadata as any
  if (metadata?.totalExpected) {
    return Math.min(95, Math.floor((syncJob.recordsSynced / metadata.totalExpected) * 100))
  }

  // Default progress based on time elapsed
  if (syncJob.startedAt) {
    const elapsed = Date.now() - new Date(syncJob.startedAt).getTime()
    const estimatedTotal = 5 * 60 * 1000 // 5 minutes average
    return Math.min(95, Math.floor((elapsed / estimatedTotal) * 100))
  }

  return 10 // Default starting progress
}

function calculateProgressFromHistory(syncHistory: any): number {
  if (syncHistory.completedAt) return 100

  const totalRecords = syncHistory.campaignsSync + syncHistory.adGroupsSync + syncHistory.adsSync + syncHistory.insightsSync
  
  // If we have significant records, we're at least 50% done
  if (totalRecords > 100) return 75
  if (totalRecords > 50) return 60
  if (totalRecords > 10) return 40
  if (totalRecords > 0) return 20

  // Check elapsed time
  if (syncHistory.startedAt) {
    const elapsed = Date.now() - new Date(syncHistory.startedAt).getTime()
    if (elapsed > 3 * 60 * 1000) return 50 // Been running for 3 minutes
    if (elapsed > 1 * 60 * 1000) return 30 // Been running for 1 minute
    return 10
  }

  return 5
}

function getCurrentStage(syncJob: any): string {
  const metadata = syncJob.metadata as any
  
  if (metadata?.currentStage) {
    return metadata.currentStage
  }

  // Guess based on records
  if (syncJob.recordsSynced === 0) return 'initializing'
  if (syncJob.recordsSynced < 10) return 'fetching_campaigns'
  if (syncJob.recordsSynced < 50) return 'fetching_ad_groups'
  if (syncJob.recordsSynced < 200) return 'fetching_ads'
  return 'processing_insights'
}

function estimateTimeRemaining(syncJob: any): number | null {
  if (!syncJob.startedAt) return null

  const elapsed = Date.now() - new Date(syncJob.startedAt).getTime()
  const progress = calculateProgress(syncJob)

  if (progress < 10) return 5 * 60 * 1000 // 5 minutes

  // Estimate based on progress
  const estimatedTotal = (elapsed / progress) * 100
  return Math.max(0, estimatedTotal - elapsed)
}


