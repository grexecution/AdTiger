import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    console.log(`  Downloading from: ${url.substring(0, 100)}...`)
    const response = await fetch(url)
    if (!response.ok) {
      console.log(`  ❌ Failed: ${response.status} ${response.statusText}`)
      return null
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.log(`  ❌ Error downloading: ${error}`)
    return null
  }
}

async function storeImageForAd(adId: string, accountId: string, imageUrl: string): Promise<boolean> {
  try {
    // Download the image
    const imageData = await downloadImage(imageUrl)
    if (!imageData) return false
    
    // Calculate hash for the image
    const hash = crypto.createHash('sha256').update(imageData).digest('hex')
    
    // Detect MIME type from buffer (simple detection)
    let mimeType = 'image/jpeg'
    if (imageData[0] === 0x89 && imageData[1] === 0x50) {
      mimeType = 'image/png'
    } else if (imageData[0] === 0x47 && imageData[1] === 0x49) {
      mimeType = 'image/gif'
    } else if (imageData[0] === 0x52 && imageData[1] === 0x49) {
      mimeType = 'image/webp'
    }
    
    // Check if asset already exists
    const existing = await prisma.assetStorage.findFirst({
      where: {
        accountId,
        entityId: adId,
        assetType: 'main_image'
      }
    })
    
    if (existing) {
      // Update existing asset
      await prisma.assetStorage.update({
        where: { id: existing.id },
        data: {
          data: imageData,
          hash,
          mimeType,
          size: imageData.length,
          changedAt: new Date(),
          changeCount: existing.changeCount + 1
        }
      })
      console.log(`  ✅ Updated existing asset`)
    } else {
      // Create new asset
      await prisma.assetStorage.create({
        data: {
          accountId,
          entityId: adId,
          entityType: 'ad',
          assetType: 'main_image',
          data: imageData,
          hash,
          mimeType,
          size: imageData.length,
          changeCount: 1
        }
      })
      console.log(`  ✅ Created new asset`)
    }
    
    return true
  } catch (error) {
    console.log(`  ❌ Error storing asset: ${error}`)
    return false
  }
}

async function downloadAllAdImages() {
  console.log('Starting image download and storage...\n')
  
  // Get all ads with their creative data
  const ads = await prisma.ad.findMany({
    select: {
      id: true,
      accountId: true,
      name: true,
      creative: true
    }
  })
  
  console.log(`Found ${ads.length} ads to process\n`)
  
  let successCount = 0
  let failCount = 0
  
  for (const ad of ads) {
    console.log(`Processing: ${ad.name}`)
    
    if (!ad.creative) {
      console.log(`  ⚠️ No creative data`)
      continue
    }
    
    const creative = ad.creative as any
    
    // Try to get image URL from various sources
    let imageUrl: string | null = null
    
    if (creative.asset_feed_spec?.images?.[0]?.url) {
      imageUrl = creative.asset_feed_spec.images[0].url
    } else if (creative.image_url) {
      imageUrl = creative.image_url
    } else if (creative.object_story_spec?.link_data?.picture) {
      imageUrl = creative.object_story_spec.link_data.picture
    } else if (creative.thumbnail_url) {
      imageUrl = creative.thumbnail_url
    }
    
    if (!imageUrl) {
      console.log(`  ⚠️ No image URL found`)
      continue
    }
    
    // Only process Facebook CDN URLs
    if (!imageUrl.includes('scontent') && !imageUrl.includes('fbcdn')) {
      console.log(`  ⚠️ Not a Facebook CDN URL: ${imageUrl.substring(0, 50)}...`)
      continue
    }
    
    // Download and store the image
    const success = await storeImageForAd(ad.id, ad.accountId, imageUrl)
    
    if (success) {
      successCount++
    } else {
      failCount++
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`\n✅ Complete!`)
  console.log(`  Successfully stored: ${successCount}`)
  console.log(`  Failed: ${failCount}`)
  
  await prisma.$disconnect()
}

downloadAllAdImages().catch(console.error)