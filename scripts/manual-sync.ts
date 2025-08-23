import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function manualSync() {
  console.log('🔄 Starting manual sync...')
  
  try {
    // Get the active connection
    const connection = await prisma.connection.findFirst({
      where: {
        status: 'active',
        provider: 'meta'
      }
    })
    
    if (!connection) {
      console.error('❌ No active Meta connection found')
      return
    }
    
    console.log(`Found connection: ${connection.id}`)
    
    // Trigger sync via API
    const response = await fetch(`http://localhost:3334/api/connections/${connection.id}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Sync completed successfully!')
      console.log('📊 Stats:', data.stats)
    } else {
      console.error('❌ Sync failed:', data)
    }
    
    // Check what data we have now
    const campaigns = await prisma.campaign.count()
    const ads = await prisma.ad.count()
    const adGroups = await prisma.adGroup.count()
    
    console.log('\n📈 Database Summary:')
    console.log(`  • Campaigns: ${campaigns}`)
    console.log(`  • Ad Groups: ${adGroups}`)
    console.log(`  • Ads: ${ads}`)
    
  } catch (error) {
    console.error('❌ Error during sync:', error)
  }
}

manualSync()
  .catch((e) => {
    console.error('❌ Script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })