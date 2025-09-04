import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateConnections() {
  // Get connection from Connection table
  const connections = await prisma.connection.findMany()
  
  console.log(`Found ${connections.length} connections to migrate\n`)
  
  for (const conn of connections) {
    const creds = conn.credentials as any
    const meta = conn.metadata as any
    
    // Get the selected accounts
    const selectedAccounts = creds?.selectedAccountIds || creds?.selectedAccounts || []
    
    // For each selected account, create a ProviderConnection
    for (const accountId of selectedAccounts) {
      const externalId = typeof accountId === 'string' ? accountId : accountId.id
      
      try {
        const existing = await prisma.providerConnection.findFirst({
          where: {
            accountId: conn.accountId,
            provider: conn.provider,
            externalAccountId: externalId
          }
        })
        
        if (existing) {
          console.log(`ProviderConnection already exists for ${externalId}, updating...`)
          
          await prisma.providerConnection.update({
            where: { id: existing.id },
            data: {
              accessToken: creds?.accessToken || meta?.accessToken,
              expiresAt: creds?.expiresAt ? new Date(creds.expiresAt) : null,
              metadata: {
                ...meta,
                accessToken: creds?.accessToken || meta?.accessToken,
                enabledAccounts: [externalId],
                connectionId: conn.id
              },
              isActive: conn.status === 'active',
              lastSyncAt: meta?.lastSyncAt ? new Date(meta.lastSyncAt) : null,
              status: conn.status === 'active' ? 'CONNECTED' : 'DISCONNECTED'
            }
          })
        } else {
          console.log(`Creating ProviderConnection for ${externalId}`)
          
          await prisma.providerConnection.create({
            data: {
              accountId: conn.accountId,
              provider: conn.provider,
              externalAccountId: externalId,
              accessToken: creds?.accessToken || meta?.accessToken,
              expiresAt: creds?.expiresAt ? new Date(creds.expiresAt) : null,
              metadata: {
                ...meta,
                accessToken: creds?.accessToken || meta?.accessToken,
                enabledAccounts: [externalId],
                connectionId: conn.id
              },
              isActive: conn.status === 'active',
              lastSyncAt: meta?.lastSyncAt ? new Date(meta.lastSyncAt) : null,
              status: conn.status === 'active' ? 'CONNECTED' : 'DISCONNECTED'
            }
          })
        }
      } catch (error) {
        console.error(`Failed to migrate connection for ${externalId}:`, error)
      }
    }
  }
  
  console.log('\nMigration complete!')
  await prisma.$disconnect()
}

migrateConnections().catch(console.error)