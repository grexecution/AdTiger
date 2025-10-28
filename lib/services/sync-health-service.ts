import { PrismaClient } from '@prisma/client'

export interface AccessIssue {
  type: 'token_expired' | 'permission_denied' | 'account_disabled' | 'api_error'
  accountId: string
  message: string
  timestamp: Date
}

export interface DataDiscrepancy {
  type: 'orphaned_ad' | 'missing_campaign' | 'missing_adgroup' | 'inconsistent_data'
  entityType: string
  entityId: string
  details: string
}

export interface SyncHealthReport {
  status: 'HEALTHY' | 'PARTIAL' | 'UNHEALTHY'
  accessIssues: AccessIssue[]
  dataDiscrepancies: DataDiscrepancy[]
  summary: {
    totalEntities: number
    healthyEntities: number
    problematicEntities: number
  }
}

export class SyncHealthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Detect access issues from sync errors
   */
  async detectAccessIssues(
    accountId: string,
    provider: string,
    errorMessage?: string
  ): Promise<AccessIssue[]> {
    const issues: AccessIssue[] = []

    if (!errorMessage) return issues

    const errorLower = errorMessage.toLowerCase()

    // Token expiration
    if (errorLower.includes('token') && (errorLower.includes('expired') || errorLower.includes('invalid'))) {
      issues.push({
        type: 'token_expired',
        accountId,
        message: 'Access token has expired or is invalid. Please reconnect your account.',
        timestamp: new Date(),
      })
    }

    // Permission denied
    if (errorLower.includes('permission') || errorLower.includes('unauthorized') || errorLower.includes('forbidden')) {
      issues.push({
        type: 'permission_denied',
        accountId,
        message: 'Access to some resources was denied. Please check account permissions.',
        timestamp: new Date(),
      })
    }

    // Account disabled
    if (errorLower.includes('disabled') || errorLower.includes('suspended') || errorLower.includes('deactivated')) {
      issues.push({
        type: 'account_disabled',
        accountId,
        message: 'Ad account appears to be disabled or suspended.',
        timestamp: new Date(),
      })
    }

    // Generic API error
    if (errorLower.includes('api error') || errorLower.includes('rate limit')) {
      issues.push({
        type: 'api_error',
        accountId,
        message: errorMessage,
        timestamp: new Date(),
      })
    }

    // Check connection status
    const connection = await this.prisma.connection.findFirst({
      where: {
        accountId,
        provider: provider.toLowerCase(),
      },
    })

    if (connection && connection.status === 'error') {
      const metadata = connection.metadata as any
      if (metadata?.lastError) {
        issues.push({
          type: 'api_error',
          accountId,
          message: metadata.lastError,
          timestamp: new Date(),
        })
      }
    }

    return issues
  }

  /**
   * Detect data discrepancies in the database
   */
  async detectDataDiscrepancies(accountId: string, provider: string): Promise<DataDiscrepancy[]> {
    const discrepancies: DataDiscrepancy[] = []

    // Find orphaned ads (ads without adGroup)
    const orphanedAds = await this.prisma.ad.findMany({
      where: {
        accountId,
        provider: provider.toLowerCase(),
        adGroup: null,
      },
      select: {
        id: true,
        name: true,
        externalId: true,
      },
    })

    for (const ad of orphanedAds) {
      discrepancies.push({
        type: 'orphaned_ad',
        entityType: 'ad',
        entityId: ad.id,
        details: `Ad "${ad.name}" (${ad.externalId}) has no associated ad group`,
      })
    }

    // Find ad groups without campaigns
    const orphanedAdGroups = await this.prisma.adGroup.findMany({
      where: {
        accountId,
        provider: provider.toLowerCase(),
        campaign: null,
      },
      select: {
        id: true,
        name: true,
        externalId: true,
      },
    })

    for (const adGroup of orphanedAdGroups) {
      discrepancies.push({
        type: 'missing_campaign',
        entityType: 'ad_group',
        entityId: adGroup.id,
        details: `Ad group "${adGroup.name}" (${adGroup.externalId}) has no associated campaign`,
      })
    }

    // Find ads with missing adGroupId reference
    const adsWithMissingAdGroup = await this.prisma.ad.findMany({
      where: {
        accountId,
        provider: provider.toLowerCase(),
      },
      include: {
        adGroup: true,
      },
    })

    for (const ad of adsWithMissingAdGroup) {
      if (ad.adGroupId && !ad.adGroup) {
        discrepancies.push({
          type: 'missing_adgroup',
          entityType: 'ad',
          entityId: ad.id,
          details: `Ad "${ad.name}" references non-existent ad group ID: ${ad.adGroupId}`,
        })
      }
    }

    // Check for campaigns without ad accounts
    const campaignsWithoutAdAccount = await this.prisma.campaign.findMany({
      where: {
        accountId,
        provider: provider.toLowerCase(),
      },
      include: {
        adAccount: true,
      },
    })

    for (const campaign of campaignsWithoutAdAccount) {
      if (!campaign.adAccount) {
        discrepancies.push({
          type: 'inconsistent_data',
          entityType: 'campaign',
          entityId: campaign.id,
          details: `Campaign "${campaign.name}" references non-existent ad account`,
        })
      }
    }

    return discrepancies
  }

  /**
   * Calculate overall sync health status
   */
  async calculateSyncHealth(
    accountId: string,
    provider: string,
    accessIssues: AccessIssue[],
    dataDiscrepancies: DataDiscrepancy[]
  ): Promise<SyncHealthReport> {
    // Count entities
    const [campaigns, adGroups, ads] = await Promise.all([
      this.prisma.campaign.count({ where: { accountId, provider: provider.toLowerCase() } }),
      this.prisma.adGroup.count({ where: { accountId, provider: provider.toLowerCase() } }),
      this.prisma.ad.count({ where: { accountId, provider: provider.toLowerCase() } }),
    ])

    const totalEntities = campaigns + adGroups + ads
    const problematicEntities = dataDiscrepancies.length

    let status: 'HEALTHY' | 'PARTIAL' | 'UNHEALTHY'

    // Determine health status
    if (accessIssues.length > 0) {
      // Critical access issues always result in UNHEALTHY status
      const criticalIssues = accessIssues.filter(
        i => i.type === 'token_expired' || i.type === 'permission_denied'
      )
      status = criticalIssues.length > 0 ? 'UNHEALTHY' : 'PARTIAL'
    } else if (problematicEntities === 0) {
      status = 'HEALTHY'
    } else if (problematicEntities / totalEntities < 0.05) {
      // Less than 5% problematic
      status = 'HEALTHY'
    } else if (problematicEntities / totalEntities < 0.20) {
      // Less than 20% problematic
      status = 'PARTIAL'
    } else {
      status = 'UNHEALTHY'
    }

    return {
      status,
      accessIssues,
      dataDiscrepancies,
      summary: {
        totalEntities,
        healthyEntities: totalEntities - problematicEntities,
        problematicEntities,
      },
    }
  }

  /**
   * Full health check for an account
   */
  async performHealthCheck(accountId: string, provider: string, errorMessage?: string): Promise<SyncHealthReport> {
    const accessIssues = await this.detectAccessIssues(accountId, provider, errorMessage)
    const dataDiscrepancies = await this.detectDataDiscrepancies(accountId, provider)
    
    return await this.calculateSyncHealth(accountId, provider, accessIssues, dataDiscrepancies)
  }

  /**
   * Get recent sync health status
   */
  async getRecentSyncHealth(accountId: string, provider: string, days: number = 7): Promise<any> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const syncHistory = await this.prisma.syncHistory.findMany({
      where: {
        accountId,
        provider: provider.toUpperCase() as any,
        startedAt: {
          gte: startDate,
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 50,
    })

    const totalSyncs = syncHistory.length
    const successfulSyncs = syncHistory.filter(s => s.status === 'SUCCESS').length
    const healthySyncs = syncHistory.filter(s => s.healthStatus === 'HEALTHY').length

    const recentAccessIssues = syncHistory
      .filter(s => s.accessIssues && Array.isArray(s.accessIssues) && (s.accessIssues as any[]).length > 0)
      .map(s => ({
        syncId: s.id,
        startedAt: s.startedAt,
        issues: s.accessIssues,
      }))

    const recentDiscrepancies = syncHistory
      .filter(s => s.dataDiscrepancies && Array.isArray(s.dataDiscrepancies) && (s.dataDiscrepancies as any[]).length > 0)
      .map(s => ({
        syncId: s.id,
        startedAt: s.startedAt,
        discrepancies: s.dataDiscrepancies,
      }))

    return {
      period: {
        days,
        startDate,
        endDate: new Date(),
      },
      stats: {
        totalSyncs,
        successfulSyncs,
        successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0,
        healthySyncs,
        healthRate: totalSyncs > 0 ? (healthySyncs / totalSyncs) * 100 : 0,
      },
      recentAccessIssues,
      recentDiscrepancies,
      currentHealth: syncHistory[0]?.healthStatus || 'HEALTHY',
    }
  }

  /**
   * Fix orphaned entities by removing them
   */
  async fixOrphanedEntities(accountId: string): Promise<{ fixed: number; errors: string[] }> {
    let fixed = 0
    const errors: string[] = []

    try {
      // Delete orphaned ads (without adGroup)
      const deletedAds = await this.prisma.ad.deleteMany({
        where: {
          accountId,
          adGroup: null,
        },
      })
      fixed += deletedAds.count

      // Delete orphaned ad groups (without campaign)
      const deletedAdGroups = await this.prisma.adGroup.deleteMany({
        where: {
          accountId,
          campaign: null,
        },
      })
      fixed += deletedAdGroups.count

    } catch (error) {
      errors.push(`Failed to fix orphaned entities: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return { fixed, errors }
  }
}


