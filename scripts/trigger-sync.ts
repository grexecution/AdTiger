import { prisma } from '../lib/prisma'
import { convertCurrency } from '../lib/currency'

async function syncMeta() {
  console.log('Starting Meta sync with image fetching...')
  
  // Get the connection
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
    console.error('No active Meta connection found')
    return
  }
  
  const credentials = connection.credentials as any
  const accessToken = credentials.accessToken
  // Get the first selected account ID
  const adAccountId = credentials.selectedAccountIds?.[0] || credentials.selectedAccounts?.[0]?.id
  const adAccountExternalId = adAccountId?.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  
  console.log(`Syncing Meta Ad Account: ${adAccountExternalId}`)
  
  // Get account's main currency
  const mainCurrency = connection.account.currency || 'EUR'
  console.log(`Main currency: ${mainCurrency}`)
  
  // Get ad account currency
  let adAccountCurrency = 'USD'
  try {
    const accountResponse = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountExternalId}?` + new URLSearchParams({
        access_token: accessToken,
        fields: 'currency,account_status,name'
      })
    )
    const accountData = await accountResponse.json()
    if (accountData.currency) {
      adAccountCurrency = accountData.currency
      console.log(`Ad account currency: ${adAccountCurrency}`)
    }
  } catch (error) {
    console.error('Error fetching ad account currency:', error)
  }
  
  // Fetch Ads with creative details
  console.log('Fetching ads...')
  const adsUrl = `https://graph.facebook.com/v21.0/${adAccountExternalId}/ads?` + new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,status,adset_id,campaign_id,creative{id,name,title,body,image_url,object_story_spec,asset_feed_spec,instagram_permalink_url,link_url,call_to_action_type,video_id,image_hash,object_story_id,effective_instagram_story_id,effective_object_story_id}',
    limit: '10'
  })
  
  const response = await fetch(adsUrl)
  const data = await response.json()
  
  if (!data.data) {
    console.error('No ads data returned:', data)
    return
  }
  
  console.log(`Found ${data.data.length} ads`)
  
  for (const ad of data.data) {
    if (!ad.creative) {
      console.log(`  Ad ${ad.id} has no creative`)
      continue
    }
    
    console.log(`\nProcessing ad: ${ad.name}`)
    
    let processedCreative = ad.creative
    let allImageUrls: any[] = []
    
    // Check for asset_feed_spec with images
    if (ad.creative?.asset_feed_spec?.images && Array.isArray(ad.creative.asset_feed_spec.images)) {
      const imageHashes = ad.creative.asset_feed_spec.images
        .filter((img: any) => img.hash)
        .map((img: any) => img.hash)
      
      if (imageHashes.length > 0) {
        console.log(`  Found ${imageHashes.length} image hashes in asset_feed_spec`)
        console.log(`  Hashes: ${imageHashes.join(', ')}`)
        
        try {
          // Fetch all images at once
          const imageUrl = `https://graph.facebook.com/v21.0/${adAccountExternalId}/adimages?` + new URLSearchParams({
            access_token: accessToken,
            hashes: JSON.stringify(imageHashes),
            fields: 'hash,url,url_128,permalink_url,width,height,name'
          })
          
          console.log(`  Fetching from: ${imageUrl}`)
          const imageResponse = await fetch(imageUrl)
          const imageData = await imageResponse.json()
          
          console.log(`  Image API response:`, JSON.stringify(imageData, null, 2))
          
          if (imageData.data && Array.isArray(imageData.data)) {
            console.log(`  Got ${imageData.data.length} images from API`)
            
            // Create hash to URL mapping
            const hashToUrl: any = {}
            imageData.data.forEach((img: any) => {
              hashToUrl[img.hash] = {
                url: img.url,
                url_128: img.url_128,
                permalink_url: img.permalink_url,
                width: img.width,
                height: img.height,
                name: img.name
              }
              allImageUrls.push({
                hash: img.hash,
                url: img.url,
                url_128: img.url_128,
                permalink_url: img.permalink_url,
                width: img.width,
                height: img.height
              })
            })
            
            // Update asset_feed_spec images with URLs
            processedCreative.asset_feed_spec.images = processedCreative.asset_feed_spec.images.map((img: any) => ({
              ...img,
              ...hashToUrl[img.hash]
            }))
            
            console.log(`  ✓ Fetched URLs for ${Object.keys(hashToUrl).length} images`)
            console.log(`  First image URL: ${allImageUrls[0]?.url?.substring(0, 80)}...`)
          } else {
            console.log(`  ⚠️ No image data returned from API`)
          }
        } catch (imgError) {
          console.error(`  ✗ Error fetching images:`, imgError)
        }
      }
    }
    
    // Also check for single image_hash
    else if (ad.creative?.image_hash) {
      console.log(`  Found single image_hash: ${ad.creative.image_hash}`)
      try {
        const imageResponse = await fetch(
          `https://graph.facebook.com/v21.0/${adAccountExternalId}/adimages?` + new URLSearchParams({
            access_token: accessToken,
            hashes: JSON.stringify([ad.creative.image_hash]),
            fields: 'hash,url,url_128,permalink_url,width,height,name'
          })
        )
        const imageData = await imageResponse.json()
        if (imageData.data && imageData.data.length > 0) {
          const img = imageData.data[0]
          processedCreative.image_url = img.url
          processedCreative.image_url_128 = img.url_128
          allImageUrls.push({
            hash: img.hash,
            url: img.url,
            url_128: img.url_128,
            permalink_url: img.permalink_url,
            width: img.width,
            height: img.height
          })
          console.log(`  ✓ Fetched single image URL`)
        }
      } catch (imgError) {
        console.log(`  Could not fetch image for hash ${ad.creative.image_hash}`)
      }
    }
    
    // Get the main image URL (first image or existing URL)
    let mainImageUrl = processedCreative.image_url
    if (!mainImageUrl && allImageUrls.length > 0) {
      mainImageUrl = allImageUrls[0].url
    }
    if (!mainImageUrl) {
      mainImageUrl = ad.creative?.image_url || ad.creative?.thumbnail_url
    }
    
    console.log(`  Main image URL: ${mainImageUrl ? mainImageUrl.substring(0, 80) + '...' : 'NONE'}`)
    console.log(`  Total image URLs collected: ${allImageUrls.length}`)
    
    // Update the ad in database
    try {
      // Find the ad group first
      const adGroup = await prisma.adGroup.findFirst({
        where: {
          accountId: connection.accountId,
          provider: 'meta',
          externalId: ad.adset_id
        }
      })
      
      if (adGroup) {
        await prisma.ad.upsert({
          where: {
            accountId_provider_externalId: {
              accountId: connection.accountId,
              provider: "meta",
              externalId: ad.id
            }
          },
          update: {
            name: ad.name,
            status: ad.status?.toLowerCase() || "unknown",
            creative: processedCreative,
            metadata: {
              lastSyncedAt: new Date().toISOString(),
              rawData: ad,
              // Store main image URL and all URLs for easier access
              imageUrl: mainImageUrl,
              allImageUrls: allImageUrls
            }
          },
          create: {
            accountId: connection.accountId,
            adGroupId: adGroup.id,
            provider: "meta",
            externalId: ad.id,
            name: ad.name,
            status: ad.status?.toLowerCase() || "unknown",
            creative: processedCreative,
            metadata: {
              lastSyncedAt: new Date().toISOString(),
              rawData: ad,
              // Store main image URL and all URLs for easier access
              imageUrl: mainImageUrl,
              allImageUrls: allImageUrls
            }
          }
        })
        console.log(`  ✓ Updated ad in database`)
      } else {
        console.log(`  ⚠️ No ad group found for adset_id ${ad.adset_id}`)
      }
    } catch (error) {
      console.error(`  ✗ Error updating ad:`, error)
    }
  }
  
  await prisma.$disconnect()
  console.log('\n✓ Sync complete!')
}

syncMeta().catch(console.error)