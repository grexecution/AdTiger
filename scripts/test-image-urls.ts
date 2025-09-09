import { PrismaClient } from '@prisma/client'
import { getCreativeImageUrl } from '../lib/utils/creative-utils'

const prisma = new PrismaClient()

async function testImageUrls() {
  const ads = await prisma.ad.findMany({
    take: 5,
    select: {
      id: true,
      name: true,
      creative: true
    }
  })
  
  console.log('Testing image URL generation:\n')
  
  for (const ad of ads) {
    const imageUrl = getCreativeImageUrl(ad.creative as any)
    console.log(`Ad: ${ad.name}`)
    console.log(`  Image URL: ${imageUrl}`)
    
    if (imageUrl) {
      // Check if it's a Facebook CDN URL
      if (imageUrl.includes('scontent') && imageUrl.includes('fbcdn.net')) {
        console.log('  ✅ Facebook CDN URL (should work)')
      } else if (imageUrl.includes('graph.facebook.com') && imageUrl.includes('/picture')) {
        console.log('  ✅ Graph API picture endpoint (should work)')
      } else if (imageUrl.includes('/api/assets/')) {
        console.log('  ❌ Asset API URL (will fail - no assets in DB)')
      } else {
        console.log('  ⚠️ Other URL type')
      }
    } else {
      console.log('  ❌ No image URL found')
    }
    console.log()
  }
  
  await prisma.$disconnect()
}

testImageUrls().catch(console.error)