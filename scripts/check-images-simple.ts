import { prisma } from '../lib/prisma'

async function checkImages() {
  const ads = await prisma.ad.findMany({
    take: 1,
    select: {
      name: true,
      creative: true,
      metadata: true
    }
  })
  
  const ad = ads[0]
  if (!ad) {
    console.log('No ads found')
    return
  }
  
  console.log('Ad:', ad.name)
  
  const creative = ad.creative as any
  const metadata = ad.metadata as any
  
  // Check for image URLs in asset feed
  if (creative?.asset_feed_spec?.images) {
    console.log('\nAsset feed images:')
    creative.asset_feed_spec.images.forEach((img: any, i: number) => {
      console.log(`Image ${i + 1}:`)
      console.log('  Hash:', img.hash)
      console.log('  URL:', img.url || 'NOT FOUND')
      console.log('  URL_128:', img.url_128 || 'NOT FOUND')
    })
  }
  
  // Check metadata for all image URLs
  console.log('\nMetadata allImageUrls:', metadata?.allImageUrls?.length || 0)
  if (metadata?.allImageUrls) {
    metadata.allImageUrls.forEach((img: any, i: number) => {
      console.log(`  URL ${i + 1}:`, img.url?.substring(0, 50) + '...')
    })
  }
  
  console.log('\nMain imageUrl:', metadata?.imageUrl?.substring(0, 50) + '...' || 'NONE')
  
  await prisma.$disconnect()
}

checkImages()