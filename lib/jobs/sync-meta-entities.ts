import { Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { MetaSyncJobData } from '@/lib/queue/queues'
import { META_API_VERSION } from '@/lib/meta-auth'

export async function syncMetaEntities(job: Job<MetaSyncJobData>) {
  const { accountId, providerConnectionId, syncType, entityTypes } = job.data
  
  try {
    job.log(`Starting ${syncType} sync for account ${accountId}`)
    
    // Get the provider connection
    const connection = await prisma.providerConnection.findUnique({
      where: { id: providerConnectionId },
    })
    
    if (!connection || !connection.accessToken) {
      throw new Error('Invalid or missing provider connection')
    }
    
    // Check if token is expired
    if (connection.expiresAt && connection.expiresAt < new Date()) {
      throw new Error('Access token expired')
    }
    
    const entitiesToSync = entityTypes || ['adAccounts', 'campaigns', 'adGroups', 'ads']
    let progress = 0
    const totalSteps = entitiesToSync.length
    
    // 1. Sync Ad Accounts
    if (entitiesToSync.includes('adAccounts')) {
      await job.updateProgress((progress / totalSteps) * 100)
      job.log('Syncing ad accounts...')
      
      const adAccounts = await fetchMetaAdAccounts(connection.accessToken)
      
      for (const account of adAccounts) {
        await prisma.adAccount.upsert({
          where: {
            accountId_provider_externalId: {
              accountId,
              provider: 'meta',
              externalId: account.account_id,
            },
          },
          update: {
            name: account.name,
            currency: account.currency,
            timezone: account.timezone_name,
            status: getAccountStatus(account.account_status),
            metadata: {
              ...account,
              lastSyncedAt: new Date().toISOString(),
            },
          },
          create: {
            accountId,
            provider: 'meta',
            externalId: account.account_id,
            name: account.name,
            currency: account.currency,
            timezone: account.timezone_name,
            status: getAccountStatus(account.account_status),
            metadata: {
              ...account,
              lastSyncedAt: new Date().toISOString(),
            },
          },
        })
      }
      
      job.log(`Synced ${adAccounts.length} ad accounts`)
      progress++
    }
    
    // 2. Sync Campaigns
    if (entitiesToSync.includes('campaigns')) {
      await job.updateProgress((progress / totalSteps) * 100)
      job.log('Syncing campaigns...')
      
      const adAccounts = await prisma.adAccount.findMany({
        where: { accountId, provider: 'meta' },
      })
      
      let totalCampaigns = 0
      
      for (const adAccount of adAccounts) {
        const campaigns = await fetchMetaCampaigns(
          connection.accessToken,
          adAccount.externalId
        )
        
        for (const campaign of campaigns) {
          await prisma.campaign.upsert({
            where: {
              accountId_provider_externalId: {
                accountId,
                provider: 'meta',
                externalId: campaign.id,
              },
            },
            update: {
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              budgetAmount: campaign.daily_budget || campaign.lifetime_budget,
              budgetCurrency: adAccount.currency || 'USD',
              metadata: {
                ...campaign,
                lastSyncedAt: new Date().toISOString(),
              },
            },
            create: {
              accountId,
              adAccountId: adAccount.id,
              provider: 'meta',
              externalId: campaign.id,
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              budgetAmount: campaign.daily_budget || campaign.lifetime_budget,
              budgetCurrency: adAccount.currency || 'USD',
              metadata: {
                ...campaign,
                lastSyncedAt: new Date().toISOString(),
              },
            },
          })
          totalCampaigns++
        }
      }
      
      job.log(`Synced ${totalCampaigns} campaigns`)
      progress++
    }
    
    // 3. Sync Ad Groups (Ad Sets in Meta)
    if (entitiesToSync.includes('adGroups')) {
      await job.updateProgress((progress / totalSteps) * 100)
      job.log('Syncing ad sets...')
      
      const campaigns = await prisma.campaign.findMany({
        where: { accountId, provider: 'meta' },
      })
      
      let totalAdSets = 0
      
      for (const campaign of campaigns) {
        const adSets = await fetchMetaAdSets(
          connection.accessToken,
          campaign.externalId
        )
        
        for (const adSet of adSets) {
          await prisma.adGroup.upsert({
            where: {
              accountId_provider_externalId: {
                accountId,
                provider: 'meta',
                externalId: adSet.id,
              },
            },
            update: {
              name: adSet.name,
              status: adSet.status,
              budgetAmount: adSet.daily_budget || adSet.lifetime_budget,
              budgetCurrency: campaign.budgetCurrency || 'USD',
              metadata: {
                ...adSet,
                lastSyncedAt: new Date().toISOString(),
              },
            },
            create: {
              accountId,
              campaignId: campaign.id,
              provider: 'meta',
              externalId: adSet.id,
              name: adSet.name,
              status: adSet.status,
              budgetAmount: adSet.daily_budget || adSet.lifetime_budget,
              budgetCurrency: campaign.budgetCurrency || 'USD',
              metadata: {
                ...adSet,
                lastSyncedAt: new Date().toISOString(),
              },
            },
          })
          totalAdSets++
        }
      }
      
      job.log(`Synced ${totalAdSets} ad sets`)
      progress++
    }
    
    // 4. Sync Ads
    if (entitiesToSync.includes('ads')) {
      await job.updateProgress((progress / totalSteps) * 100)
      job.log('Syncing ads...')
      
      const adGroups = await prisma.adGroup.findMany({
        where: { accountId, provider: 'meta' },
      })
      
      let totalAds = 0
      
      for (const adGroup of adGroups) {
        const ads = await fetchMetaAds(
          connection.accessToken,
          adGroup.externalId
        )
        
        for (const ad of ads) {
          await prisma.ad.upsert({
            where: {
              accountId_provider_externalId: {
                accountId,
                provider: 'meta',
                externalId: ad.id,
              },
            },
            update: {
              name: ad.name,
              status: ad.status,
              creative: ad.creative || {},
              metadata: {
                ...ad,
                lastSyncedAt: new Date().toISOString(),
              },
            },
            create: {
              accountId,
              adGroupId: adGroup.id,
              provider: 'meta',
              externalId: ad.id,
              name: ad.name,
              status: ad.status,
              creative: ad.creative || {},
              metadata: {
                ...ad,
                lastSyncedAt: new Date().toISOString(),
              },
            },
          })
          totalAds++
        }
      }
      
      job.log(`Synced ${totalAds} ads`)
      progress++
    }
    
    await job.updateProgress(100)
    job.log('Sync completed successfully')
    
    return {
      success: true,
      syncType,
      timestamp: new Date().toISOString(),
    }
    
  } catch (error) {
    job.log(`Error during sync: ${error}`)
    throw error
  }
}

// Helper functions to fetch from Meta API
async function fetchMetaAdAccounts(accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/me/adaccounts?fields=id,account_id,name,account_status,currency,timezone_name,business&limit=200&access_token=${accessToken}`
  )
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to fetch ad accounts')
  }
  
  const data = await response.json()
  return data.data || []
}

async function fetchMetaCampaigns(accessToken: string, adAccountId: string) {
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time&limit=500&access_token=${accessToken}`
  )
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to fetch campaigns')
  }
  
  const data = await response.json()
  return data.data || []
}

async function fetchMetaAdSets(accessToken: string, campaignId: string) {
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event&limit=500&access_token=${accessToken}`
  )
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to fetch ad sets')
  }
  
  const data = await response.json()
  return data.data || []
}

async function fetchMetaAds(accessToken: string, adSetId: string) {
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${adSetId}/ads?fields=id,name,status,creative{id,name,title,body,image_url,video_id}&limit=500&access_token=${accessToken}`
  )
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to fetch ads')
  }
  
  const data = await response.json()
  return data.data || []
}

function getAccountStatus(statusCode: number): string {
  const statusMap: Record<number, string> = {
    1: 'active',
    2: 'disabled',
    3: 'unsettled',
    7: 'pending_risk_review',
    8: 'pending_settlement',
    9: 'in_grace_period',
    100: 'pending_closure',
    101: 'closed',
    201: 'any_active',
    202: 'any_closed',
  }
  return statusMap[statusCode] || 'unknown'
}