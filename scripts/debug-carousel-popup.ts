import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugCarouselPopup() {
  // Find the carousel ad
  const ad = await prisma.ad.findFirst({
    where: {
      name: 'Traffic Ad - Schnelligkeit - Beauty - Carousel Ad'
    }
  })
  
  if (!ad) {
    console.log('Carousel ad not found')
    await prisma.$disconnect()
    return
  }
  
  console.log('🎠 Debugging Carousel Ad in Popup')
  console.log('=' .repeat(60))
  console.log(`Ad Name: ${ad.name}`)
  console.log(`Ad ID: ${ad.id}`)
  
  const creative = ad.creative as any
  
  // Check carousel detection
  console.log('\n📊 Carousel Detection:')
  
  // Check for child_attachments (main carousel indicator)
  const hasChildAttachments = creative?.object_story_spec?.link_data?.child_attachments?.length > 0
  console.log(`  Has child_attachments: ${hasChildAttachments}`)
  
  if (hasChildAttachments) {
    const attachments = creative.object_story_spec.link_data.child_attachments
    console.log(`  Number of cards: ${attachments.length}`)
    
    console.log('\n🖼️ Carousel Cards:')
    for (let index = 0; index < attachments.length; index++) {
      const attachment = attachments[index]
      console.log(`\n  Card ${index + 1}:`)
      console.log(`    Title: ${attachment.name || 'N/A'}`)
      console.log(`    Description: ${attachment.description?.substring(0, 50) || 'N/A'}`)
      console.log(`    Link: ${attachment.link || 'N/A'}`)
      console.log(`    Has image_hash: ${!!attachment.image_hash}`)
      console.log(`    Has image_url: ${!!attachment.image_url}`)
      console.log(`    Has picture: ${!!attachment.picture}`)
      
      // Check if asset is stored
      const storedAsset = await prisma.assetStorage.findFirst({
        where: {
          entityId: ad.id,
          assetType: `carousel_image_${index}`
        }
      })
      
      if (storedAsset) {
        console.log(`    ✅ Asset stored: ${storedAsset.size} bytes`)
      } else {
        console.log(`    ❌ No asset stored`)
      }
      
      // What URL would be generated in the component
      const expectedUrl = `/api/assets/${ad.id}?type=carousel_image_${index}`
      console.log(`    Expected URL: ${expectedUrl}`)
    }
  }
  
  // Check for asset_feed_spec (alternative carousel structure)
  const hasAssetFeed = creative?.asset_feed_spec?.images?.length > 1
  console.log(`\n  Has asset_feed_spec images: ${hasAssetFeed}`)
  
  if (hasAssetFeed) {
    const images = creative.asset_feed_spec.images
    const titles = creative.asset_feed_spec.titles || []
    const bodies = creative.asset_feed_spec.bodies || []
    const links = creative.asset_feed_spec.link_urls || []
    
    console.log(`    Images: ${images.length}`)
    console.log(`    Titles: ${titles.length}`)
    console.log(`    Bodies: ${bodies.length}`)
    console.log(`    Links: ${links.length}`)
    
    // Check if it's a true carousel (unique content)
    const hasUniqueTitles = titles.length > 1 && !titles.every((t: any) => t === titles[0])
    const hasUniqueBodies = bodies.length > 1 && !bodies.every((b: any) => b === bodies[0])
    const hasUniqueLinks = links.length > 1 && !links.every((l: any) => l === links[0])
    
    console.log(`    Has unique titles: ${hasUniqueTitles}`)
    console.log(`    Has unique bodies: ${hasUniqueBodies}`)
    console.log(`    Has unique links: ${hasUniqueLinks}`)
    
    const isCarousel = hasUniqueTitles || hasUniqueBodies || hasUniqueLinks
    console.log(`    Is carousel (not placement variations): ${isCarousel}`)
  }
  
  // Test the API endpoints
  console.log('\n🌐 Testing API Endpoints:')
  
  for (let i = 0; i < 4; i++) {
    const url = `http://localhost:3333/api/assets/${ad.id}?type=carousel_image_${i}`
    console.log(`\n  Testing card ${i + 1}: ${url}`)
    
    try {
      const response = await fetch(url)
      console.log(`    Status: ${response.status}`)
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        const contentLength = response.headers.get('content-length')
        console.log(`    ✅ Content-Type: ${contentType}, Size: ${contentLength} bytes`)
      } else {
        const text = await response.text()
        console.log(`    ❌ Error: ${text.substring(0, 100)}`)
      }
    } catch (error) {
      console.log(`    ❌ Fetch error: ${error}`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Debug complete')
  
  await prisma.$disconnect()
}

debugCarouselPopup().catch(console.error)