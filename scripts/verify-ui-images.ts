import { PrismaClient } from '@prisma/client'
import { getCreativeImageUrl, getAllCreativeImageUrls, getCreativeFormat } from '../lib/utils/creative-utils'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://gregorwallner@localhost:5432/adtiger?schema=public"
    }
  }
})

async function verifyUIImages() {
  console.log('🔍 Verifying real images are available for UI...\n')
  
  try {
    // Get ads with their creative data (same as the API call)
    const ads = await prisma.ad.findMany({
      select: {
        id: true,
        name: true,
        provider: true,
        externalId: true,
        creative: true,
        adGroup: {
          select: {
            name: true,
            campaign: {
              select: {
                name: true
              }
            }
          }
        }
      },
      take: 5
    })
    
    console.log(`📊 Testing ${ads.length} ads from API response:\n`)
    
    ads.forEach((ad, index) => {
      console.log(`--- Ad ${index + 1}: ${ad.name} ---`)
      console.log(`Campaign: ${ad.adGroup.campaign.name}`)
      
      const creative = ad.creative as any
      const mainImageUrl = getCreativeImageUrl(creative)
      const allImageUrls = getAllCreativeImageUrls(creative)
      const format = getCreativeFormat(creative)
      
      console.log(`Format: ${format}`)
      console.log(`Main image URL: ${mainImageUrl ? '✅ FOUND' : '❌ MISSING'}`)
      if (mainImageUrl) {
        console.log(`  ${mainImageUrl.substring(0, 80)}...`)
      }
      
      console.log(`All images: ${allImageUrls.length} found`)
      allImageUrls.forEach((url, i) => {
        console.log(`  ${i + 1}. ${url.substring(0, 80)}...`)
      })
      
      console.log('')
    })
    
    // Summary
    const adsWithImages = ads.filter(ad => getCreativeImageUrl(ad.creative as any))
    console.log(`📸 Summary:`)
    console.log(`- ${adsWithImages.length}/${ads.length} ads have main image URLs`)
    console.log(`- ${ads.filter(ad => getAllCreativeImageUrls(ad.creative as any).length > 1).length} ads have multiple images (carousel)`)
    console.log(`- ${ads.filter(ad => getCreativeFormat(ad.creative as any) === 'carousel').length} ads detected as carousel format`)
    
    if (adsWithImages.length > 0) {
      console.log('\n✅ SUCCESS: Real creative images are available for UI display!')
      console.log('The frontend should now show actual Facebook ad images instead of placeholders.')
    } else {
      console.log('\n❌ ISSUE: No real image URLs found. Check creative data structure.')
    }
    
  } catch (error) {
    console.error('❌ Error verifying images:', error)
  }
}

verifyUIImages()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })