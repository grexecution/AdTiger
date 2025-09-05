import { PrismaClient } from '@prisma/client'
import { refreshLongLivedToken } from '@/lib/meta-auth'

const prisma = new PrismaClient()

async function testTokenRefresh() {
  try {
    // Get the Meta connection
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
    
    const credentials = connection.credentials as any
    const metadata = connection.metadata as any
    const currentToken = credentials?.accessToken || metadata?.accessToken
    
    if (!currentToken) {
      console.error('No access token found')
      process.exit(1)
    }
    
    console.log('Current token (first 20 chars):', currentToken.substring(0, 20) + '...')
    console.log('Token expires at:', credentials?.expiresAt || metadata?.expiresAt)
    
    // Try to refresh the token
    console.log('\nAttempting to refresh token...')
    
    try {
      const refreshed = await refreshLongLivedToken(currentToken)
      console.log('Token refresh successful!')
      console.log('New token (first 20 chars):', refreshed.access_token.substring(0, 20) + '...')
      console.log('Expires in:', refreshed.expires_in, 'seconds')
      
      // Update the connection with the new token
      const newExpiresAt = new Date(Date.now() + (refreshed.expires_in || 5184000) * 1000)
      
      await prisma.connection.update({
        where: { id: connection.id },
        data: {
          credentials: {
            ...credentials,
            accessToken: refreshed.access_token,
            expiresAt: newExpiresAt.toISOString()
          },
          metadata: {
            ...metadata,
            accessToken: refreshed.access_token,
            expiresAt: newExpiresAt.toISOString(),
            lastRefreshed: new Date().toISOString()
          }
        }
      })
      
      // Also update ProviderConnection entries
      const selectedAccountIds = credentials?.selectedAccountIds || []
      if (selectedAccountIds.length > 0) {
        await prisma.providerConnection.updateMany({
          where: {
            accountId: connection.accountId,
            provider: 'meta',
            externalAccountId: { in: selectedAccountIds }
          },
          data: {
            accessToken: refreshed.access_token,
            expiresAt: newExpiresAt,
            metadata: {
              ...metadata,
              accessToken: refreshed.access_token,
              expiresAt: newExpiresAt.toISOString(),
              lastRefreshed: new Date().toISOString()
            }
          }
        })
        console.log(`Updated ${selectedAccountIds.length} ProviderConnection entries`)
      }
      
      console.log('\nToken refresh completed successfully!')
    } catch (error: any) {
      console.error('Token refresh failed:', error.message)
      console.error('Response:', error.response?.data || 'No response data')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testTokenRefresh()