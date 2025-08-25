import { prisma } from "@/lib/prisma"

export const META_APP_ID = process.env.META_APP_ID!
export const META_APP_SECRET = process.env.META_APP_SECRET!
export const META_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + "/api/meta/oauth/callback"
export const META_API_VERSION = "v18.0"

// Scopes needed for ads management
export const META_SCOPES = [
  "email",
  "public_profile",
  "ads_management",
  "ads_read",
  "business_management",
  "read_insights",
].join(",")

export function getMetaOAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: META_REDIRECT_URI,
    state: state,
    scope: META_SCOPES,
    response_type: "code",
    auth_type: "rerequest", // Force re-auth to ensure we get all permissions
  })
  
  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params.toString()}`
}

export async function exchangeCodeForToken(code: string) {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    redirect_uri: META_REDIRECT_URI,
    code: code,
  })
  
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?${params.toString()}`
  )
  
  if (!response.ok) {
    throw new Error("Failed to exchange code for token")
  }
  
  return response.json()
}

export async function getMetaUserInfo(accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/me?fields=id,name,email&access_token=${accessToken}`
  )
  
  if (!response.ok) {
    throw new Error("Failed to get user info")
  }
  
  return response.json()
}

// Exchange a short-lived token for a long-lived token (60 days)
export async function exchangeForLongLivedToken(accessToken: string) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: accessToken,
  })
  
  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?${params.toString()}`
  )
  
  if (!response.ok) {
    const error = await response.json()
    console.error("Failed to exchange for long-lived token:", error)
    throw new Error("Failed to get long-lived token")
  }
  
  return response.json()
}

// Refresh an existing long-lived token before it expires
export async function refreshLongLivedToken(accessToken: string) {
  // Meta allows refreshing tokens that are at least 24 hours old
  // and will expire within 60 days
  try {
    const refreshedToken = await exchangeForLongLivedToken(accessToken)
    return refreshedToken
  } catch (error) {
    console.error("Failed to refresh token:", error)
    throw error
  }
}

// Check if token needs refresh (within 7 days of expiry)
export function shouldRefreshToken(expiresAt: Date | string): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  const now = new Date()
  const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return daysUntilExpiry <= 7 // Refresh if expiring within 7 days
}

export async function getMetaAdAccounts(accessToken: string) {
  try {
    // First get all ad accounts the user has access to
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/me/adaccounts?fields=id,name,account_id,account_status,currency,timezone_name,business,amount_spent,balance&limit=200&access_token=${accessToken}`
    )
    
    if (!response.ok) {
      const error = await response.json()
      console.error("Meta API Error:", error)
      throw new Error(error.error?.message || "Failed to get ad accounts")
    }
    
    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Error fetching Meta ad accounts:", error)
    throw error
  }
}

export async function saveMetaConnection(
  accountId: string,
  userId: string,
  accessToken: string,
  expiresIn: number
) {
  // Exchange for long-lived token if this is a short-lived token
  let finalToken = accessToken
  let finalExpiresIn = expiresIn
  
  // If token expires in less than 2 days, it's likely a short-lived token
  if (expiresIn < 172800) { // 2 days in seconds
    try {
      console.log("Exchanging short-lived token for long-lived token...")
      const longLivedTokenData = await exchangeForLongLivedToken(accessToken)
      finalToken = longLivedTokenData.access_token
      finalExpiresIn = longLivedTokenData.expires_in || 5184000 // Default to 60 days
      console.log(`Got long-lived token expiring in ${finalExpiresIn / 86400} days`)
    } catch (error) {
      console.error("Failed to exchange for long-lived token, using original:", error)
      // Continue with original token
    }
  }
  
  // Get user info
  const userInfo = await getMetaUserInfo(finalToken)
  
  // Calculate expiry
  const expiresAt = new Date(Date.now() + finalExpiresIn * 1000)
  
  // Check if connection exists
  const existingConnection = await prisma.connection.findFirst({
    where: {
      accountId: accountId,
      provider: "meta",
    },
  })
  
  // Save or update the connection
  const connection = existingConnection
    ? await prisma.connection.update({
        where: { id: existingConnection.id },
        data: {
          status: "active",
          credentials: {
            accessToken: finalToken,
            expiresAt: expiresAt.toISOString(),
          },
          metadata: {
            ...(existingConnection.metadata as any || {}),
            accessToken: finalToken, // Also store in metadata for compatibility
            expiresAt: expiresAt.toISOString(),
            userInfo: {
              id: userInfo.id,
              name: userInfo.name,
              email: userInfo.email,
            },
            lastRefreshed: new Date().toISOString(),
          },
        },
      })
    : await prisma.connection.create({
        data: {
          accountId: accountId,
          provider: "meta",
          status: "active",
          credentials: {
            accessToken: finalToken,
            expiresAt: expiresAt.toISOString(),
          },
          metadata: {
            name: `Meta - ${userInfo.name}`,
            accessToken: finalToken, // Also store in metadata for compatibility
            expiresAt: expiresAt.toISOString(),
            userInfo: {
              id: userInfo.id,
              name: userInfo.name,
              email: userInfo.email,
            },
            lastRefreshed: new Date().toISOString(),
          },
        },
      })
  
  return connection
}