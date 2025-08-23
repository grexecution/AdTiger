#!/usr/bin/env npx tsx

import { prisma } from '@/lib/prisma'

async function testManualSync() {
  console.log('🔄 Testing manual sync...\n')
  
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
    console.log(`- Expires at: ${credentials?.expiresAt || metadata?.expiresAt || 'Not set'}`)
    
    // Check if token exists
    const token = credentials?.accessToken || metadata?.accessToken
    if (!token) {
      console.error('❌ No access token found in connection')
      return
    }
    
    console.log('\n✅ Connection has valid structure')
    console.log('\nNow trigger a manual sync via the API...')
    
    // Trigger sync via API (simulating what the UI would do)
    const response = await fetch('http://localhost:3334/api/sync/manual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth cookie if needed
      },
      body: JSON.stringify({
        provider: 'meta'
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Manual sync API failed:', error)
    } else {
      const result = await response.json()
      console.log('✅ Manual sync triggered successfully:', result)
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testManualSync()