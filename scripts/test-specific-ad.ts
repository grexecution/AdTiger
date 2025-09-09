import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Fresh token provided by user
const FRESH_TOKEN = 'EAA1AhiZCl0uYBPflphty7rZA27lnyRrPHkTNPKggFj0iaiXiFNFnaFN6MWu4tTqu5WFgj9tnsZA6A57TWob3oVm93JdpTWFJBBZChgKJQyI01CqSDggZCxC4UgVmf4cdPakHg1MbYfuWiBV6QTamhzLPSC1DXJiePmwwmURFjLee74cVnRJhhcvcrSl6ZCbkLKM60Vi2vUhXW2T6w2esqRSJc1wToz8zPqFpvEdbB1yP8ZD'

async function downloadImage(url: string, description: string): Promise<boolean> {
  try {
    console.log(`\n  Testing ${description}:`)
    console.log(`    URL: ${url.substring(0, 80)}...`)
    
    // Try with token in URL
    const urlWithToken = url.includes('?') 
      ? `${url}&access_token=${FRESH_TOKEN}`
      : `${url}?access_token=${FRESH_TOKEN}`
    
    const response = await fetch(urlWithToken)
    console.log(`    Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const buffer = await response.arrayBuffer()
      const data = Buffer.from(buffer)
      console.log(`    ✅ Downloaded: ${data.length} bytes`)
      console.log(`    Content-Type: ${response.headers.get('content-type')}`)
      return true
    } else {
      const error = await response.text()
      console.log(`    ❌ Error: ${error.substring(0, 200)}`)
      return false
    }
  } catch (error) {
    console.log(`    ❌ Fetch error: ${error}`)
    return false
  }
}

async function testSpecificAd() {
  // Find the specific ad
  const ad = await prisma.ad.findFirst({
    where: {
      name: {
        contains: 'Veranstaltung: Flo und Wisch'
      }
    }
  })
  
  if (!ad) {
    console.log('Ad not found')
    await prisma.$disconnect()
    return
  }
  
  console.log(`\n📌 Found ad: ${ad.name}`)
  console.log(`   ID: ${ad.id}`)
  console.log(`   Status: ${ad.status}`)
  
  const creative = ad.creative as any
  
  // Check what image data exists
  console.log('\n🔍 Analyzing creative data:')
  console.log(`   Has creative: ${!!creative}`)
  
  if (creative) {
    console.log(`   Creative keys: ${Object.keys(creative).join(', ')}`)
    
    // Check different image locations
    const imageLocations = {
      'image_url': creative.image_url,
      'thumbnail_url': creative.thumbnail_url,
      'asset_feed_spec.images[0].url': creative.asset_feed_spec?.images?.[0]?.url,
      'asset_feed_spec.images[0].permalink_url': creative.asset_feed_spec?.images?.[0]?.permalink_url,
      'asset_feed_spec.images[0].hash': creative.asset_feed_spec?.images?.[0]?.hash,
      'object_story_spec.link_data.picture': creative.object_story_spec?.link_data?.picture,
      'object_story_spec.link_data.image_hash': creative.object_story_spec?.link_data?.image_hash,
      'object_story_spec.video_data.image_url': creative.object_story_spec?.video_data?.image_url,
      'image_hash': creative.image_hash
    }
    
    console.log('\n📸 Image URLs/Hashes found:')
    for (const [location, value] of Object.entries(imageLocations)) {
      if (value) {
        console.log(`   ${location}: ${typeof value === 'string' ? value.substring(0, 60) + '...' : value}`)
      }
    }
    
    // Try to download images
    console.log('\n⬇️ Attempting downloads with fresh token:')
    
    // Try different URLs
    if (creative.image_url) {
      await downloadImage(creative.image_url, 'image_url')
    }
    
    if (creative.object_story_spec?.video_data?.image_url) {
      await downloadImage(creative.object_story_spec.video_data.image_url, 'video thumbnail URL')
    }
    
    if (creative.asset_feed_spec?.images?.[0]?.url) {
      await downloadImage(creative.asset_feed_spec.images[0].url, 'asset_feed_spec URL')
    }
    
    if (creative.asset_feed_spec?.images?.[0]?.permalink_url) {
      await downloadImage(creative.asset_feed_spec.images[0].permalink_url, 'permalink_url')
    }
    
    // If we have a hash, try the adimages API
    const imageHash = creative.asset_feed_spec?.images?.[0]?.hash || 
                     creative.image_hash || 
                     creative.object_story_spec?.link_data?.image_hash
    
    if (imageHash) {
      console.log(`\n🔑 Found image hash: ${imageHash}`)
      
      // Get the ad account
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
      
      if (adAccount) {
        const accountId = adAccount.externalId.startsWith('act_') 
          ? adAccount.externalId 
          : `act_${adAccount.externalId}`
        
        console.log(`   Using account: ${accountId}`)
        
        // Try adimages API
        const adimagesUrl = `https://graph.facebook.com/v21.0/${accountId}/adimages?fields=id,hash,url,permalink_url&hashes=["${imageHash}"]&access_token=${FRESH_TOKEN}`
        
        try {
          const response = await fetch(adimagesUrl)
          console.log(`   Adimages API status: ${response.status}`)
          
          if (response.ok) {
            const data = await response.json()
            console.log(`   Response:`, JSON.stringify(data, null, 2))
            
            if (data.data && data.data.length > 0) {
              const imageData = data.data[0]
              if (imageData.permalink_url) {
                await downloadImage(imageData.permalink_url, 'adimages permalink_url')
              }
              if (imageData.url) {
                await downloadImage(imageData.url, 'adimages CDN url')
              }
            }
          } else {
            const error = await response.text()
            console.log(`   ❌ Adimages error: ${error.substring(0, 200)}`)
          }
        } catch (error) {
          console.log(`   ❌ Adimages fetch error: ${error}`)
        }
      }
    }
  }
  
  // Check if image is already stored
  const storedAsset = await prisma.assetStorage.findFirst({
    where: {
      entityId: ad.id,
      assetType: 'creative'
    }
  })
  
  console.log(`\n💾 Storage status:`)
  if (storedAsset) {
    console.log(`   ✅ Image already stored: ${storedAsset.size} bytes`)
    console.log(`   Hash: ${storedAsset.hash}`)
  } else {
    console.log(`   ❌ No image stored for this ad`)
  }
  
  // Test a carousel ad with the fresh token
  console.log('\n\n🎠 Testing carousel ad with fresh token:')
  const carouselAd = await prisma.ad.findFirst({
    where: {
      name: 'Traffic Ad - Schnelligkeit - Beauty - Carousel Ad'
    }
  })
  
  if (carouselAd) {
    const carouselCreative = carouselAd.creative as any
    const firstAttachment = carouselCreative?.object_story_spec?.link_data?.child_attachments?.[0]
    
    if (firstAttachment?.image_hash) {
      console.log(`   Carousel hash: ${firstAttachment.image_hash}`)
      const testUrl = `https://graph.facebook.com/v21.0/2688030298049303:${firstAttachment.image_hash}/picture?width=1200&height=1200`
      await downloadImage(testUrl, 'Carousel card 1 (Graph API picture)')
    }
  }
  
  await prisma.$disconnect()
}

testSpecificAd().catch(console.error)