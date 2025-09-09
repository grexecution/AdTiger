import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper function to download and store image assets
async function downloadAndStoreImage(
  accountId: string,
  entityId: string,
  imageUrl: string,
  assetType: string = 'creative'
): Promise<void> {
  try {
    // Skip if URL is empty or invalid
    if (!imageUrl || !imageUrl.startsWith('http')) {
      console.log(`Skipping invalid URL: ${imageUrl}`)
      return
    }

    console.log(`Downloading image from: ${imageUrl.substring(0, 100)}...`)

    // Download the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.warn(`Failed to download image: ${response.status} ${response.statusText}`)
      return
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()
    const data = Buffer.from(buffer)

    console.log(`Downloaded ${data.length} bytes (${contentType})`)

    // Calculate hash for the image
    const crypto = await import('crypto')
    const hash = crypto.createHash('md5').update(data).digest('hex')
    
    // Store or update the asset
    await prisma.assetStorage.upsert({
      where: {
        accountId_provider_entityId_assetType_hash: {
          accountId,
          provider: 'meta',
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
        provider: 'meta',
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

    console.log(`✅ Stored image for ${entityId} (${data.length} bytes)`)
  } catch (error) {
    console.error(`❌ Failed to download/store image:`, error)
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

async function testImageDownload() {
  // Get a few ads to test with
  const ads = await prisma.ad.findMany({
    where: {
      creative: {
        not: null
      }
    },
    take: 3
  })
  
  console.log(`\nTesting image download for ${ads.length} ads:\n`)
  
  for (const ad of ads) {
    console.log(`\nAd: ${ad.name}`)
    console.log(`ID: ${ad.id}`)
    
    const creative = ad.creative as any
    const imageUrl = getBestImageUrl(creative)
    
    if (imageUrl) {
      console.log(`Image URL: ${imageUrl.substring(0, 100)}...`)
      await downloadAndStoreImage(ad.accountId, ad.id, imageUrl, 'creative')
      
      // Also handle video thumbnails
      if (creative?.video_id || creative?.object_story_spec?.video_data) {
        const videoThumbUrl = creative.object_story_spec?.video_data?.image_url ||
                             creative.thumbnail_url
        if (videoThumbUrl && videoThumbUrl !== imageUrl) {
          console.log(`Video thumbnail: ${videoThumbUrl.substring(0, 100)}...`)
          await downloadAndStoreImage(ad.accountId, ad.id, videoThumbUrl, 'video_thumbnail')
        }
      }
    } else {
      console.log('❌ No image URL found')
    }
  }
  
  // Check stored assets
  console.log('\n\nChecking stored assets:')
  const storedAssets = await prisma.assetStorage.findMany({
    select: {
      entityId: true,
      assetType: true,
      size: true,
      mimeType: true,
      createdAt: true
    }
  })
  
  console.log(`\nTotal stored assets: ${storedAssets.length}`)
  for (const asset of storedAssets) {
    const ad = await prisma.ad.findUnique({ where: { id: asset.entityId } })
    console.log(`- ${ad?.name || 'Unknown'}: ${asset.size} bytes (${asset.assetType})`)
  }
  
  await prisma.$disconnect()
}

testImageDownload().catch(console.error)