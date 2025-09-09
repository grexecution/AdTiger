import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testModalImages() {
  const ads = await prisma.ad.findMany({
    take: 3,
    select: {
      id: true,
      name: true,
      creative: true
    }
  })
  
  console.log('Testing modal image URL generation:\n')
  
  for (const ad of ads) {
    console.log(`Ad: ${ad.name}`)
    
    if (!ad.creative) {
      console.log('  ⚠️ No creative data')
      continue
    }
    
    const creative = ad.creative as any
    
    // Test main image URL (what modal uses)
    const mainImage = creative.asset_feed_spec?.images?.[0]
    if (mainImage) {
      console.log('  Main image:')
      console.log(`    permalink_url: ${mainImage.permalink_url ? '✅ Available' : '❌ Missing'}`)
      console.log(`    url: ${mainImage.url ? '✅ Available' : '❌ Missing'}`)
      console.log(`    hash: ${mainImage.hash ? '✅ Available' : '❌ Missing'}`)
      
      // Show what will be used
      const finalUrl = mainImage.permalink_url || mainImage.url || `https://graph.facebook.com/v18.0/${mainImage.hash}/picture`
      console.log(`    Final URL: ${finalUrl.substring(0, 80)}...`)
      
      if (finalUrl.includes('facebook.com/ads/image')) {
        console.log('    ✅ Using stable permalink URL')
      } else if (finalUrl.includes('scontent')) {
        console.log('    ⚠️ Using CDN URL (might expire)')
      }
    } else {
      console.log('  ❌ No images in asset_feed_spec')
    }
    
    console.log()
  }
  
  await prisma.$disconnect()
}

testModalImages().catch(console.error)