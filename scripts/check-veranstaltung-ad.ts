import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAd() {
  const ad = await prisma.ad.findFirst({
    where: {
      name: {
        contains: 'Veranstaltung: Flo und Wisch'
      }
    }
  })
  
  if (!ad) {
    console.log('Ad not found')
    await prisma.$disconnect()
    return
  }
  
  console.log('Found ad:', ad.name)
  console.log('Ad ID:', ad.id)
  console.log('Has creative:', ad.creative ? 'YES' : 'NO')
  
  if (ad.creative) {
    const creative = ad.creative as any
    console.log('\nCreative structure:')
    console.log('- Has asset_feed_spec:', !!creative.asset_feed_spec)
    console.log('- Has images array:', !!creative.asset_feed_spec?.images)
    console.log('- Number of images:', creative.asset_feed_spec?.images?.length || 0)
    
    if (creative.asset_feed_spec?.images?.length > 0) {
      console.log('\nFirst image:')
      const img = creative.asset_feed_spec.images[0]
      console.log('- Has permalink_url:', !!img.permalink_url)
      console.log('- Has url:', !!img.url)
      console.log('- Has hash:', !!img.hash)
      
      if (img.permalink_url) console.log('- Permalink:', img.permalink_url.substring(0, 100))
      if (img.url) console.log('- URL:', img.url.substring(0, 100))
      if (img.hash) console.log('- Hash:', img.hash)
    }
    
    // Check other possible image locations
    console.log('\nOther image fields:')
    console.log('- creative.image_url:', !!creative.image_url)
    console.log('- creative.image_hash:', !!creative.image_hash)
    console.log('- creative.thumbnail_url:', !!creative.thumbnail_url)
    console.log('- object_story_spec.link_data.picture:', !!creative.object_story_spec?.link_data?.picture)
    
    if (creative.image_url) console.log('  image_url:', creative.image_url.substring(0, 100))
    if (creative.object_story_spec?.link_data?.picture) {
      console.log('  link_data.picture:', creative.object_story_spec.link_data.picture.substring(0, 100))
    }
    
    // Print full creative structure for debugging
    console.log('\nFull creative (first 500 chars):')
    console.log(JSON.stringify(creative, null, 2).substring(0, 500))
  }
  
  await prisma.$disconnect()
}

checkAd().catch(console.error)