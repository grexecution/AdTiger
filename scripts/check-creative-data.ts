import { prisma } from '../lib/prisma'

async function checkCreativeData() {
  const ads = await prisma.ad.findMany({
    take: 2,
    select: {
      name: true,
      creative: true,
      metadata: true
    }
  })
  
  for (const ad of ads) {
    console.log('\n=====================================')
    console.log('Ad:', ad.name)
    console.log('=====================================')
    
    const creative = ad.creative as any
    const metadata = ad.metadata as any
    
    console.log('\nCreative object:')
    console.log(JSON.stringify(creative, null, 2))
    
    if (metadata?.rawData?.creative) {
      console.log('\nRaw creative from Meta:')
      console.log(JSON.stringify(metadata.rawData.creative, null, 2))
    }
    
    // Check what type of creative this is
    if (creative?.object_story_spec) {
      console.log('\n✓ Has object_story_spec')
    }
    if (creative?.asset_feed_spec) {
      console.log('\n✓ Has asset_feed_spec')
      if (creative.asset_feed_spec.images) {
        console.log(`  - ${creative.asset_feed_spec.images.length} images in feed`)
      }
    }
    if (creative?.image_hash) {
      console.log('\n✓ Has image_hash:', creative.image_hash)
    }
    if (creative?.video_id) {
      console.log('\n✓ Has video_id:', creative.video_id)
    }
  }
  
  await prisma.$disconnect()
}

checkCreativeData()