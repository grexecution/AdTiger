import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkProviderConnections() {
  const providerConnections = await prisma.providerConnection.findMany({
    select: {
      id: true,
      provider: true,
      externalAccountId: true,
      status: true,
      isActive: true,
      lastSyncAt: true,
      metadata: true,
      createdAt: true
    }
  })
  
  console.log(`Found ${providerConnections.length} provider connections:\n`)
  
  providerConnections.forEach((conn: any) => {
    const meta = conn.metadata as any
    console.log('Provider Connection:', conn.provider)
    console.log('  ID:', conn.id)
    console.log('  External Account:', conn.externalAccountId)
    console.log('  Status:', conn.status)
    console.log('  Is Active:', conn.isActive)
    console.log('  Has Access Token:', !!meta?.accessToken)
    console.log('  Enabled Accounts:', meta?.enabledAccounts || [])
    
    if (conn.lastSyncAt) {
      console.log('  Last Sync:', new Date(conn.lastSyncAt).toLocaleString())
    }
    console.log('---')
  })
  
  await prisma.$disconnect()
}

checkProviderConnections().catch(console.error)