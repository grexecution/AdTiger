import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testFix() {
  const ad = await prisma.ad.findFirst({
    where: {
      name: { contains: 'Veranstaltung: Flo und Wisch' }
    }
  })
  
  if (!ad) {
    console.log('Ad not found')
    await prisma.$disconnect()
    return
  }
  
  console.log('Testing fix for:', ad.name)
  const creative = ad.creative as any
  
  // Simulate what the modal's getCreativeImageUrl would now return
  let imageUrl = ''
  
  // Priority 1: permalink URLs
  if (creative?.asset_feed_spec?.images?.[0]?.permalink_url) {
    imageUrl = creative.asset_feed_spec.images[0].permalink_url
    console.log('✅ Using asset_feed_spec permalink')
  }
  // Check for video thumbnail (our new fix)
  else if (creative?.video_id || creative?.object_story_spec?.video_data) {
    if (creative.object_story_spec?.video_data?.image_url) {
      imageUrl = creative.object_story_spec.video_data.image_url
      console.log('✅ Using video_data.image_url (NEW FIX)')
    } else if (creative.object_story_spec?.video_data?.thumbnail_url) {
      imageUrl = creative.object_story_spec.video_data.thumbnail_url
      console.log('✅ Using video_data.thumbnail_url')
    } else if (creative.thumbnail_url) {
      imageUrl = creative.thumbnail_url
      console.log('✅ Using creative.thumbnail_url')
    }
  }
  // Other fallbacks
  else if (creative?.asset_feed_spec?.images?.[0]?.url) {
    imageUrl = creative.asset_feed_spec.images[0].url
    console.log('⚠️ Using asset_feed_spec URL (might expire)')
  }
  
  if (imageUrl) {
    console.log('\n✅ Image URL found:')
    console.log(imageUrl.substring(0, 150) + '...')
    
    // Check if it's a stable permalink
    if (imageUrl.includes('facebook.com/ads/image')) {
      console.log('✅ This is a stable permalink URL!')
    } else if (imageUrl.includes('scontent')) {
      console.log('⚠️ This is a CDN URL that might expire')
    }
  } else {
    console.log('\n❌ No image URL found')
  }
  
  await prisma.$disconnect()
}

testFix().catch(console.error)