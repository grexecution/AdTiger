import { prisma } from '../lib/prisma'

async function checkImages() {
  const ads = await prisma.ad.findMany({
    take: 3,
    select: {
      name: true,
      creative: true,
      metadata: true
    }
  })
  
  for (const ad of ads) {
    console.log('\n=== Ad:', ad.name, '===')
    const creative = ad.creative as any
    console.log('Creative image_url:', creative?.image_url || 'None')
    console.log('Creative thumbnail_url:', creative?.thumbnail_url || 'None')
    const metadata = ad.metadata as any
    console.log('Metadata imageUrl:', metadata?.imageUrl || 'None')
    
    // Check if URLs contain size parameters
    const url = creative?.image_url || creative?.thumbnail_url || metadata?.imageUrl
    if (url) {
      console.log('\nFull URL:', url)
      if (url.includes('p64x64') || url.includes('p128x128') || url.includes('p168x128')) {
        console.log('⚠️  URL contains size restriction!')
      }
      if (url.includes('dst-jpg')) {
        console.log('⚠️  URL contains format restriction!')
      }
      if (url.includes('q75') || url.includes('q50')) {
        console.log('⚠️  URL contains quality restriction!')
      }
    }
  }
  
  await prisma.$disconnect()
}

checkImages()