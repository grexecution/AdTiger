import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'import { exchangeCodeForToken, saveMetaConnection } from "@/lib/meta-auth"

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  
  if (error) {
    // User denied permission or other error
    return NextResponse.redirect(
      new URL(`/dashboard/connections?error=${error}`, request.url)
    )
  }
  
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard/connections?error=invalid_request", request.url)
    )
  }
  
  try {
    // Decode the state
    const decodedState = JSON.parse(
      Buffer.from(state, "base64").toString("utf-8")
    )
    
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code)
    
    // Save the connection
    await saveMetaConnection(
      decodedState.accountId,
      decodedState.userId,
      tokenData.access_token,
      tokenData.expires_in || 5184000 // Default to 60 days
    )
    
    // Redirect to the setup wizard
    return NextResponse.redirect(
      new URL("/dashboard/connections/meta/setup", request.url)
    )
  } catch (error) {
    console.error("Meta OAuth callback error:", error)
    return NextResponse.redirect(
      new URL("/dashboard/connections?error=connection_failed", request.url)
    )
  }
}