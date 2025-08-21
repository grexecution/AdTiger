import { PrismaClient, ChangeHistory } from '@prisma/client'
import { diff } from 'deep-object-diff'

export class ChangeTrackingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Compare and track changes for a campaign
   */
  async trackCampaignChanges(
    accountId: string,
    existingCampaign: any,
    newData: any,
    syncJobId?: string
  ): Promise<ChangeHistory[]> {
    const changes: ChangeHistory[] = []

    // Track name changes
    if (existingCampaign.name !== newData.name) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'campaign',
            entityId: existingCampaign.id,
            externalId: existingCampaign.externalId,
            provider: existingCampaign.provider,
            changeType: 'updated',
            fieldName: 'name',
            oldValue: existingCampaign.name,
            newValue: newData.name,
            campaignId: existingCampaign.id,
            syncJobId,
          },
        })
      )
    }

    // Track status changes
    if (existingCampaign.status !== newData.status) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'campaign',
            entityId: existingCampaign.id,
            externalId: existingCampaign.externalId,
            provider: existingCampaign.provider,
            changeType: 'status_change',
            fieldName: 'status',
            oldValue: existingCampaign.status,
            newValue: newData.status,
            campaignId: existingCampaign.id,
            syncJobId,
          },
        })
      )
    }

    // Track budget changes
    if (existingCampaign.budgetAmount !== newData.budgetAmount) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'campaign',
            entityId: existingCampaign.id,
            externalId: existingCampaign.externalId,
            provider: existingCampaign.provider,
            changeType: 'updated',
            fieldName: 'budgetAmount',
            oldValue: existingCampaign.budgetAmount,
            newValue: newData.budgetAmount,
            campaignId: existingCampaign.id,
            syncJobId,
          },
        })
      )
    }

    // Track objective changes
    if (existingCampaign.objective !== newData.objective) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'campaign',
            entityId: existingCampaign.id,
            externalId: existingCampaign.externalId,
            provider: existingCampaign.provider,
            changeType: 'updated',
            fieldName: 'objective',
            oldValue: existingCampaign.objective,
            newValue: newData.objective,
            campaignId: existingCampaign.id,
            syncJobId,
          },
        })
      )
    }

    // Track metadata changes (deep comparison)
    if (existingCampaign.metadata && newData.metadata) {
      const metadataChanges = diff(existingCampaign.metadata, newData.metadata)
      if (Object.keys(metadataChanges).length > 0) {
        changes.push(
          await this.prisma.changeHistory.create({
            data: {
              accountId,
              entityType: 'campaign',
              entityId: existingCampaign.id,
              externalId: existingCampaign.externalId,
              provider: existingCampaign.provider,
              changeType: 'updated',
              fieldName: 'metadata',
              oldValue: existingCampaign.metadata,
              newValue: newData.metadata,
              campaignId: existingCampaign.id,
              syncJobId,
            },
          })
        )
      }
    }

    return changes
  }

  /**
   * Track creation of a new campaign
   */
  async trackCampaignCreation(
    accountId: string,
    campaign: any,
    syncJobId?: string
  ): Promise<ChangeHistory> {
    return await this.prisma.changeHistory.create({
      data: {
        accountId,
        entityType: 'campaign',
        entityId: campaign.id,
        externalId: campaign.externalId,
        provider: campaign.provider,
        changeType: 'created',
        fieldName: '_entity',
        newValue: {
          name: campaign.name,
          status: campaign.status,
          budgetAmount: campaign.budgetAmount,
          objective: campaign.objective,
        },
        campaignId: campaign.id,
        syncJobId,
      },
    })
  }

  /**
   * Compare and track changes for an ad group
   */
  async trackAdGroupChanges(
    accountId: string,
    existingAdGroup: any,
    newData: any,
    syncJobId?: string
  ): Promise<ChangeHistory[]> {
    const changes: ChangeHistory[] = []

    // Track name changes
    if (existingAdGroup.name !== newData.name) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'ad_group',
            entityId: existingAdGroup.id,
            externalId: existingAdGroup.externalId,
            provider: existingAdGroup.provider,
            changeType: 'updated',
            fieldName: 'name',
            oldValue: existingAdGroup.name,
            newValue: newData.name,
            adGroupId: existingAdGroup.id,
            syncJobId,
          },
        })
      )
    }

    // Track status changes
    if (existingAdGroup.status !== newData.status) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'ad_group',
            entityId: existingAdGroup.id,
            externalId: existingAdGroup.externalId,
            provider: existingAdGroup.provider,
            changeType: 'status_change',
            fieldName: 'status',
            oldValue: existingAdGroup.status,
            newValue: newData.status,
            adGroupId: existingAdGroup.id,
            syncJobId,
          },
        })
      )
    }

    // Track budget changes
    if (existingAdGroup.budgetAmount !== newData.budgetAmount) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'ad_group',
            entityId: existingAdGroup.id,
            externalId: existingAdGroup.externalId,
            provider: existingAdGroup.provider,
            changeType: 'updated',
            fieldName: 'budgetAmount',
            oldValue: existingAdGroup.budgetAmount,
            newValue: newData.budgetAmount,
            adGroupId: existingAdGroup.id,
            syncJobId,
          },
        })
      )
    }

    return changes
  }

  /**
   * Track creation of a new ad group
   */
  async trackAdGroupCreation(
    accountId: string,
    adGroup: any,
    syncJobId?: string
  ): Promise<ChangeHistory> {
    return await this.prisma.changeHistory.create({
      data: {
        accountId,
        entityType: 'ad_group',
        entityId: adGroup.id,
        externalId: adGroup.externalId,
        provider: adGroup.provider,
        changeType: 'created',
        fieldName: '_entity',
        newValue: {
          name: adGroup.name,
          status: adGroup.status,
          budgetAmount: adGroup.budgetAmount,
        },
        adGroupId: adGroup.id,
        syncJobId,
      },
    })
  }

  /**
   * Compare and track changes for an ad
   */
  async trackAdChanges(
    accountId: string,
    existingAd: any,
    newData: any,
    syncJobId?: string
  ): Promise<ChangeHistory[]> {
    const changes: ChangeHistory[] = []

    // Track name changes
    if (existingAd.name !== newData.name) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'ad',
            entityId: existingAd.id,
            externalId: existingAd.externalId,
            provider: existingAd.provider,
            changeType: 'updated',
            fieldName: 'name',
            oldValue: existingAd.name,
            newValue: newData.name,
            adId: existingAd.id,
            syncJobId,
          },
        })
      )
    }

    // Track status changes
    if (existingAd.status !== newData.status) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'ad',
            entityId: existingAd.id,
            externalId: existingAd.externalId,
            provider: existingAd.provider,
            changeType: 'status_change',
            fieldName: 'status',
            oldValue: existingAd.status,
            newValue: newData.status,
            adId: existingAd.id,
            syncJobId,
          },
        })
      )
    }

    // Track creative changes (deep comparison)
    if (existingAd.creative && newData.creative) {
      const creativeChanges = diff(existingAd.creative, newData.creative)
      if (Object.keys(creativeChanges).length > 0) {
        changes.push(
          await this.prisma.changeHistory.create({
            data: {
              accountId,
              entityType: 'ad',
              entityId: existingAd.id,
              externalId: existingAd.externalId,
              provider: existingAd.provider,
              changeType: 'updated',
              fieldName: 'creative',
              oldValue: existingAd.creative,
              newValue: newData.creative,
              adId: existingAd.id,
              syncJobId,
            },
          })
        )
      }
    }

    return changes
  }

  /**
   * Track creation of a new ad
   */
  async trackAdCreation(
    accountId: string,
    ad: any,
    syncJobId?: string
  ): Promise<ChangeHistory> {
    return await this.prisma.changeHistory.create({
      data: {
        accountId,
        entityType: 'ad',
        entityId: ad.id,
        externalId: ad.externalId,
        provider: ad.provider,
        changeType: 'created',
        fieldName: '_entity',
        newValue: {
          name: ad.name,
          status: ad.status,
          creative: ad.creative,
        },
        adId: ad.id,
        syncJobId,
      },
    })
  }

  /**
   * Get change history for an entity
   */
  async getEntityChanges(
    accountId: string,
    entityType: string,
    entityId: string,
    limit = 50
  ): Promise<ChangeHistory[]> {
    return await this.prisma.changeHistory.findMany({
      where: {
        accountId,
        entityType,
        entityId,
      },
      orderBy: {
        detectedAt: 'desc',
      },
      take: limit,
    })
  }

  /**
   * Get recent changes for an account
   */
  async getRecentChanges(
    accountId: string,
    limit = 100
  ): Promise<ChangeHistory[]> {
    return await this.prisma.changeHistory.findMany({
      where: {
        accountId,
      },
      orderBy: {
        detectedAt: 'desc',
      },
      take: limit,
      include: {
        campaign: {
          select: {
            name: true,
          },
        },
        adGroup: {
          select: {
            name: true,
          },
        },
        ad: {
          select: {
            name: true,
          },
        },
      },
    })
  }
}