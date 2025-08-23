#!/usr/bin/env npx tsx

/**
 * Script to remove Meta connection and all related data
 * This will delete:
 * - All Meta ads
 * - All Meta ad groups
 * - All Meta campaigns
 * - All Meta ad accounts
 * - The Meta connection itself
 */

import { prisma } from '@/lib/prisma'

async function removeMetaConnection() {
  console.log('🗑️  Removing Meta connection and all related data...\n')
  
  try {
    // Get the Meta connection
    const connection = await prisma.connection.findFirst({
      where: {
        provider: 'meta'
      }
    })
    
    if (!connection) {
      console.log('ℹ️  No Meta connection found')
      return
    }
    
    console.log(`Found Meta connection: ${connection.id}`)
    console.log(`Account ID: ${connection.accountId}\n`)
    
    // Start deletion from bottom up (due to foreign key constraints)
    
    // 1. Delete all Meta ads
    console.log('🗑️  Deleting ads...')
    const deletedAds = await prisma.ad.deleteMany({
      where: {
        accountId: connection.accountId,
        provider: 'meta'
      }
    })
    console.log(`  ✅ Deleted ${deletedAds.count} ads`)
    
    // 2. Delete all Meta ad groups
    console.log('🗑️  Deleting ad groups...')
    const deletedAdGroups = await prisma.adGroup.deleteMany({
      where: {
        accountId: connection.accountId,
        provider: 'meta'
      }
    })
    console.log(`  ✅ Deleted ${deletedAdGroups.count} ad groups`)
    
    // 3. Delete all Meta campaigns
    console.log('🗑️  Deleting campaigns...')
    const deletedCampaigns = await prisma.campaign.deleteMany({
      where: {
        accountId: connection.accountId,
        provider: 'meta'
      }
    })
    console.log(`  ✅ Deleted ${deletedCampaigns.count} campaigns`)
    
    // 4. Delete all Meta ad accounts
    console.log('🗑️  Deleting ad accounts...')
    const deletedAdAccounts = await prisma.adAccount.deleteMany({
      where: {
        accountId: connection.accountId,
        provider: 'meta'
      }
    })
    console.log(`  ✅ Deleted ${deletedAdAccounts.count} ad accounts`)
    
    // 5. Delete the connection itself
    console.log('🗑️  Deleting connection...')
    await prisma.connection.delete({
      where: {
        id: connection.id
      }
    })
    console.log(`  ✅ Deleted Meta connection`)
    
    // Verify everything is gone
    console.log('\n📊 Verification:')
    const remainingAds = await prisma.ad.count({
      where: { provider: 'meta', accountId: connection.accountId }
    })
    const remainingAdGroups = await prisma.adGroup.count({
      where: { provider: 'meta', accountId: connection.accountId }
    })
    const remainingCampaigns = await prisma.campaign.count({
      where: { provider: 'meta', accountId: connection.accountId }
    })
    const remainingConnections = await prisma.connection.count({
      where: { provider: 'meta', accountId: connection.accountId }
    })
    
    console.log(`  Remaining Meta ads: ${remainingAds}`)
    console.log(`  Remaining Meta ad groups: ${remainingAdGroups}`)
    console.log(`  Remaining Meta campaigns: ${remainingCampaigns}`)
    console.log(`  Remaining Meta connections: ${remainingConnections}`)
    
    if (remainingAds + remainingAdGroups + remainingCampaigns + remainingConnections === 0) {
      console.log('\n✅ All Meta data successfully removed!')
      console.log('You can now reconnect Meta with a fresh access token.')
    } else {
      console.log('\n⚠️  Some data may still remain. Please check manually.')
    }
    
  } catch (error) {
    console.error('❌ Error removing Meta connection:', error)
  } finally {
    await prisma.$disconnect()
  }
}

removeMetaConnection()