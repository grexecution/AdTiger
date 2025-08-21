import { PrismaClient } from '@prisma/client'
import GoogleAdsSyncService from '../services/sync/google-sync'

const prisma = new PrismaClient()

async function seedGoogleCampaigns() {
  console.log('🌱 Seeding Google Ads campaigns...')

  try {
    // Get the test account
    const account = await prisma.account.findFirst({
      where: { name: 'Acme Marketing Agency' }
    })

    if (!account) {
      throw new Error('Test account not found. Run the main seed first.')
    }

    console.log('📋 Found account:', account.name)

    // Check if Google connection already exists
    let connection = await prisma.providerConnection.findFirst({
      where: {
        accountId: account.id,
        provider: 'GOOGLE'
      }
    })

    if (!connection) {
      // Create Google connection
      connection = await prisma.providerConnection.create({
        data: {
          accountId: account.id,
          provider: 'GOOGLE',
          externalAccountId: 'test_google_account',
          isActive: true,
          status: 'CONNECTED',
          lastSyncAt: new Date(),
          nextSyncAt: new Date(Date.now() + 60 * 60 * 1000),
          metadata: {
            accountName: 'Demo Google Ads Account',
            customerId: '1234567890',
            currency: 'USD',
            timeZone: 'America/New_York',
            testAccount: true,
            connectedAt: new Date().toISOString(),
            note: 'Test Google Ads connection for demo purposes'
          }
        }
      })
      console.log('✅ Created Google connection')
    } else {
      console.log('✅ Google connection already exists')
    }

    // Check if Google ad account exists
    let adAccount = await prisma.adAccount.findFirst({
      where: {
        accountId: account.id,
        provider: 'google'
      }
    })

    if (!adAccount) {
      // Create Google ad account
      adAccount = await prisma.adAccount.create({
        data: {
          accountId: account.id,
          provider: 'google',
          externalId: 'test_google_ad_account',
          name: 'Demo Google Ads Account',
          currency: 'USD',
          timezone: 'America/New_York',
          status: 'active',
          metadata: {
            customerId: '1234567890',
            testAccount: true
          }
        }
      })
      console.log('✅ Created Google ad account')
    } else {
      console.log('✅ Google ad account already exists')
    }

    // Use the sync service to create campaigns
    const syncService = new GoogleAdsSyncService(prisma)
    
    console.log('🔄 Starting Google campaign sync...')
    const syncResult = await syncService.syncAccount({
      accountId: account.id,
      connectionId: connection.id,
      skipMetrics: false // Include metrics for demo
    })

    if (syncResult.success) {
      console.log('✅ Google sync completed successfully!')
      console.log(`📊 Campaigns synced: ${syncResult.campaignsSynced}`)
      console.log(`📊 Ad groups synced: ${syncResult.adGroupsSynced}`)
      console.log(`📊 Ads synced: ${syncResult.adsSynced}`)
      console.log(`📊 Insights synced: ${syncResult.insightsSynced}`)
      console.log(`⏱️  Duration: ${syncResult.duration}ms`)
    } else {
      console.error('❌ Google sync failed:', syncResult.error)
      throw new Error(syncResult.error)
    }

    // Get final count of Google campaigns
    const googleCampaigns = await prisma.campaign.findMany({
      where: {
        accountId: account.id,
        provider: 'google'
      },
      include: {
        adGroups: {
          include: {
            ads: true
          }
        }
      }
    })

    console.log('📈 Final Google Ads data:')
    googleCampaigns.forEach(campaign => {
      const adGroupCount = campaign.adGroups.length
      const adCount = campaign.adGroups.reduce((sum, ag) => sum + ag.ads.length, 0)
      console.log(`  📋 ${campaign.name}:`)
      console.log(`    - Channel: ${(campaign.metadata as any)?.advertisingChannelType}`)
      console.log(`    - Budget: $${campaign.budgetAmount}`)
      console.log(`    - Ad Groups: ${adGroupCount}`)
      console.log(`    - Ads: ${adCount}`)
    })

    console.log('🎉 Google Ads seeding completed successfully!')

  } catch (error) {
    console.error('❌ Google Ads seeding failed:', error)
    throw error
  }
}

async function main() {
  try {
    await seedGoogleCampaigns()
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()