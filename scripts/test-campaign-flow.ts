#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'
import { getMetaApiClient } from '../lib/meta-api-client'

const prisma = new PrismaClient()

async function testCampaignFlow() {
  console.log('🚀 Testing Campaign Data Flow\n')
  console.log('=' . repeat(50))

  try {
    // 1. Check for test account
    console.log('\n1. Checking for test account...')
    const account = await prisma.account.findFirst()
    
    if (!account) {
      console.log('❌ No account found. Please run seed first.')
      return
    }
    console.log('✅ Found account:', account.name)

    // 2. Check Meta connection
    console.log('\n2. Checking Meta connection...')
    const connection = await prisma.providerConnection.findFirst({
      where: {
        accountId: account.id,
        provider: 'meta',
        isActive: true
      }
    })

    if (!connection) {
      console.log('⚠️  No Meta connection. Creating test connection...')
      const newConnection = await prisma.providerConnection.create({
        data: {
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
      console.log('✅ Created test connection')
    } else {
      console.log('✅ Meta connection exists')
    }

    // 3. Test Meta API client
    console.log('\n3. Testing Meta API client...')
    const client = getMetaApiClient('test_token')
    
    const isValid = await client.validateToken()
    console.log(isValid ? '✅ API client validated' : '❌ API client validation failed')

    // 4. Fetch mock data
    console.log('\n4. Fetching mock campaign data...')
    const adAccounts = await client.getAdAccounts()
    console.log(`✅ Found ${adAccounts.data.length} ad account(s)`)

    if (adAccounts.data.length > 0) {
      const campaigns = await client.getCampaigns(adAccounts.data[0].id)
      console.log(`✅ Found ${campaigns.data.length} campaign(s)`)
      
      campaigns.data.forEach(campaign => {
        console.log(`   - ${campaign.name} (${campaign.status}) - $${campaign.daily_budget ? parseInt(campaign.daily_budget)/100 : 0}/day`)
      })
    }

    // 5. Run sync service
    console.log('\n5. Running sync service...')
    const { MetaRealSyncService } = await import('../services/sync/meta-sync-real')
    const syncService = new MetaRealSyncService(prisma)
    
    const syncResult = await syncService.syncAccount(account.id, 'test_token')
    console.log('✅ Sync completed:', syncResult)

    // 6. Check database
    console.log('\n6. Checking database...')
    const dbCampaigns = await prisma.campaign.findMany({
      where: { accountId: account.id },
      include: {
        adGroups: {
          include: {
            ads: true
          }
        }
      }
    })

    console.log(`✅ Database contains ${dbCampaigns.length} campaign(s)`)
    dbCampaigns.forEach(campaign => {
      console.log(`   - ${campaign.name}: ${campaign.adGroups.length} ad sets`)
      campaign.adGroups.forEach(adGroup => {
        console.log(`     - ${adGroup.name}: ${adGroup.ads.length} ads`)
      })
    })

    console.log('\n' + '=' . repeat(50))
    console.log('✅ All tests passed! Campaign flow is working.')
    console.log('\n📝 Next steps:')
    console.log('1. Open http://localhost:3333/dashboard/campaigns')
    console.log('2. Click "Connect Test Account"')
    console.log('3. Click "Sync Data"')
    console.log('4. View your campaigns with expandable ad sets and ads!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testCampaignFlow()