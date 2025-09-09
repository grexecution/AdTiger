import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Fresh token from user
const FRESH_TOKEN = 'EAA1AhiZCl0uYBPflphty7rZA27lnyRrPHkTNPKggFj0iaiXiFNFnaFN6MWu4tTqu5WFgj9tnsZA6A57TWob3oVm93JdpTWFJBBZChgKJQyI01CqSDggZCxC4UgVmf4cdPakHg1MbYfuWiBV6QTamhzLPSC1DXJiePmwwmURFjLee74cVnRJhhcvcrSl6ZCbkLKM60Vi2vUhXW2T6w2esqRSJc1wToz8zPqFpvEdbB1yP8ZD'

async function downloadImage(url: string, description: string): Promise<Buffer | null> {
  try {
    console.log(`  📥 ${description}:`)
    console.log(`     URL: ${url.substring(0, 80)}...`)
    
    // Add token if not already present
    const urlWithToken = url.includes('access_token=') 
      ? url 
      : (url.includes('?') ? `${url}&access_token=${FRESH_TOKEN}` : `${url}?access_token=${FRESH_TOKEN}`)
    
    const response = await fetch(urlWithToken)
    console.log(`     Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const buffer = await response.arrayBuffer()
      const data = Buffer.from(buffer)
      const hash = crypto.createHash('md5').update(data).digest('hex')
      console.log(`     ✅ Downloaded: ${data.length} bytes (hash: ${hash})`)
      return data
    } else {
      const error = await response.text()
      console.log(`     ❌ Error: ${error.substring(0, 100)}`)
      return null
    }
  } catch (error) {
    console.log(`     ❌ Fetch error: ${error}`)
    return null
  }
}

async function storeImage(
  accountId: string,
  entityId: string,
  data: Buffer,
  assetType: string = 'creative',
  provider: string = 'meta'
): Promise<void> {
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
      mimeType: 'image/jpeg',
      size: data.length,
      originalUrl: '',
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
      mimeType: 'image/jpeg',
      size: data.length,
      originalUrl: '',
      changeCount: 1
    }
  })
  
  console.log(`     💾 Stored to database`)
}

async function testAllImages() {
  console.log('🔍 Comprehensive Image Test with Fresh Token\n')
  console.log('=' .repeat(60) + '\n')
  
  // Test 1: Video Ad - Flo und Wisch
  console.log('1️⃣ VIDEO AD TEST: Flo und Wisch\n')
  const floWischAd = await prisma.ad.findFirst({
    where: {
      name: { contains: 'Flo und Wisch' }
    }
  })
  
  if (floWischAd) {
    console.log(`Found ad: ${floWischAd.name}`)
    const creative = floWischAd.creative as any
    
    // Check existing storage
    const existing = await prisma.assetStorage.findFirst({
      where: {
        entityId: floWischAd.id,
        assetType: 'creative'
      }
    })
    
    if (existing) {
      console.log(`  📦 Already stored: ${existing.size} bytes`)
    }
    
    // Try to download video thumbnail
    const videoUrl = creative?.object_story_spec?.video_data?.image_url
    if (videoUrl) {
      const data = await downloadImage(videoUrl, 'Video thumbnail')
      if (data && !existing) {
        await storeImage(floWischAd.accountId, floWischAd.id, data)
      }
    }
    
    // Also try image_url if present
    if (creative?.image_url) {
      const data = await downloadImage(creative.image_url, 'Creative image_url')
      if (data && !existing) {
        await storeImage(floWischAd.accountId, floWischAd.id, data)
      }
    }
  }
  
  console.log('\n' + '-'.repeat(60) + '\n')
  
  // Test 2: Carousel Ad
  console.log('2️⃣ CAROUSEL AD TEST: Traffic Ad - Beauty\n')
  const carouselAd = await prisma.ad.findFirst({
    where: {
      name: 'Traffic Ad - Schnelligkeit - Beauty - Carousel Ad'
    }
  })
  
  if (carouselAd) {
    console.log(`Found carousel ad: ${carouselAd.name}`)
    const creative = carouselAd.creative as any
    const attachments = creative?.object_story_spec?.link_data?.child_attachments || []
    
    console.log(`  🎠 ${attachments.length} carousel cards found\n`)
    
    // Get ad account for API calls
    const adAccount = await prisma.adAccount.findFirst({
      where: {
        campaigns: {
          some: {
            adGroups: {
              some: {
                ads: {
                  some: { id: carouselAd.id }
                }
              }
            }
          }
        }
      }
    })
    
    if (adAccount) {
      const accountId = adAccount.externalId.startsWith('act_') 
        ? adAccount.externalId 
        : `act_${adAccount.externalId}`
      
      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i]
        console.log(`  Card ${i + 1}:`)
        
        // Check if already stored
        const existing = await prisma.assetStorage.findFirst({
          where: {
            entityId: carouselAd.id,
            assetType: `carousel_image_${i}`
          }
        })
        
        if (existing) {
          console.log(`     📦 Already stored: ${existing.size} bytes`)
          continue
        }
        
        if (attachment.image_hash) {
          console.log(`     Hash: ${attachment.image_hash}`)
          
          // Method 1: Direct picture endpoint
          const pictureUrl = `https://graph.facebook.com/v21.0/${attachment.image_hash}/picture?width=1200&height=1200`
          const pictureData = await downloadImage(pictureUrl, 'Picture endpoint')
          
          if (pictureData) {
            await storeImage(carouselAd.accountId, carouselAd.id, pictureData, `carousel_image_${i}`)
          } else {
            // Method 2: Adimages API
            console.log(`     Trying adimages API...`)
            const adimagesUrl = `https://graph.facebook.com/v21.0/${accountId}/adimages?fields=id,hash,url,permalink_url&hashes=["${attachment.image_hash}"]&access_token=${FRESH_TOKEN}`
            
            try {
              const response = await fetch(adimagesUrl)
              if (response.ok) {
                const data = await response.json()
                if (data.data?.[0]) {
                  const imageData = data.data[0]
                  console.log(`     Found image ID: ${imageData.id}`)
                  
                  // Try permalink URL first
                  if (imageData.permalink_url) {
                    const imgData = await downloadImage(imageData.permalink_url, 'Permalink URL')
                    if (imgData) {
                      await storeImage(carouselAd.accountId, carouselAd.id, imgData, `carousel_image_${i}`)
                    }
                  } else if (imageData.url) {
                    const imgData = await downloadImage(imageData.url, 'CDN URL')
                    if (imgData) {
                      await storeImage(carouselAd.accountId, carouselAd.id, imgData, `carousel_image_${i}`)
                    }
                  }
                }
              }
            } catch (error) {
              console.log(`     ❌ Adimages API error: ${error}`)
            }
          }
        } else if (attachment.image_url) {
          const data = await downloadImage(attachment.image_url, 'Direct URL')
          if (data) {
            await storeImage(carouselAd.accountId, carouselAd.id, data, `carousel_image_${i}`)
          }
        }
      }
    }
  }
  
  console.log('\n' + '-'.repeat(60) + '\n')
  
  // Test 3: Regular Image Ad
  console.log('3️⃣ REGULAR IMAGE AD TEST\n')
  const regularAd = await prisma.ad.findFirst({
    where: {
      name: { contains: 'Awareness Ad' },
      creative: {
        path: ['image_url'],
        not: null
      }
    }
  })
  
  if (regularAd) {
    console.log(`Found regular ad: ${regularAd.name}`)
    const creative = regularAd.creative as any
    
    // Check existing storage
    const existing = await prisma.assetStorage.findFirst({
      where: {
        entityId: regularAd.id,
        assetType: 'creative'
      }
    })
    
    if (existing) {
      console.log(`  📦 Already stored: ${existing.size} bytes`)
    } else if (creative?.image_url) {
      const data = await downloadImage(creative.image_url, 'Main image')
      if (data) {
        await storeImage(regularAd.accountId, regularAd.id, data)
      }
    }
  }
  
  console.log('\n' + '='.repeat(60) + '\n')
  
  // Summary
  console.log('📊 TEST SUMMARY\n')
  
  const totalStored = await prisma.assetStorage.count()
  const carouselStored = await prisma.assetStorage.count({
    where: {
      assetType: { startsWith: 'carousel_image_' }
    }
  })
  const videoStored = await prisma.assetStorage.count({
    where: {
      entityId: floWischAd?.id
    }
  })
  
  console.log(`  Total images stored: ${totalStored}`)
  console.log(`  Carousel images: ${carouselStored}`)
  console.log(`  Video thumbnails: ${videoStored}`)
  
  // Test the API endpoints
  console.log('\n🌐 TESTING API ENDPOINTS\n')
  
  if (floWischAd) {
    const apiUrl = `http://localhost:3333/api/assets/${floWischAd.id}?type=creative`
    console.log(`  Testing: ${apiUrl}`)
    try {
      const response = await fetch(apiUrl)
      console.log(`  Status: ${response.status} ${response.statusText}`)
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        const contentLength = response.headers.get('content-length')
        console.log(`  ✅ Content-Type: ${contentType}, Size: ${contentLength} bytes`)
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error}`)
    }
  }
  
  if (carouselAd) {
    const apiUrl = `http://localhost:3333/api/assets/${carouselAd.id}?type=carousel_image_0`
    console.log(`\n  Testing: ${apiUrl}`)
    try {
      const response = await fetch(apiUrl)
      console.log(`  Status: ${response.status} ${response.statusText}`)
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        const contentLength = response.headers.get('content-length')
        console.log(`  ✅ Content-Type: ${contentType}, Size: ${contentLength} bytes`)
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error}`)
    }
  }
  
  console.log('\n✅ Test complete!\n')
  
  await prisma.$disconnect()
}

testAllImages().catch(console.error)