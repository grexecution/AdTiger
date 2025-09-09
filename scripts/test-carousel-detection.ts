import { PrismaClient } from '@prisma/client'
import { getCreativeFormat } from '../lib/utils/creative-utils'

const prisma = new PrismaClient()

async function testCarouselDetection() {
  const ads = await prisma.ad.findMany({
    take: 10,
    select: {
      id: true,
      name: true,
      creative: true
    }
  })
  
  console.log('Testing carousel detection on ads:\n')
  
  for (const ad of ads) {
    const format = getCreativeFormat(ad.creative as any)
    console.log(`Ad: ${ad.name}`)
    console.log(`  Format detected: ${format}`)
    
    if (ad.creative) {
      const creative = ad.creative as any
      
      // Show why it was detected as this format
      if (creative.asset_feed_spec) {
        const imageCount = creative.asset_feed_spec.images?.length || 0
        const titleCount = creative.asset_feed_spec.titles?.length || 0
        const bodyCount = creative.asset_feed_spec.bodies?.length || 0
        const linkCount = creative.asset_feed_spec.link_urls?.length || 0
        
        console.log(`  - Images: ${imageCount}`)
        console.log(`  - Titles: ${titleCount}`)
        console.log(`  - Bodies: ${bodyCount}`)
        console.log(`  - Links: ${linkCount}`)
        
        // Check for unique content
        if (titleCount > 1) {
          const titles = creative.asset_feed_spec.titles
          const uniqueTitles = new Set(titles.map((t: any) => t.text || t))
          console.log(`  - Unique titles: ${uniqueTitles.size}`)
        }
        if (bodyCount > 1) {
          const bodies = creative.asset_feed_spec.bodies
          const uniqueBodies = new Set(bodies.map((b: any) => b.text || b))
          console.log(`  - Unique bodies: ${uniqueBodies.size}`)
        }
        
        // Show first image URL if available
        if (imageCount > 0) {
          const firstImage = creative.asset_feed_spec.images[0]
          console.log(`  - First image URL: ${firstImage.url?.substring(0, 80)}...`)
        }
      }
      
      if (creative.object_story_spec?.link_data?.child_attachments) {
        console.log(`  - Has child_attachments: ${creative.object_story_spec.link_data.child_attachments.length}`)
      }
    }
    console.log()
  }
  
  await prisma.$disconnect()
}

testCarouselDetection().catch(console.error)