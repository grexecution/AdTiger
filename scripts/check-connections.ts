import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkConnections() {
  const connections = await prisma.connection.findMany({
    select: {
      id: true,
      provider: true,
      status: true,
      credentials: true,
      metadata: true,
      createdAt: true
    }
  })
  
  console.log(`Found ${connections.length} connections:\n`)
  
  connections.forEach((conn: any) => {
    const creds = conn.credentials as any
    const meta = conn.metadata as any
    console.log('Connection:', conn.provider)
    console.log('  ID:', conn.id)
    console.log('  Provider:', conn.provider)
    console.log('  Status:', conn.status)
    console.log('  Has Access Token:', !!(creds?.accessToken || meta?.accessToken))
    console.log('  Token Type:', creds?.accessToken ? 'OAuth' : meta?.accessToken ? 'Manual' : 'None')
    
    // Check for selected accounts in different formats
    const selectedAccounts = creds?.selectedAccountIds || creds?.selectedAccounts || creds?.accountIds || []
    console.log('  Selected Accounts:', selectedAccounts.length > 0 ? selectedAccounts : 'None')
    
    // Check last sync
    if (meta?.lastSyncAt) {
      console.log('  Last Sync:', new Date(meta.lastSyncAt).toLocaleString())
    }
    console.log('---')
  })
  
  await prisma.$disconnect()
}

checkConnections().catch(console.error)