#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testManualSync() {
  console.log('🔄 Testing manual sync functionality...\n')
  
  try {
    // Check for active connection
    const connection = await prisma.connection.findFirst({
      where: {
        status: 'active',
        provider: 'meta'
      },
      include: {
        account: true
      }
    })
    
    if (!connection) {
      console.error('❌ No active Meta connection found')
      console.log('Please ensure you have connected via manual token first.')
      return
    }
    
    console.log('✅ Found active connection:')
    console.log(`  ID: ${connection.id}`)
    console.log(`  Account: ${connection.accountId}`)
    console.log(`  Provider: ${connection.provider}`)
    console.log(`  Status: ${connection.status}`)
    
    const credentials = connection.credentials as any
    const selectedAccounts = credentials?.selectedAccountIds || []
    console.log(`  Selected Accounts: ${selectedAccounts.length}`)
    
    if (selectedAccounts.length === 0) {
      console.log('\n⚠️  No accounts selected for sync')
      return
    }
    
    // Check AdAccount records
    console.log('\n📊 Checking AdAccount records:')
    const adAccounts = await prisma.adAccount.findMany({
      where: {
        accountId: connection.accountId,
        provider: 'meta'
      }
    })
    
    console.log(`  Found ${adAccounts.length} AdAccount records`)
    adAccounts.forEach(acc => {
      console.log(`    - ${acc.name} (${acc.externalId})`)
    })
    
    // Trigger sync via API
    console.log('\n🚀 Triggering sync via API...')
    const response = await fetch(`http://localhost:3333/api/connections/${connection.id}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add a mock session cookie for auth
        'Cookie': 'authjs.session-token=test'
      }
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Sync request failed:', error)
      console.log('\nTrying direct database sync instead...')
      
      // For testing, we can check what data exists
      await checkExistingData(connection.accountId)
      return
    }
    
    const data = await response.json()
    console.log('✅ Sync completed successfully!')
    console.log('📊 Stats:', data.stats)
    
    // Wait a moment for data to be saved
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Check what data we have now
    await checkExistingData(connection.accountId)
    
  } catch (error) {
    console.error('❌ Error during test:', error)
  }
}

async function checkExistingData(accountId: string) {
  console.log('\n📈 Database Summary:')
  
  const campaigns = await prisma.campaign.findMany({
    where: { accountId },
    select: { id: true, name: true, provider: true, externalId: true }
  })
  console.log(`  • Campaigns: ${campaigns.length}`)
  if (campaigns.length > 0 && campaigns.length <= 5) {
    campaigns.forEach(c => console.log(`      - ${c.name} (${c.externalId})`))
  } else if (campaigns.length > 5) {
    campaigns.slice(0, 3).forEach(c => console.log(`      - ${c.name} (${c.externalId})`))
    console.log(`      ... and ${campaigns.length - 3} more`)
  }
  
  const adGroups = await prisma.adGroup.findMany({
    where: { 
      accountId,
      campaign: {
        accountId
      }
    },
    select: { id: true, name: true, campaignId: true }
  })
  console.log(`  • Ad Groups: ${adGroups.length}`)
  if (adGroups.length > 0 && adGroups.length <= 5) {
    adGroups.forEach(g => console.log(`      - ${g.name}`))
  } else if (adGroups.length > 5) {
    adGroups.slice(0, 3).forEach(g => console.log(`      - ${g.name}`))
    console.log(`      ... and ${adGroups.length - 3} more`)
  }
  
  const ads = await prisma.ad.findMany({
    where: { 
      accountId,
      adGroup: {
        campaign: {
          accountId
        }
      }
    },
    select: { id: true, name: true, adGroupId: true }
  })
  console.log(`  • Ads: ${ads.length}`)
  if (ads.length > 0 && ads.length <= 5) {
    ads.forEach(a => console.log(`      - ${a.name}`))
  } else if (ads.length > 5) {
    ads.slice(0, 3).forEach(a => console.log(`      - ${a.name}`))
    console.log(`      ... and ${ads.length - 3} more`)
  }
  
  // Check for any sync history
  const syncHistory = await prisma.syncHistory.findFirst({
    where: { accountId },
    orderBy: { startedAt: 'desc' }
  })
  
  if (syncHistory) {
    console.log('\n📅 Last Sync:')
    console.log(`  Started: ${syncHistory.startedAt}`)
    console.log(`  Status: ${syncHistory.status}`)
    if (syncHistory.errorMessage) {
      console.log(`  Error: ${syncHistory.errorMessage}`)
    }
  }
}

testManualSync()
  .catch((e) => {
    console.error('❌ Script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })