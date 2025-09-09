import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Helper function to download and store image assets
async function downloadAndStoreImage(
  accountId: string,
  entityId: string,
  imageUrl: string,
  assetType: string = 'creative',
  provider: string = 'meta'
): Promise<boolean> {
  try {
    // Skip if URL is empty or invalid
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return false
    }

    console.log(`  Downloading: ${imageUrl.substring(0, 80)}...`)

    // Download the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.warn(`  ❌ Failed: ${response.status} ${response.statusText}`)
      return false
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()
    const data = Buffer.from(buffer)
    
    // Calculate hash for the image
    const hash = crypto.createHash('md5').update(data).digest('hex')

    // Store or update the asset
    await prisma.assetStorage.upsert({
      where: {
        accountId_provider_entityId_assetType_hash: {
          accountId,
          provider,
          entityId,
          assetType,
          hash
        }
      },
      update: {
        data,
        mimeType: contentType,
        size: data.length,
        originalUrl: imageUrl,
        changedAt: new Date(),
        changeCount: { increment: 1 }
      },
      create: {
        accountId,
        provider,
        entityType: 'ad',
        entityId,
        assetType,
        hash,
        data,
        mimeType: contentType,
        size: data.length,
        originalUrl: imageUrl,
        changeCount: 1
      }
    })

    console.log(`  ✅ Stored: ${assetType} (${data.length} bytes)`)
    return true
  } catch (error) {
    console.error(`  ❌ Error:`, error)
    return false
  }
}

// Helper to extract best image URL from creative
function getBestImageUrl(creative: any): string | null {
  if (!creative) return null
  
  // Priority 1: permalink URLs (stable)
  if (creative.asset_feed_spec?.images?.[0]?.permalink_url) {
    return creative.asset_feed_spec.images[0].permalink_url
  }
  
  // Priority 2: video thumbnails for video ads
  if (creative.object_story_spec?.video_data?.image_url) {
    return creative.object_story_spec.video_data.image_url
  }
  
  // Priority 3: regular image_url
  if (creative.image_url) {
    return creative.image_url
  }
  
  // Priority 4: object_story_spec link_data picture
  if (creative.object_story_spec?.link_data?.picture) {
    return creative.object_story_spec.link_data.picture
  }
  
  // Priority 5: asset_feed_spec URL (might expire)
  if (creative.asset_feed_spec?.images?.[0]?.url) {
    return creative.asset_feed_spec.images[0].url
  }
  
  return null
}

async function downloadAllImages() {
  console.log('🖼️  Downloading images for all ads...\n')
  
  // Get all ads with creative data
  const ads = await prisma.ad.findMany({
    where: {
      creative: {
        not: null
      }
    }
  })
  
  console.log(`Found ${ads.length} ads with creative data\n`)
  
  let totalDownloaded = 0
  let totalFailed = 0
  let totalCarouselImages = 0
  
  for (const ad of ads) {
    console.log(`\n📌 ${ad.name}`)
    const creative = ad.creative as any
    
    // Download main image
    const mainImageUrl = getBestImageUrl(creative)
    if (mainImageUrl) {
      const success = await downloadAndStoreImage(
        ad.accountId,
        ad.id,
        mainImageUrl,
        'creative',
        ad.provider
      )
      if (success) totalDownloaded++
      else totalFailed++
    } else {
      console.log('  ⚠️ No main image URL found')
    }
    
    // Download carousel images if it's a carousel
    if (creative.object_story_spec?.link_data?.child_attachments?.length > 0) {
      console.log(`  🎠 Carousel with ${creative.object_story_spec.link_data.child_attachments.length} cards`)
      
      for (let i = 0; i < creative.object_story_spec.link_data.child_attachments.length; i++) {
        const attachment = creative.object_story_spec.link_data.child_attachments[i]
        const carouselImageUrl = attachment.picture || attachment.image_url
        
        if (carouselImageUrl) {
          const success = await downloadAndStoreImage(
            ad.accountId,
            ad.id,
            carouselImageUrl,
            `carousel_image_${i}`,
            ad.provider
          )
          if (success) {
            totalCarouselImages++
          }
        } else if (attachment.image_hash) {
          console.log(`  ⚠️ Card ${i + 1} has only hash: ${attachment.image_hash}`)
        }
      }
    }
    
    // Download video thumbnail if it's a video
    if (creative.video_id || creative.object_story_spec?.video_data) {
      const videoThumbUrl = creative.object_story_spec?.video_data?.image_url ||
                           creative.thumbnail_url ||
                           creative.asset_feed_spec?.videos?.[0]?.thumbnail_url
      
      if (videoThumbUrl && videoThumbUrl !== mainImageUrl) {
        console.log('  🎬 Video thumbnail found')
        await downloadAndStoreImage(
          ad.accountId,
          ad.id,
          videoThumbUrl,
          'video_thumbnail',
          ad.provider
        )
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('✅ Download Complete!')
  console.log('='.repeat(50))
  console.log(`📊 Summary:`)
  console.log(`  - Total ads processed: ${ads.length}`)
  console.log(`  - Main images downloaded: ${totalDownloaded}`)
  console.log(`  - Carousel images downloaded: ${totalCarouselImages}`)
  console.log(`  - Failed downloads: ${totalFailed}`)
  
  // Check final storage
  const totalAssets = await prisma.assetStorage.count()
  console.log(`  - Total assets in storage: ${totalAssets}`)
  
  await prisma.$disconnect()
}

downloadAllImages().catch(console.error)