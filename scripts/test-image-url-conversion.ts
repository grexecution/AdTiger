import { getCreativeImageUrl, getAllCreativeImageUrls } from '@/lib/utils/creative-utils'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testImageUrls() {
  try {
    // Get an ad with images
    const ad = await prisma.ad.findFirst({
      where: { name: 'Mundhygiene' }
    })
    
    if (!ad) {
      console.log('Ad not found')
      return
    }
    
    const creative = ad.creative as any
    
    console.log('Testing image URL extraction...\n')
    
    // Test single image URL
    const imageUrl = getCreativeImageUrl(creative)
    console.log('Main image URL:', imageUrl)
    
    // Test all image URLs
    const allUrls = getAllCreativeImageUrls(creative)
    console.log('\nAll image URLs:')
    allUrls.forEach((url, i) => {
      console.log(`${i + 1}. ${url}`)
    })
    
    // Check if the URL is being proxied
    if (imageUrl?.includes('/api/image-proxy')) {
      console.log('\n✅ Image URL is being proxied for localhost')
    } else if (imageUrl?.includes('graph.facebook.com')) {
      console.log('\n✅ Using Graph API URL')
    } else if (imageUrl?.includes('scontent')) {
      console.log('\n⚠️ Using direct Facebook CDN URL (might get 403)')
    } else {
      console.log('\n❌ No valid image URL found')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testImageUrls()