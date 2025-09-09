import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Helper to download and store image
async function downloadAndStoreImage(
  accountId: string,
  entityId: string,
  imageUrl: string,
  assetType: string = 'creative',
  provider: string = 'meta'
): Promise<boolean> {
  try {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return false
    }

    console.log(`    Downloading: ${imageUrl.substring(0, 80)}...`)

    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.warn(`    ❌ Failed: ${response.status}`)
      return false
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()
    const data = Buffer.from(buffer)
    
    const hash = crypto.createHash('md5').update(data).digest('hex')

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

    console.log(`    ✅ Stored (${data.length} bytes)`)
    return true
  } catch (error) {
    console.error(`    ❌ Error:`, error)
    return false
  }
}

async function fetchCarouselImages() {
  console.log('🎠 Fetching carousel images from Facebook API...\n')
  
  // Get a Facebook access token from connections
  const connection = await prisma.providerConnection.findFirst({
    where: {
      provider: 'meta',
      isActive: true,
      accessToken: { not: null }
    }
  })
  
  if (!connection || !connection.accessToken) {
    console.error('❌ No active Meta connection with access token found')
    console.log('\nPlease ensure you have an active Meta connection in Settings > Connections')
    await prisma.$disconnect()
    return
  }
  
  console.log(`✅ Found Meta connection: ${connection.externalAccountId}\n`)
  
  // Find carousel ads with hashes but no stored images
  const carouselAds = await prisma.ad.findMany({
    where: {
      creative: {
        path: ['object_story_spec', 'link_data', 'child_attachments'],
        not: null
      }
    }
  })
  
  console.log(`Found ${carouselAds.length} carousel ads\n`)
  
  let totalFetched = 0
  let totalDownloaded = 0
  
  for (const ad of carouselAds) {
    const creative = ad.creative as any
    const attachments = creative?.object_story_spec?.link_data?.child_attachments || []
    
    if (attachments.length === 0) continue
    
    console.log(`\n📌 ${ad.name}`)
    console.log(`  ${attachments.length} carousel cards`)
    
    // Get the ad account ID from the ad
    const adAccount = await prisma.adAccount.findFirst({
      where: {
        campaigns: {
          some: {
            adGroups: {
              some: {
                ads: {
                  some: {
                    id: ad.id
                  }
                }
              }
            }
          }
        }
      }
    })
    
    if (!adAccount) {
      console.log('  ⚠️ Could not find ad account')
      continue
    }
    
    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i]
      
      // Skip if we already have a URL
      if (attachment.image_url || attachment.picture) {
        console.log(`  Card ${i + 1}: Already has URL`)
        continue
      }
      
      if (!attachment.image_hash) {
        console.log(`  Card ${i + 1}: No hash`)
        continue
      }
      
      console.log(`  Card ${i + 1}: Hash ${attachment.image_hash}`)
      
      // Try to fetch image info from Facebook API using the hash
      try {
        // Method 1: Try using the hash directly as an image ID with the picture endpoint
        // This often works for Facebook image hashes
        const pictureUrl = `https://graph.facebook.com/v21.0/${attachment.image_hash}/picture?width=1200&height=1200&access_token=${connection.accessToken}`
        
        // Test if this URL works by doing a HEAD request
        const testResponse = await fetch(pictureUrl, { method: 'HEAD' })
        
        if (testResponse.ok) {
          console.log(`    ✅ Found via picture endpoint`)
          totalFetched++
          
          // Download and store the image directly from this URL
          const success = await downloadAndStoreImage(
            ad.accountId,
            ad.id,
            pictureUrl,
            `carousel_${i}`,
            ad.provider
          )
          if (success) totalDownloaded++
          
          // Update the creative with the URL for future use
          attachments[i].image_url = pictureUrl
        } else {
          // Method 2: Try adimages endpoint
          // Check if externalId already has 'act_' prefix
          const accountId = adAccount.externalId.startsWith('act_') 
            ? adAccount.externalId 
            : `act_${adAccount.externalId}`
          const url = `https://graph.facebook.com/v21.0/${accountId}/adimages?fields=id,hash,url,permalink_url&hashes=[${JSON.stringify(attachment.image_hash)}]&access_token=${connection.accessToken}`
          const response = await fetch(url)
          
          if (response.ok) {
            const data = await response.json()
            if (data.data && data.data.length > 0) {
              const imageData = data.data[0]
              console.log(`    Found image ID: ${imageData.id}`)
              
              // Use the permalink URL which redirects to a fresh CDN URL
              const permalinkUrl = imageData.permalink_url || imageData.url
              
              if (permalinkUrl) {
                console.log(`    ✅ Found permalink URL`)
                totalFetched++
                
                // Download and store the image using the permalink
                const success = await downloadAndStoreImage(
                  ad.accountId,
                  ad.id,
                  permalinkUrl,
                  `carousel_image_${i}`,
                  ad.provider
                )
                if (success) totalDownloaded++
                
                // Store the CDN URL for faster access (but it will expire)
                attachments[i].image_url = imageData.url
                attachments[i].picture = permalinkUrl
              }
            } else {
              console.log(`    ⚠️ No image data returned from adimages`)
            }
          } else {
            const error = await response.json()
            console.log(`    ❌ API error: ${error.error?.message || response.statusText}`)
          }
        }
      } catch (error) {
        console.log(`    ❌ Error fetching: ${error}`)
      }
    }
    
    // Update the ad with any new URLs we found
    if (totalFetched > 0) {
      await prisma.ad.update({
        where: { id: ad.id },
        data: { creative }
      })
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('✅ Carousel Image Fetch Complete!')
  console.log('='.repeat(50))
  console.log(`📊 Summary:`)
  console.log(`  - Carousel ads processed: ${carouselAds.length}`)
  console.log(`  - Image URLs fetched: ${totalFetched}`)
  console.log(`  - Images downloaded: ${totalDownloaded}`)
  
  await prisma.$disconnect()
}

fetchCarouselImages().catch(console.error)