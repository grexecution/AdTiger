#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAdsSync() {
  console.log('🔄 Testing ads sync...\n')
  
  try {
    const connection = await prisma.connection.findFirst({
      where: { status: 'active', provider: 'meta' },
      include: { account: true }
    })
    
    if (!connection) {
      console.log('No active connection')
      return
    }
    
    const creds = connection.credentials as any
    const accessToken = creds.accessToken
    const selectedAccount = creds.selectedAccountIds[0]
    const accountId = connection.accountId
    
    console.log('Account ID:', accountId)
    console.log('Selected Meta Account:', selectedAccount)
    
    // Check existing adGroup
    const adGroup = await prisma.adGroup.findFirst({
      where: {
        accountId,
        provider: 'meta'
      }
    })
    
    console.log('\nExisting AdGroup:')
    console.log('  ID:', adGroup?.id)
    console.log('  External ID:', adGroup?.externalId)
    console.log('  Name:', adGroup?.name)
    
    // Fetch ads from Meta
    console.log('\n📡 Fetching ads from Meta...')
    const url = `https://graph.facebook.com/v21.0/${selectedAccount}/ads?access_token=${accessToken}&fields=id,name,status,adset_id,campaign_id,creative&limit=100`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.error) {
      console.error('❌ Error:', data.error)
      return
    }
    
    console.log(`✅ Found ${data.data?.length || 0} ads from Meta`)
    
    if (data.data && data.data.length > 0) {
      console.log('\n🔍 Processing ads:')
      
      for (const ad of data.data) {
        console.log(`\n  Ad: ${ad.name} (${ad.id})`)
        console.log(`    AdSet ID: ${ad.adset_id}`)
        console.log(`    Status: ${ad.status}`)
        
        // Try to find the adGroup for this ad
        const matchingAdGroup = await prisma.adGroup.findFirst({
          where: {
            accountId,
            provider: 'meta',
            externalId: ad.adset_id
          }
        })
        
        if (matchingAdGroup) {
          console.log(`    ✅ Found matching AdGroup: ${matchingAdGroup.name}`)
          
          // Try to upsert the ad
          try {
            const savedAd = await prisma.ad.upsert({
              where: {
                accountId_provider_externalId: {
                  accountId,
                  provider: 'meta',
                  externalId: ad.id
                }
              },
              update: {
                name: ad.name,
                status: ad.status?.toLowerCase() || 'unknown',
                creative: ad.creative,
                metadata: {
                  lastSyncedAt: new Date().toISOString(),
                  rawData: ad
                }
              },
              create: {
                accountId,
                adGroupId: matchingAdGroup.id,
                provider: 'meta',
                externalId: ad.id,
                name: ad.name,
                status: ad.status?.toLowerCase() || 'unknown',
                creative: ad.creative,
                metadata: {
                  lastSyncedAt: new Date().toISOString(),
                  rawData: ad
                }
              }
            })
            console.log(`    ✅ Saved ad to database`)
          } catch (saveError) {
            console.error(`    ❌ Error saving ad:`, saveError)
          }
        } else {
          console.log(`    ❌ No matching AdGroup found for adset_id: ${ad.adset_id}`)
          
          // Check what adGroups exist
          const allAdGroups = await prisma.adGroup.findMany({
            where: { accountId },
            select: { externalId: true, name: true }
          })
          console.log(`    Available AdGroups:`, allAdGroups.map(g => `${g.name} (${g.externalId})`).join(', '))
        }
      }
    }
    
    // Final count
    const totalAds = await prisma.ad.count({ where: { accountId } })
    console.log(`\n📊 Total ads in database: ${totalAds}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testAdsSync()
  .catch((e) => {
    console.error('❌ Script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })