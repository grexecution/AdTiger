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

  /**
   * Track targeting changes for an ad group
   */
  async trackTargetingChanges(
    accountId: string,
    adGroupId: string,
    externalId: string,
    provider: string,
    oldTargeting: any,
    newTargeting: any,
    syncJobId?: string,
    userId?: string,
    changeSource: 'ADMIN_EDIT' | 'PLATFORM_SYNC' | 'AUTO_OPTIMIZATION' = 'PLATFORM_SYNC'
  ): Promise<ChangeHistory[]> {
    const changes: ChangeHistory[] = []

    if (!oldTargeting || !newTargeting) return changes

    // Track age range changes
    if (oldTargeting.age_min !== newTargeting.age_min || oldTargeting.age_max !== newTargeting.age_max) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'ad_group',
            entityId: adGroupId,
            externalId,
            provider,
            changeType: 'targeting_updated',
            fieldName: 'age_range',
            oldValue: { age_min: oldTargeting.age_min, age_max: oldTargeting.age_max },
            newValue: { age_min: newTargeting.age_min, age_max: newTargeting.age_max },
            adGroupId,
            syncJobId,
            userId,
            changeSource,
          },
        })
      )
    }

    // Track gender targeting changes
    const oldGenders = JSON.stringify(oldTargeting.genders || [])
    const newGenders = JSON.stringify(newTargeting.genders || [])
    if (oldGenders !== newGenders) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'ad_group',
            entityId: adGroupId,
            externalId,
            provider,
            changeType: 'targeting_updated',
            fieldName: 'genders',
            oldValue: oldTargeting.genders,
            newValue: newTargeting.genders,
            adGroupId,
            syncJobId,
            userId,
            changeSource,
          },
        })
      )
    }

    // Track geo locations changes
    const oldGeo = JSON.stringify(oldTargeting.geo_locations || {})
    const newGeo = JSON.stringify(newTargeting.geo_locations || {})
    if (oldGeo !== newGeo) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'ad_group',
            entityId: adGroupId,
            externalId,
            provider,
            changeType: 'targeting_updated',
            fieldName: 'geo_locations',
            oldValue: oldTargeting.geo_locations,
            newValue: newTargeting.geo_locations,
            adGroupId,
            syncJobId,
            userId,
            changeSource,
          },
        })
      )
    }

    // Track interests changes
    const oldInterests = JSON.stringify(oldTargeting.flexible_spec?.[0]?.interests || [])
    const newInterests = JSON.stringify(newTargeting.flexible_spec?.[0]?.interests || [])
    if (oldInterests !== newInterests) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'ad_group',
            entityId: adGroupId,
            externalId,
            provider,
            changeType: 'targeting_updated',
            fieldName: 'interests',
            oldValue: oldTargeting.flexible_spec?.[0]?.interests || [],
            newValue: newTargeting.flexible_spec?.[0]?.interests || [],
            adGroupId,
            syncJobId,
            userId,
            changeSource,
          },
        })
      )
    }

    // Track custom audiences changes
    const oldAudiences = JSON.stringify(oldTargeting.custom_audiences || [])
    const newAudiences = JSON.stringify(newTargeting.custom_audiences || [])
    if (oldAudiences !== newAudiences) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'ad_group',
            entityId: adGroupId,
            externalId,
            provider,
            changeType: 'targeting_updated',
            fieldName: 'custom_audiences',
            oldValue: oldTargeting.custom_audiences,
            newValue: newTargeting.custom_audiences,
            adGroupId,
            syncJobId,
            userId,
            changeSource,
          },
        })
      )
    }

    // Track placement changes
    const oldPlacements = JSON.stringify(oldTargeting.publisher_platforms || [])
    const newPlacements = JSON.stringify(newTargeting.publisher_platforms || [])
    if (oldPlacements !== newPlacements) {
      changes.push(
        await this.prisma.changeHistory.create({
          data: {
            accountId,
            entityType: 'ad_group',
            entityId: adGroupId,
            externalId,
            provider,
            changeType: 'targeting_updated',
            fieldName: 'publisher_platforms',
            oldValue: oldTargeting.publisher_platforms,
            newValue: newTargeting.publisher_platforms,
            adGroupId,
            syncJobId,
            userId,
            changeSource,
          },
        })
      )
    }

    return changes
  }

  /**
   * Track creative image changes using AssetStorage
   */
  async trackCreativeImageChanges(
    accountId: string,
    adId: string,
    externalId: string,
    provider: string,
    oldImageHash: string | null,
    newImageHash: string | null,
    imageUrl: string,
    syncJobId?: string,
    userId?: string,
    changeSource: 'ADMIN_EDIT' | 'PLATFORM_SYNC' | 'AUTO_OPTIMIZATION' = 'PLATFORM_SYNC'
  ): Promise<ChangeHistory | null> {
    if (oldImageHash === newImageHash) return null

    return await this.prisma.changeHistory.create({
      data: {
        accountId,
        entityType: 'ad',
        entityId: adId,
        externalId,
        provider,
        changeType: 'creative_image_updated',
        fieldName: 'image_hash',
        oldValue: oldImageHash ? { hash: oldImageHash } : null,
        newValue: { hash: newImageHash, url: imageUrl },
        adId,
        syncJobId,
        userId,
        changeSource,
      },
    })
  }

  /**
   * Track conversion type/event changes
   */
  async trackConversionTypeChanges(
    accountId: string,
    entityId: string,
    entityType: 'campaign' | 'ad_group' | 'ad',
    externalId: string,
    provider: string,
    oldConversionEvents: any,
    newConversionEvents: any,
    syncJobId?: string,
    userId?: string,
    changeSource: 'ADMIN_EDIT' | 'PLATFORM_SYNC' | 'AUTO_OPTIMIZATION' = 'PLATFORM_SYNC'
  ): Promise<ChangeHistory | null> {
    const oldEvents = JSON.stringify(oldConversionEvents || [])
    const newEvents = JSON.stringify(newConversionEvents || [])
    
    if (oldEvents === newEvents) return null

    const data: any = {
      accountId,
      entityType,
      entityId,
      externalId,
      provider,
      changeType: 'conversion_tracking_updated',
      fieldName: 'conversion_events',
      oldValue: oldConversionEvents,
      newValue: newConversionEvents,
      syncJobId,
      userId,
      changeSource,
    }

    // Add specific entity ID
    if (entityType === 'campaign') data.campaignId = entityId
    else if (entityType === 'ad_group') data.adGroupId = entityId
    else if (entityType === 'ad') data.adId = entityId

    return await this.prisma.changeHistory.create({ data })
  }

  /**
   * Track admin-initiated edit
   */
  async trackAdminEdit(
    accountId: string,
    userId: string,
    entityType: string,
    entityId: string,
    externalId: string,
    provider: string,
    changeType: string,
    fieldName: string,
    oldValue: any,
    newValue: any,
    campaignId?: string,
    adGroupId?: string,
    adId?: string
  ): Promise<ChangeHistory> {
    return await this.prisma.changeHistory.create({
      data: {
        accountId,
        entityType,
        entityId,
        externalId,
        provider,
        changeType,
        fieldName,
        oldValue,
        newValue,
        campaignId,
        adGroupId,
        adId,
        userId,
        changeSource: 'ADMIN_EDIT',
      },
    })
  }

  /**
   * Get changes with performance correlation data
   */
  async getChangesWithPerformance(
    accountId: string,
    entityType: string,
    entityId: string,
    daysAround = 7 // Days before and after to fetch metrics
  ): Promise<any[]> {
    const changes = await this.prisma.changeHistory.findMany({
      where: {
        accountId,
        entityType,
        entityId,
      },
      orderBy: {
        detectedAt: 'asc',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // For each change, fetch performance metrics before and after
    const changesWithPerformance = await Promise.all(
      changes.map(async (change) => {
        const changeDate = new Date(change.detectedAt)
        const startDate = new Date(changeDate)
        startDate.setDate(startDate.getDate() - daysAround)
        const endDate = new Date(changeDate)
        endDate.setDate(endDate.getDate() + daysAround)

        // Fetch insights around this change
        const insights = await this.prisma.insight.findMany({
          where: {
            accountId,
            entityType,
            entityId,
            date: {
              gte: startDate,
              lte: endDate,
            },
            window: '1d',
          },
          orderBy: {
            date: 'asc',
          },
        })

        // Calculate before/after metrics
        const beforeMetrics = insights
          .filter(i => i.date < changeDate)
          .map(i => i.metrics as any)
        
        const afterMetrics = insights
          .filter(i => i.date >= changeDate)
          .map(i => i.metrics as any)

        const avgMetrics = (metrics: any[]) => {
          if (metrics.length === 0) return null
          const sum = metrics.reduce((acc, m) => ({
            clicks: (acc.clicks || 0) + (m.clicks || 0),
            impressions: (acc.impressions || 0) + (m.impressions || 0),
            spend: (acc.spend || 0) + (m.spend || 0),
            conversions: (acc.conversions || 0) + (m.conversions || 0),
          }), { clicks: 0, impressions: 0, spend: 0, conversions: 0 })
          
          return {
            clicks: sum.clicks / metrics.length,
            impressions: sum.impressions / metrics.length,
            spend: sum.spend / metrics.length,
            conversions: sum.conversions / metrics.length,
            ctr: sum.impressions > 0 ? (sum.clicks / sum.impressions) * 100 : 0,
          }
        }

        return {
          ...change,
          performanceBefore: avgMetrics(beforeMetrics),
          performanceAfter: avgMetrics(afterMetrics),
          insights: insights.map(i => ({
            date: i.date,
            metrics: i.metrics,
          })),
        }
      })
    )

    return changesWithPerformance
  }
}