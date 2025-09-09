import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCarouselImages() {
  // Count carousel images in storage
  const carouselAssets = await prisma.assetStorage.groupBy({
    by: ['assetType'],
    where: {
      assetType: { startsWith: 'carousel_' }
    },
    _count: true
  })
  
  console.log('Carousel images in storage:')
  carouselAssets.forEach(asset => {
    console.log(`  ${asset.assetType}: ${asset._count} images`)
  })
  
  // Check carousel ads
  const carouselAds = await prisma.ad.findMany({
    where: {
      creative: {
        path: ['object_story_spec', 'link_data', 'child_attachments'],
        not: null
      }
    },
    select: {
      id: true,
      name: true,
      creative: true
    }
  })
  
  console.log(`\nCarousel ads: ${carouselAds.length}`)
  
  for (const ad of carouselAds) {
    const creative = ad.creative as any
    const attachments = creative?.object_story_spec?.link_data?.child_attachments || []
    console.log(`\n${ad.name}:`)
    
    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i]
      const hasUrl = !!(attachment.image_url || attachment.picture)
      const hasHash = !!attachment.image_hash
      
      // Check if image is stored
      const stored = await prisma.assetStorage.findFirst({
        where: {
          entityId: ad.id,
          assetType: `carousel_image_${i}`
        },
        select: { id: true, size: true }
      })
      
      console.log(`  Card ${i + 1}: URL:${hasUrl ? '✓' : '✗'} Hash:${hasHash ? '✓' : '✗'} Stored:${stored ? `✓(${stored.size} bytes)` : '✗'}`)
    }
  }
  
  await prisma.$disconnect()
}

checkCarouselImages().catch(console.error)