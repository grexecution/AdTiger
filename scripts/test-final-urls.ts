import { PrismaClient } from '@prisma/client'
import { getCreativeImageUrl } from '../lib/utils/creative-utils'

const prisma = new PrismaClient()

async function testFinalUrls() {
  const ads = await prisma.ad.findMany({
    take: 5,
    select: {
      id: true,
      name: true,
      creative: true
    }
  })
  
  console.log('Testing final image URLs:\n')
  
  for (const ad of ads) {
    const imageUrl = getCreativeImageUrl(ad.creative as any, ad.id)
    console.log(`Ad: ${ad.name}`)
    console.log(`  URL: ${imageUrl?.substring(0, 100)}...`)
    
    if (imageUrl) {
      if (imageUrl.includes('facebook.com/ads/image')) {
        console.log('  ✅ Permalink URL (stable, should work!)')
      } else if (imageUrl.includes('scontent')) {
        console.log('  ⚠️ CDN URL (might have expired tokens)')
      } else if (imageUrl.includes('/api/assets')) {
        console.log('  📦 Asset API URL')
      } else {
        console.log('  ❓ Other URL type')
      }
    }
    console.log()
  }
  
  await prisma.$disconnect()
}

testFinalUrls().catch(console.error)