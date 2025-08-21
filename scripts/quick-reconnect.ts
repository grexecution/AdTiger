#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'
import { MetaRealSyncService } from '../services/sync/meta-sync-real'

const prisma = new PrismaClient()

async function quickReconnect() {
  console.log('🔄 Quick Reconnect & Sync\n')
  console.log('=' .repeat(50))

  try {
    // 1. Get the account
    const account = await prisma.account.findFirst()
    if (!account) {
      console.log('❌ No account found. Please run seed first.')
      return
    }
    console.log('✅ Found account:', account.name)

    // 2. Ensure Meta connection is active
    console.log('\n📡 Ensuring Meta connection is active...')
    
    // Deactivate any existing connections
    await prisma.providerConnection.updateMany({
      where: {
        accountId: account.id,
        provider: 'meta'
      },
      data: {
        isActive: false
      }
    })

    // Create or update the test connection
    const connection = await prisma.providerConnection.upsert({
      where: {
        accountId_provider_externalAccountId: {
          accountId: account.id,
          provider: 'meta',
          externalAccountId: 'test_account_123'
        }
      },
      update: {
        isActive: true,
        accessToken: 'test_token_' + Date.now(),
        metadata: {
          isTestMode: true,
          connectedAt: new Date().toISOString()
        }
      },
      create: {
        accountId: account.id,
        provider: 'meta',
        externalAccountId: 'test_account_123',
        isActive: true,
        accessToken: 'test_token_' + Date.now(),
        metadata: {
          isTestMode: true,
          connectedAt: new Date().toISOString()
        }
      }
    })
    console.log('✅ Meta connection is active')

    // 3. Run sync
    console.log('\n🔄 Syncing campaign data...')
    const syncService = new MetaRealSyncService(prisma)
    const syncResult = await syncService.syncAccount(account.id, connection.accessToken as string)
    
    console.log('✅ Sync completed:', {
      campaigns: syncResult.campaigns,
      adSets: syncResult.adSets,
      ads: syncResult.ads,
      insights: syncResult.insights
    })

    // 4. Verify data
    console.log('\n📊 Verifying data...')
    const campaigns = await prisma.campaign.count({ where: { accountId: account.id } })
    const adGroups = await prisma.adGroup.count({ where: { accountId: account.id } })
    const ads = await prisma.ad.count({ where: { accountId: account.id } })
    
    console.log(`✅ Database now contains:`)
    console.log(`   - ${campaigns} campaigns`)
    console.log(`   - ${adGroups} ad sets`)
    console.log(`   - ${ads} ads`)

    console.log('\n' + '='.repeat(50))
    console.log('✅ All done! Your campaigns should now be visible.')
    console.log('\n📝 Next steps:')
    console.log('1. Go to http://localhost:3333/dashboard/campaigns')
    console.log('2. You should see your campaigns immediately')
    console.log('3. Click on campaigns to expand and see ad sets/ads')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

quickReconnect()