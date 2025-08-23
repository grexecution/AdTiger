#!/usr/bin/env npx tsx

import { prisma } from '@/lib/prisma'
import { ensureValidMetaToken } from '@/lib/utils/token-refresh'

async function testDirectSync() {
  console.log('🔄 Testing direct sync with token refresh...\n')
  
  try {
    // Get the active Meta connection
    const connection = await prisma.connection.findFirst({
      where: {
        status: 'active',
        provider: 'meta'
      }
    })
    
    if (!connection) {
      console.error('❌ No active Meta connection found')
      return
    }
    
    console.log(`Found connection: ${connection.id}`)
    console.log(`Provider: ${connection.provider}`)
    console.log(`Status: ${connection.status}`)
    
    const metadata = connection.metadata as any
    const credentials = connection.credentials as any
    
    console.log('\nConnection details:')
    console.log(`- Has access token in credentials: ${!!credentials?.accessToken}`)
    console.log(`- Has access token in metadata: ${!!metadata?.accessToken}`)
    
    // Try to get and potentially refresh token
    console.log('\n🔑 Checking and refreshing token if needed...')
    
    try {
      const validToken = await ensureValidMetaToken(connection.id)
      console.log('✅ Got valid token')
      
      // Test the token with a simple API call
      console.log('\n📡 Testing token with Meta API...')
      const testUrl = `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${validToken}`
      const testResponse = await fetch(testUrl)
      
      if (testResponse.ok) {
        const userData = await testResponse.json()
        console.log('✅ Token is valid! User:', userData.name)
        
        // Now test fetching ad accounts
        console.log('\n📊 Fetching ad accounts...')
        const accountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,currency&limit=10&access_token=${validToken}`
        const accountsResponse = await fetch(accountsUrl)
        
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json()
          console.log(`✅ Found ${accountsData.data?.length || 0} ad accounts`)
          
          if (accountsData.data && accountsData.data.length > 0) {
            console.log('\nFirst 3 accounts:')
            accountsData.data.slice(0, 3).forEach((acc: any) => {
              console.log(`  - ${acc.name} (${acc.id}) - ${acc.currency}`)
            })
          }
        } else {
          const error = await accountsResponse.json()
          console.error('❌ Failed to fetch ad accounts:', error.error?.message || 'Unknown error')
        }
        
      } else {
        const error = await testResponse.json()
        console.error('❌ Token is invalid:', error.error?.message || 'Unknown error')
      }
      
    } catch (tokenError) {
      console.error('❌ Token refresh/validation failed:', tokenError)
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDirectSync()