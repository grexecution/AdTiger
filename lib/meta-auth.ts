import { prisma } from "@/lib/prisma"

export const META_APP_ID = process.env.META_APP_ID!
export const META_APP_SECRET = process.env.META_APP_SECRET!
export const META_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + "/api/meta/callback"
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
  // Get user info
  const userInfo = await getMetaUserInfo(accessToken)
  
  // Calculate expiry
  const expiresAt = new Date(Date.now() + expiresIn * 1000)
  
  // Save or update the connection
  const connection = await prisma.providerConnection.upsert({
    where: {
      accountId_provider_externalAccountId: {
        accountId: accountId,
        provider: "meta",
        externalAccountId: userInfo.id,
      },
    },
    update: {
      accessToken: accessToken,
      expiresAt: expiresAt,
      isActive: true,
      metadata: {
        name: userInfo.name,
        email: userInfo.email,
      },
    },
    create: {
      accountId: accountId,
      provider: "meta",
      externalAccountId: userInfo.id,
      accessToken: accessToken,
      expiresAt: expiresAt,
      metadata: {
        name: userInfo.name,
        email: userInfo.email,
      },
    },
  })
  
  return connection
}