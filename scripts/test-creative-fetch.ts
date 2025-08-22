#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCreativeFetch() {
  console.log('🔄 Testing creative fetch...\n')
  
  try {
    const connection = await prisma.connection.findFirst({
      where: { status: 'active', provider: 'meta' }
    })
    
    if (!connection) {
      console.log('No active connection')
      return
    }
    
    const creds = connection.credentials as any
    const accessToken = creds.accessToken
    const selectedAccount = creds.selectedAccountIds[0]
    
    console.log('Testing creative fetch for first ad...')
    
    // Get first ad
    const adUrl = `https://graph.facebook.com/v21.0/${selectedAccount}/ads?limit=1&access_token=${accessToken}&fields=id,name,creative{id,name,image_url,thumbnail_url,object_story_spec,effective_object_story_id}`
    
    const response = await fetch(adUrl)
    const data = await response.json()
    
    if (data.error) {
      console.error('Error:', data.error)
      return
    }
    
    if (data.data && data.data[0]) {
      const ad = data.data[0]
      console.log('Ad:', ad.name)
      console.log('Creative:', JSON.stringify(ad.creative, null, 2))
      
      // If we have a creative ID, try to fetch more details
      if (ad.creative?.id) {
        console.log('\nFetching creative details...')
        const creativeUrl = `https://graph.facebook.com/v21.0/${ad.creative.id}?access_token=${accessToken}&fields=id,name,image_url,thumbnail_url,object_story_spec,effective_object_story_id,image_hash`
        
        const creativeResponse = await fetch(creativeUrl)
        const creativeData = await creativeResponse.json()
        
        if (creativeData.error) {
          console.error('Creative fetch error:', creativeData.error)
        } else {
          console.log('Creative details:', JSON.stringify(creativeData, null, 2))
        }
      }
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

testCreativeFetch()
  .catch((e) => {
    console.error('Script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })