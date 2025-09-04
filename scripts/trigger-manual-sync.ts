import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function triggerSync() {
  // Get the connection
  const connection = await prisma.connection.findFirst({
    where: {
      provider: 'meta',
      status: 'active'
    }
  })
  
  if (!connection) {
    console.error('No active Meta connection found')
    process.exit(1)
  }
  
  console.log('Found connection:', connection.id)
  console.log('Triggering sync...\n')
  
  // Make request to sync endpoint
  const response = await fetch(`http://localhost:3333/api/connections/${connection.id}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // We need to simulate auth - get a session token
      'Cookie': 'authjs.session-token=dummy-for-local-testing' 
    }
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('Sync failed:', error)
  } else {
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const result = await response.json()
      console.log('Sync triggered successfully:', result)
    } else {
      const text = await response.text()
      console.log('Response:', text.substring(0, 200))
    }
  }
  
  await prisma.$disconnect()
}

triggerSync().catch(console.error)