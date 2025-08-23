#!/usr/bin/env npx tsx

/**
 * Script to fetch actual ad images from Meta API
 * Meta stores images separately and we need to fetch them using image hashes
 */

import { prisma } from '@/lib/prisma'

async function fetchMetaImages() {
  console.log('🖼️  Fetching Meta ad images...\n')
  
  try {
    // Get active Meta connection
    const connection = await prisma.connection.findFirst({
      where: {
        provider: 'meta',
        status: 'active'
      },
      include: {
        account: true
      }
    })
    
    if (!connection) {
      console.error('❌ No active Meta connection found')
      return
    }
    
    const credentials = connection.credentials as any
    const accessToken = credentials.accessToken
    
    if (!accessToken) {
      console.error('❌ No access token found')
      return
    }
    
    // Get the first selected account ID
    const adAccountId = credentials.selectedAccountIds?.[0] || credentials.selectedAccounts?.[0]?.id
    if (!adAccountId) {
      console.error('❌ No ad account selected')
      return
    }
    
    const adAccountExternalId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    console.log(`📊 Using Meta Ad Account: ${adAccountExternalId}\n`)
    
    // First, get all ads with their creative details
    console.log('🔍 Fetching ads with creative details...')
    const adsUrl = `https://graph.facebook.com/v21.0/${adAccountExternalId}/ads?` + new URLSearchParams({
      access_token: accessToken,
      fields: 'id,name,status,creative{id,name,title,body,image_hash,image_url,thumbnail_url,object_story_spec,asset_feed_spec,video_id,call_to_action_type}',
      limit: '50'
    })
    
    const adsResponse = await fetch(adsUrl)
    const adsData = await adsResponse.json()
    
    if (adsData.error) {
      console.error('❌ Meta API Error:', adsData.error.message)
      return
    }
    
    if (!adsData.data || adsData.data.length === 0) {
      console.log('ℹ️  No ads found')
      return
    }
    
    console.log(`✅ Found ${adsData.data.length} ads\n`)
    
    // Collect all image hashes we need to fetch
    const imageHashes = new Set<string>()
    
    for (const ad of adsData.data) {
      if (ad.creative?.image_hash) {
        imageHashes.add(ad.creative.image_hash)
      }
      
      // Check for asset feed spec images (dynamic creative)
      if (ad.creative?.asset_feed_spec?.images) {
        for (const img of ad.creative.asset_feed_spec.images) {
          if (img.hash) {
            imageHashes.add(img.hash)
          }
        }
      }
    }
    
    console.log(`🔍 Found ${imageHashes.size} unique image hashes to fetch\n`)
    
    if (imageHashes.size > 0) {
      // Fetch all images at once using the adimages endpoint
      console.log('📥 Fetching image URLs from Meta...')
      
      const hashArray = Array.from(imageHashes)
      const imageUrlsMap = new Map<string, any>()
      
      // Meta API limits batch size, so fetch in chunks
      const chunkSize = 50
      for (let i = 0; i < hashArray.length; i += chunkSize) {
        const chunk = hashArray.slice(i, i + chunkSize)
        
        const imageUrl = `https://graph.facebook.com/v21.0/${adAccountExternalId}/adimages?` + new URLSearchParams({
          access_token: accessToken,
          hashes: JSON.stringify(chunk),
          fields: 'hash,url,url_128,permalink_url,width,height,name'
        })
        
        const imageResponse = await fetch(imageUrl)
        const imageData = await imageResponse.json()
        
        if (imageData.data) {
          for (const img of imageData.data) {
            imageUrlsMap.set(img.hash, {
              url: img.url,
              url_128: img.url_128,
              permalink_url: img.permalink_url,
              width: img.width,
              height: img.height,
              name: img.name
            })
          }
          console.log(`  ✅ Fetched ${imageData.data.length} images from chunk ${Math.floor(i/chunkSize) + 1}`)
        }
      }
      
      console.log(`\n✅ Successfully fetched ${imageUrlsMap.size} image URLs\n`)
      
      // Now update ads with the fetched image URLs
      console.log('💾 Updating ads in database with image URLs...\n')
      
      for (const ad of adsData.data) {
        let updatedCreative = { ...ad.creative }
        let hasUpdates = false
        
        // Update single image if present
        if (ad.creative?.image_hash && imageUrlsMap.has(ad.creative.image_hash)) {
          const imageData = imageUrlsMap.get(ad.creative.image_hash)
          updatedCreative = {
            ...updatedCreative,
            image_url: imageData.url,
            image_url_128: imageData.url_128,
            permalink_url: imageData.permalink_url
          }
          hasUpdates = true
        }
        
        // Update asset feed spec images if present
        if (ad.creative?.asset_feed_spec?.images) {
          updatedCreative.asset_feed_spec = {
            ...updatedCreative.asset_feed_spec,
            images: ad.creative.asset_feed_spec.images.map((img: any) => {
              if (img.hash && imageUrlsMap.has(img.hash)) {
                const imageData = imageUrlsMap.get(img.hash)
                return {
                  ...img,
                  url: imageData.url,
                  url_128: imageData.url_128,
                  permalink_url: imageData.permalink_url,
                  width: imageData.width,
                  height: imageData.height
                }
              }
              return img
            })
          }
          hasUpdates = true
        }
        
        if (hasUpdates) {
          // Find the ad in our database
          const existingAd = await prisma.ad.findFirst({
            where: {
              provider: 'meta',
              externalId: ad.id,
              accountId: connection.accountId
            }
          })
          
          if (existingAd) {
            await prisma.ad.update({
              where: { id: existingAd.id },
              data: {
                creative: updatedCreative,
                metadata: {
                  ...(existingAd.metadata as any || {}),
                  lastImageFetch: new Date().toISOString(),
                  hasRealImages: true
                }
              }
            })
            console.log(`  ✅ Updated ad "${ad.name}" with image URLs`)
          } else {
            console.log(`  ⚠️  Ad "${ad.name}" not found in database`)
          }
        }
      }
      
      console.log('\n✅ Image fetch complete!')
      
      // Show summary
      const updatedAds = await prisma.ad.count({
        where: {
          provider: 'meta',
          accountId: connection.accountId,
          metadata: {
            path: '$.hasRealImages',
            equals: true
          }
        }
      })
      
      console.log(`\n📊 Summary:`)
      console.log(`  - Total ads processed: ${adsData.data.length}`)
      console.log(`  - Unique images fetched: ${imageUrlsMap.size}`)
      console.log(`  - Ads with real images in DB: ${updatedAds}`)
      
    } else {
      console.log('ℹ️  No image hashes found in ads')
    }
    
  } catch (error) {
    console.error('❌ Error fetching images:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fetchMetaImages()