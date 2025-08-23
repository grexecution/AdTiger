import { PrismaClient } from "@prisma/client"
// import { MetaRealSyncService } from "./meta-sync-real"
// import { GoogleSyncService } from "./google-sync" // TODO: Implement

export class SyncService {
  // private metaSync: MetaRealSyncService
  // private googleSync: GoogleSyncService

  constructor(private prisma: PrismaClient) {
    // this.metaSync = new MetaRealSyncService(prisma)
    // this.googleSync = new GoogleSyncService(prisma)
  }

  async syncAccount(accountId: string, provider: string) {
    // Create sync job
    const syncJob = await this.prisma.syncJob.create({
      data: {
        accountId,
        provider,
        type: "full",
        status: "running",
        startedAt: new Date()
      }
    })

    try {
      let result
      
      switch (provider) {
        case "meta":
          // result = await this.metaSync.syncAccount(accountId)
          result = { success: false, message: "Meta sync not implemented" }
          break
        // case "google":
        //   result = await this.googleSync.syncAccount(accountId)
        //   break
        default:
          throw new Error(`Unsupported provider: ${provider}`)
      }

      // Update sync job with success
      await this.prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          recordsSynced: (result as any).recordsSynced || 0,
          metadata: (result as any).metadata || {}
        }
      })

      return result
    } catch (error) {
      // Update sync job with failure
      await this.prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          errors: [error instanceof Error ? error.message : "Unknown error"]
        }
      })

      throw error
    }
  }

  async syncCampaigns(accountId: string, adAccountId: string, provider: string) {
    const syncJob = await this.prisma.syncJob.create({
      data: {
        accountId,
        provider,
        type: "campaigns",
        scope: { adAccountId },
        status: "running",
        startedAt: new Date()
      }
    })

    try {
      let result
      
      switch (provider) {
        case "meta":
          // result = await this.metaSync.syncCampaigns(accountId, adAccountId)
          result = { success: false, message: "Meta sync not implemented" }
          break
        default:
          throw new Error(`Unsupported provider: ${provider}`)
      }

      await this.prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          recordsSynced: (result as any).recordsSynced || 0
        }
      })

      return result
    } catch (error) {
      await this.prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          errors: [error instanceof Error ? error.message : "Unknown error"]
        }
      })

      throw error
    }
  }

  async syncInsights(
    accountId: string, 
    entityType: string,
    entityId: string,
    provider: string,
    dateRange?: { start: Date; end: Date }
  ) {
    const syncJob = await this.prisma.syncJob.create({
      data: {
        accountId,
        provider,
        type: "insights",
        scope: { entityType, entityId, dateRange },
        status: "running",
        startedAt: new Date()
      }
    })

    try {
      let result
      
      switch (provider) {
        case "meta":
          result = await this.metaSync.syncInsights(
            accountId,
            entityType,
            entityId,
            dateRange
          )
          break
        default:
          throw new Error(`Unsupported provider: ${provider}`)
      }

      await this.prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          recordsSynced: (result as any).recordsSynced || 0
        }
      })

      return result
    } catch (error) {
      await this.prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          errors: [error instanceof Error ? error.message : "Unknown error"]
        }
      })

      throw error
    }
  }

  async getLastSync(accountId: string, provider?: string) {
    return await this.prisma.syncJob.findFirst({
      where: {
        accountId,
        ...(provider && { provider }),
        status: "completed"
      },
      orderBy: { completedAt: "desc" }
    })
  }

  async getSyncStatus(syncJobId: string) {
    return await this.prisma.syncJob.findUnique({
      where: { id: syncJobId }
    })
  }
}