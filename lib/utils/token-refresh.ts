import { prisma } from "@/lib/prisma"
import { refreshLongLivedToken, shouldRefreshToken } from "@/lib/meta-auth"

export async function ensureValidMetaToken(connectionId: string): Promise<string> {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId }
  })
  
  if (!connection) {
    throw new Error("Connection not found")
  }
  
  const credentials = connection.credentials as any
  const metadata = connection.metadata as any
  
  // Get token from credentials or metadata (for compatibility)
  const currentToken = credentials?.accessToken || metadata?.accessToken
  const expiresAt = credentials?.expiresAt || metadata?.expiresAt
  
  if (!currentToken) {
    throw new Error("No access token found in connection")
  }
  
  // Check if token needs refresh
  if (expiresAt && shouldRefreshToken(expiresAt)) {
    console.log("Token expiring soon, attempting to refresh...")
    
    try {
      const refreshedTokenData = await refreshLongLivedToken(currentToken)
      const newToken = refreshedTokenData.access_token
      const newExpiresIn = refreshedTokenData.expires_in || 5184000 // 60 days
      const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000)
      
      // Update connection with new token
      await prisma.connection.update({
        where: { id: connectionId },
        data: {
          credentials: {
            accessToken: newToken,
            expiresAt: newExpiresAt.toISOString(),
          },
          metadata: {
            ...metadata,
            accessToken: newToken,
            expiresAt: newExpiresAt.toISOString(),
            lastRefreshed: new Date().toISOString(),
          }
        }
      })
      
      // Also update ProviderConnection entries with new token
      const selectedAccountIds = credentials?.selectedAccountIds || []
      if (selectedAccountIds.length > 0) {
        await prisma.providerConnection.updateMany({
          where: {
            accountId: connection.accountId,
            provider: 'meta',
            externalAccountId: { in: selectedAccountIds }
          },
          data: {
            accessToken: newToken,
            expiresAt: newExpiresAt,
            metadata: {
              ...metadata,
              accessToken: newToken,
              expiresAt: newExpiresAt.toISOString(),
              lastRefreshed: new Date().toISOString(),
            }
          }
        })
      }
      
      console.log(`Token refreshed successfully, expires in ${newExpiresIn / 86400} days`)
      return newToken
    } catch (error) {
      console.error("Failed to refresh token, using existing token:", error)
      // Return existing token if refresh fails
      return currentToken
    }
  }
  
  return currentToken
}

// Check token validity without refreshing
export async function isMetaTokenValid(token: string): Promise<boolean> {
  try {
    // Make a simple API call to check if token is valid
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id&access_token=${token}`
    )
    return response.ok
  } catch (error) {
    console.error("Error checking token validity:", error)
    return false
  }
}