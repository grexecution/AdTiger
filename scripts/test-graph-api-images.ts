import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testGraphApiImages() {
  const ads = await prisma.ad.findMany({
    take: 5,
    select: {
      id: true,
      name: true,
      creative: true
    }
  })
  
  console.log('Testing Graph API picture endpoint with hashes:\n')
  
  for (const ad of ads) {
    console.log(`Ad: ${ad.name}`)
    
    if (!ad.creative) {
      console.log('  ⚠️ No creative data')
      continue
    }
    
    const creative = ad.creative as any
    
    // Try to get hash
    const imageHash = creative?.asset_feed_spec?.images?.[0]?.hash || 
                     creative?.image_hash ||
                     creative?.object_story_spec?.link_data?.image_hash
    
    if (imageHash) {
      const graphApiUrl = `https://graph.facebook.com/v21.0/${imageHash}/picture?width=1200&height=1200`
      console.log(`  Hash: ${imageHash}`)
      console.log(`  Graph API URL: ${graphApiUrl}`)
      
      // Test if URL works
      try {
        const response = await fetch(graphApiUrl, { method: 'HEAD' })
        if (response.ok) {
          console.log('  ✅ Graph API URL works!')
        } else {
          console.log(`  ❌ Graph API URL failed: ${response.status}`)
        }
      } catch (error) {
        console.log(`  ❌ Error testing URL: ${error}`)
      }
    } else {
      console.log('  ⚠️ No image hash found')
      
      // Show what we have instead
      if (creative.asset_feed_spec?.images?.[0]) {
        console.log(`  Has image URL: ${creative.asset_feed_spec.images[0].url?.substring(0, 50)}...`)
      }
    }
    console.log()
  }
  
  await prisma.$disconnect()
}

testGraphApiImages().catch(console.error)