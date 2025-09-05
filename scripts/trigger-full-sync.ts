import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function triggerFullSync() {
  try {
    // Get Meta connection
    const connection = await prisma.connection.findFirst({
      where: {
        provider: 'meta',
        status: 'active'
      }
    })
    
    if (!connection) {
      console.error('No active Meta connection found')
      return
    }
    
    console.log('Found connection:', connection.id)
    console.log('Triggering full sync...\n')
    
    // Call the sync API
    const response = await fetch(`http://localhost:3333/api/connections/${connection.id}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Sync failed:', error)
      return
    }
    
    const result = await response.json()
    console.log('✅ Sync completed!')
    console.log('Stats:', result.stats)
    
    // Now check data completeness
    console.log('\n📊 Checking data completeness after sync...\n')
    
    const user = await prisma.user.findFirst({})
    
    const campaigns = await prisma.campaign.findMany({
      where: {
        accountId: user?.accountId || undefined
      },
      include: {
        adGroups: {
          include: {
            ads: true
          }
        }
      }
    })
    
    let totalAds = 0
    let adsWithImages = 0
    let adsWithMetrics = 0
    
    for (const campaign of campaigns) {
      for (const adGroup of campaign.adGroups) {
        for (const ad of adGroup.ads) {
          totalAds++
          
          const creative = ad.creative as any
          const metadata = ad.metadata as any
          const insights = metadata?.insights
          
          // Check for images
          const hasImage = creative?.asset_feed_spec?.images?.[0]?.url || 
                         creative?.asset_feed_spec?.images?.[0]?.hash ||
                         creative?.image_url || 
                         creative?.image_hash ||
                         metadata?.imageUrl
          
          if (hasImage) {
            adsWithImages++
          }
          
          // Check for metrics
          if (insights && (insights.impressions > 0 || insights.clicks > 0 || insights.spend > 0)) {
            adsWithMetrics++
          }
        }
      }
    }
    
    console.log('Total ads:', totalAds)
    console.log(`Ads with images: ${adsWithImages} (${Math.round(adsWithImages/totalAds * 100)}%)`)
    console.log(`Ads with metrics: ${adsWithMetrics} (${Math.round(adsWithMetrics/totalAds * 100)}%)`)
    
    if (adsWithImages < totalAds * 0.9) {
      console.log('\n⚠️  Still missing images for some ads')
      console.log('This might be due to:')
      console.log('- Video ads (which don\'t have static images)')
      console.log('- Ads with expired/deleted creatives')
      console.log('- Dynamic ads without fixed images')
    }
    
    if (adsWithMetrics < totalAds * 0.5) {
      console.log('\n⚠️  Many ads still missing metrics')
      console.log('This might be due to:')
      console.log('- Ads that haven\'t run in the last 30 days')
      console.log('- Paused/draft ads with no impressions')
      console.log('- Need to fetch longer date range for historical ads')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

triggerFullSync()