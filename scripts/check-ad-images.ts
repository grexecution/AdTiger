import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAds() {
  const ads = await prisma.ad.findMany({
    take: 5,
    select: {
      id: true,
      name: true,
      creative: true,
      metadata: true
    }
  })
  
  for (const ad of ads) {
    console.log('\n=== AD:', ad.name, '===')
    console.log('Creative keys:', ad.creative ? Object.keys(ad.creative) : 'null')
    
    if (ad.creative) {
      const creative = ad.creative as any
      
      // Check for images
      if (creative.image_url) console.log('image_url:', creative.image_url)
      if (creative.thumbnail_url) console.log('thumbnail_url:', creative.thumbnail_url)
      if (creative.asset_feed_spec?.images) {
        console.log('asset_feed_spec.images count:', creative.asset_feed_spec.images.length)
        console.log('First image:', creative.asset_feed_spec.images[0])
      }
      if (creative.object_story_spec?.link_data?.picture) {
        console.log('object_story_spec.link_data.picture:', creative.object_story_spec.link_data.picture)
      }
      if (creative.object_story_spec?.link_data?.child_attachments) {
        console.log('child_attachments count:', creative.object_story_spec.link_data.child_attachments.length)
      }
      
      // Check format
      console.log('Format detection:')
      console.log('- Has video_id:', !!creative.video_id)
      console.log('- Has asset_feed_spec:', !!creative.asset_feed_spec)
      console.log('- Images count:', creative.asset_feed_spec?.images?.length || 0)
      console.log('- Titles count:', creative.asset_feed_spec?.titles?.length || 0)
      console.log('- Bodies count:', creative.asset_feed_spec?.bodies?.length || 0)
      console.log('- Links count:', creative.asset_feed_spec?.link_urls?.length || 0)
      
      // Check if wrongly detected as carousel
      const hasMultipleImages = (creative.asset_feed_spec?.images?.length || 0) > 1
      const hasMultipleTitles = (creative.asset_feed_spec?.titles?.length || 0) > 1
      const hasMultipleBodies = (creative.asset_feed_spec?.bodies?.length || 0) > 1
      const hasMultipleLinks = (creative.asset_feed_spec?.link_urls?.length || 0) > 1
      
      console.log('Carousel detection:')
      console.log('- Multiple images:', hasMultipleImages)
      console.log('- Multiple titles:', hasMultipleTitles)
      console.log('- Multiple bodies:', hasMultipleBodies)
      console.log('- Multiple links:', hasMultipleLinks)
      console.log('- Should be carousel?:', hasMultipleImages && (hasMultipleTitles || hasMultipleBodies || hasMultipleLinks))
    }
  }
  
  await prisma.$disconnect()
}

checkAds().catch(console.error)