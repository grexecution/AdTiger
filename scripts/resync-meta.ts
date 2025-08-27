import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resyncMeta() {
  try {
    // Get the first Meta connection
    const connection = await prisma.connection.findFirst({
      where: {
        provider: 'meta',
        status: 'active'
      }
    })
    
    if (!connection) {
      console.log('No active Meta connection found')
      return
    }
    
    console.log(`Found Meta connection: ${connection.id}`)
    console.log('Starting sync...')
    
    // Call the sync API
    const response = await fetch(`http://localhost:3333/api/connections/${connection.id}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Sync initiated successfully')
      console.log('Response:', data)
    } else {
      console.error('❌ Sync failed:', data)
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resyncMeta()