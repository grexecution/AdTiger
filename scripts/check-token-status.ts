import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTokens() {
  const providerConnections = await prisma.providerConnection.findMany({
    where: { provider: 'meta', status: 'CONNECTED' },
    select: {
      externalAccountId: true,
      accessToken: true,
      metadata: true
    }
  })
  
  console.log('ProviderConnection token status:')
  providerConnections.forEach((conn: any) => {
    const meta = conn.metadata as any
    console.log(`${conn.externalAccountId}:`)
    console.log(`  Direct accessToken field: ${!!conn.accessToken}`)
    console.log(`  Metadata accessToken: ${!!meta?.accessToken}`)
    if (conn.accessToken) {
      console.log(`  Token preview: ${conn.accessToken.substring(0, 20)}...`)
    }
  })
  
  console.log('\n---\n')
  
  const connections = await prisma.connection.findMany({
    where: { provider: 'meta', status: 'active' },
    select: {
      id: true,
      credentials: true,
      metadata: true
    }
  })
  
  console.log('Connection token status:')
  connections.forEach((conn: any) => {
    const creds = conn.credentials as any
    const meta = conn.metadata as any
    console.log(`Connection ${conn.id}:`)
    console.log(`  Credentials accessToken: ${!!creds?.accessToken}`)
    console.log(`  Metadata accessToken: ${!!meta?.accessToken}`)
    console.log(`  Selected accounts: ${creds?.selectedAccountIds?.length || 0}`)
  })
  
  await prisma.$disconnect()
}

checkTokens().catch(console.error)