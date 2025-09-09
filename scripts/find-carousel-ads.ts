import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findCarouselAds() {
  const carouselAds = await prisma.ad.findMany({
    where: {
      creative: {
        path: ['object_story_spec', 'link_data', 'child_attachments'],
        not: null
      }
    },
    select: {
      id: true,
      name: true
    }
  })
  
  console.log('Carousel Ads:')
  carouselAds.forEach(ad => {
    console.log(`${ad.id}: ${ad.name}`)
  })
  
  await prisma.$disconnect()
}

findCarouselAds().catch(console.error)