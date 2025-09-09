import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCarouselUrls() {
  const carouselAds = await prisma.ad.findMany({
    where: {
      creative: {
        path: ['object_story_spec', 'link_data', 'child_attachments'],
        not: null
      }
    }
  })
  
  for (const ad of carouselAds) {
    console.log(`\n${ad.name}:`)
    const creative = ad.creative as any
    const attachments = creative?.object_story_spec?.link_data?.child_attachments || []
    
    attachments.forEach((att: any, i: number) => {
      console.log(`  Card ${i + 1}:`)
      console.log(`    picture: ${att.picture?.substring(0, 60) || 'none'}`)
      console.log(`    image_url: ${att.image_url?.substring(0, 60) || 'none'}`)
      console.log(`    image_hash: ${att.image_hash || 'none'}`)
    })
  }
  
  await prisma.$disconnect()
}

checkCarouselUrls().catch(console.error)