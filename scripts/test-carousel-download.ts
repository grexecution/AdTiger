import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function testCarouselDownload() {
  // Get a valid access token
  const connection = await prisma.providerConnection.findFirst({
    where: {
      provider: 'meta',
      isActive: true,
      accessToken: { not: null }
    }
  })
  
  if (!connection?.accessToken) {
    console.log('No active Meta connection with token found')
    await prisma.$disconnect()
    return
  }
  
  console.log('Found connection with token')
  
  // Test the specific carousel image URL with auth
  const imageUrl = 'https://graph.facebook.com/v21.0/2688030298049303:0f638292777e6fa4feda6b2373818044/picture?width=1200&height=1200'
  
  console.log('\nTesting carousel image URL:')
  console.log(imageUrl)
  
  // Try with access token appended
  const urlWithToken = `${imageUrl}&access_token=${connection.accessToken}`
  
  console.log('\n1. Testing with access_token parameter...')
  try {
    const response = await fetch(urlWithToken)
    console.log(`   Status: ${response.status} ${response.statusText}`)
    console.log(`   Content-Type: ${response.headers.get('content-type')}`)
    console.log(`   Content-Length: ${response.headers.get('content-length')}`)
    
    if (response.ok) {
      const buffer = await response.arrayBuffer()
      const data = Buffer.from(buffer)
      console.log(`   ✅ Success! Downloaded ${data.length} bytes`)
      
      // Save to file for inspection
      fs.writeFileSync('carousel-test.jpg', data)
      console.log('   Saved as carousel-test.jpg')
      
      // Calculate hash
      const hash = crypto.createHash('md5').update(data).digest('hex')
      console.log(`   MD5 Hash: ${hash}`)
    } else {
      const error = await response.text()
      console.log(`   ❌ Error response: ${error.substring(0, 200)}`)
    }
  } catch (error) {
    console.log(`   ❌ Fetch error: ${error}`)
  }
  
  // Try with Authorization header
  console.log('\n2. Testing with Authorization header...')
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`
      }
    })
    console.log(`   Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const buffer = await response.arrayBuffer()
      console.log(`   ✅ Success! Downloaded ${Buffer.from(buffer).length} bytes`)
    }
  } catch (error) {
    console.log(`   ❌ Fetch error: ${error}`)
  }
  
  // Try the adimages endpoint with the account ID
  const imageHash = '0f638292777e6fa4feda6b2373818044'
  console.log(`\n3. Testing adimages endpoint with hash: ${imageHash}`)
  
  // Get the ad account
  const ad = await prisma.ad.findFirst({
    where: {
      creative: {
        path: ['object_story_spec', 'link_data', 'child_attachments'],
        not: null
      }
    }
  })
  
  const adAccount = await prisma.adAccount.findFirst({
    where: {
      campaigns: {
        some: {
          adGroups: {
            some: {
              ads: {
                some: {
                  id: ad?.id
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
      
    const adimagesUrl = `https://graph.facebook.com/v21.0/${accountId}/adimages?fields=id,hash,url,permalink_url&hashes=[${JSON.stringify(imageHash)}]&access_token=${connection.accessToken}`
    console.log(`   Using account: ${accountId}`)
    
    try {
      const response = await fetch(adimagesUrl)
      console.log(`   Status: ${response.status} ${response.statusText}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`   Response:`, JSON.stringify(data, null, 2))
        
        // If we got data, try to fetch the URL
        if (data.data && data.data.length > 0) {
          const imageData = data.data[0]
          if (imageData.url || imageData.permalink_url) {
            const downloadUrl = imageData.permalink_url || imageData.url
            console.log(`   Found URL: ${downloadUrl}`)
            
            // Try to download
            const imgResponse = await fetch(downloadUrl)
            if (imgResponse.ok) {
              const buffer = await imgResponse.arrayBuffer()
              console.log(`   ✅ Downloaded image: ${Buffer.from(buffer).length} bytes`)
            }
          }
        }
      } else {
        const error = await response.text()
        console.log(`   ❌ Error: ${error.substring(0, 300)}`)
      }
    } catch (error) {
      console.log(`   ❌ Fetch error: ${error}`)
    }
  }
  
  await prisma.$disconnect()
}

testCarouselDownload().catch(console.error)