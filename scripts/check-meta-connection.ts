import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkConnection() {
  const connections = await prisma.providerConnection.findMany({
    where: { provider: 'meta' },
    select: {
      id: true,
      accountId: true,
      externalAccountId: true,
      isActive: true,
      accessToken: true,
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' }
  })
  
  console.log('Meta Connections:')
  connections.forEach(conn => {
    console.log(`- Account ${conn.externalAccountId}: ${conn.isActive ? 'active' : 'inactive'} (has token: ${!!conn.accessToken})`)
    if (conn.accessToken) {
      // Check if it's the development token or a real one
      const tokenPreview = conn.accessToken.substring(0, 20) + '...'
      console.log(`  Token preview: ${tokenPreview}`)
    }
  })
  
  // Check environment variable
  if (process.env.META_ACCESS_TOKEN) {
    console.log('\n✅ META_ACCESS_TOKEN found in environment')
  }
  
  await prisma.$disconnect()
}

checkConnection().catch(console.error)