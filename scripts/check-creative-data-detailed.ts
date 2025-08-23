import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://gregorwallner@localhost:5432/adtiger?schema=public"
    }
  }
})

async function checkCreativeData() {
  console.log('🔍 Checking creative data in database...\n')
  
  try {
    // Get all ads with their creative data
    const ads = await prisma.ad.findMany({
      select: {
        id: true,
        name: true,
        provider: true,
        externalId: true,
        creative: true,
        metadata: true,
        adGroup: {
          select: {
            name: true,
            campaign: {
              select: {
                name: true
              }
            }
          }
        }
      },
      take: 10
    })
    
    console.log(`Found ${ads.length} ads in database\n`)
    
    if (ads.length === 0) {
      console.log('❌ No ads found in database. You need to run a sync first.')
      return
    }
    
    ads.forEach((ad, index) => {
      console.log(`--- Ad ${index + 1} ---`)
      console.log(`Name: ${ad.name}`)
      console.log(`Provider: ${ad.provider}`)
      console.log(`External ID: ${ad.externalId}`)
      console.log(`Campaign: ${ad.adGroup.campaign.name}`)
      console.log(`Ad Group: ${ad.adGroup.name}`)
      console.log(`Creative data:`, JSON.stringify(ad.creative, null, 2))
      console.log(`Metadata:`, JSON.stringify(ad.metadata, null, 2))
      console.log('')
    })
    
    // Check if any ads have image URLs in creative data
    const adsWithImages = ads.filter(ad => {
      const creative = ad.creative as any
      return creative && (
        creative.image_url || 
        creative.permalink_url || 
        creative.thumbnail_url ||
        creative.object_story_spec?.link_data?.image_url
      )
    })
    
    console.log(`📸 Ads with image data: ${adsWithImages.length}`)
    
    if (adsWithImages.length > 0) {
      console.log('\nAds with image URLs:')
      adsWithImages.forEach(ad => {
        const creative = ad.creative as any
        console.log(`- ${ad.name}:`)
        if (creative.image_url) console.log(`  image_url: ${creative.image_url}`)
        if (creative.permalink_url) console.log(`  permalink_url: ${creative.permalink_url}`)
        if (creative.thumbnail_url) console.log(`  thumbnail_url: ${creative.thumbnail_url}`)
        if (creative.object_story_spec?.link_data?.image_url) {
          console.log(`  object_story_spec image_url: ${creative.object_story_spec.link_data.image_url}`)
        }
      })
    }
    
    // Check provider connections
    const connections = await prisma.providerConnection.findMany({
      select: {
        provider: true,
        status: true,
        lastSyncAt: true,
        accessToken: true
      }
    })
    
    console.log(`\n🔌 Provider connections: ${connections.length}`)
    connections.forEach(conn => {
      console.log(`- ${conn.provider}: ${conn.status} (last sync: ${conn.lastSyncAt || 'never'}) ${conn.accessToken ? '✅ has token' : '❌ no token'}`)
    })
    
  } catch (error) {
    console.error('❌ Error checking creative data:', error)
  }
}

checkCreativeData()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })