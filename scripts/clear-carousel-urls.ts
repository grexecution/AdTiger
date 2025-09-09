import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearCarouselUrls() {
  const carouselAds = await prisma.ad.findMany({
    where: {
      creative: {
        path: ['object_story_spec', 'link_data', 'child_attachments'],
        not: null
      }
    }
  })
  
  console.log(`Found ${carouselAds.length} carousel ads to clear URLs`)
  
  for (const ad of carouselAds) {
    const creative = ad.creative as any
    const attachments = creative?.object_story_spec?.link_data?.child_attachments || []
    
    let cleared = false
    for (const attachment of attachments) {
      if (attachment.image_url || attachment.picture) {
        delete attachment.image_url
        delete attachment.picture
        cleared = true
      }
    }
    
    if (cleared) {
      await prisma.ad.update({
        where: { id: ad.id },
        data: { creative }
      })
      console.log(`Cleared URLs for: ${ad.name}`)
    }
  }
  
  await prisma.$disconnect()
}

clearCarouselUrls().catch(console.error)