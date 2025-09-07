#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { MetaAdsApi, FacebookAdsApi, AdAccount } from 'facebook-nodejs-business-sdk'

const prisma = new PrismaClient()

async function runSync() {
  try {
    console.log('🔄 Starting sync to fetch placement data...\n')
    
    // Get the Meta connection
    const connection = await prisma.connection.findFirst({
      where: { 
        provider: 'meta',
        status: 'active'
      }
    })
    
    if (!connection) {
      console.log('No active Meta connection found')
      return
    }
    
    console.log(`Found connection: ${connection.id}`)
    
    const credentials = connection.credentials as any
    const accessToken = credentials.accessToken
    
    if (!accessToken) {
      console.log('No access token found')
      return
    }
    
    // Initialize Facebook API
    FacebookAdsApi.init(accessToken)
    const api = FacebookAdsApi.init(accessToken)
    
    // Get ad accounts
    const adAccounts = await prisma.adAccount.findMany({
      where: {
        accountId: connection.accountId,
        provider: 'meta',
        status: 'active'
      }
    })
    
    console.log(`Found ${adAccounts.length} ad accounts to sync\n`)
    
    for (const adAccountRecord of adAccounts) {
      console.log(`\n📊 Syncing account: ${adAccountRecord.name} (${adAccountRecord.externalId})`)
      
      const adAccount = new AdAccount(adAccountRecord.externalId)
      
      // Fetch adsets with targeting data
      console.log('  Fetching ad sets with placement data...')
      const adsets = await adAccount.getAdSets([
        'id',
        'name',
        'status',
        'targeting',
        'promoted_object',
        'daily_budget',
        'lifetime_budget',
        'budget_remaining',
        'created_time',
        'updated_time'
      ])
      
      console.log(`  Found ${adsets.length} ad sets`)
      
      for (const adset of adsets) {
        const adsetData = adset._data
        const targeting = adsetData.targeting || {}
        
        // Extract placement data
        const placementData = {
          publisher_platforms: targeting.publisher_platforms || [],
          facebook_positions: targeting.facebook_positions || [],
          instagram_positions: targeting.instagram_positions || [],
          messenger_positions: targeting.messenger_positions || [],
          audience_network_positions: targeting.audience_network_positions || []
        }
        
        // Update the ad group with placement data
        await prisma.adGroup.updateMany({
          where: {
            externalId: adsetData.id,
            accountId: connection.accountId
          },
          data: {
            metadata: {
              ...(await prisma.adGroup.findFirst({
                where: { externalId: adsetData.id, accountId: connection.accountId },
                select: { metadata: true }
              }))?.metadata as any || {},
              placementData,
              rawData: adsetData
            }
          }
        })
        
        console.log(`    ✅ Updated ${adsetData.name}`)
        
        // Show placements
        if (placementData.publisher_platforms.length > 0) {
          console.log(`       Platforms: ${placementData.publisher_platforms.join(', ')}`)
          
          if (placementData.facebook_positions.length > 0) {
            console.log(`       Facebook: ${placementData.facebook_positions.join(', ')}`)
          }
          if (placementData.instagram_positions.length > 0) {
            console.log(`       Instagram: ${placementData.instagram_positions.join(', ')}`)
          }
          if (placementData.messenger_positions.length > 0) {
            console.log(`       Messenger: ${placementData.messenger_positions.join(', ')}`)
          }
        }
      }
    }
    
    console.log('\n✅ Sync complete! Placement data has been updated.')
    
  } catch (error) {
    console.error('Error during sync:', error)
  } finally {
    await prisma.$disconnect()
  }
}

runSync()