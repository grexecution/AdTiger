import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  console.log("Meta OAuth callback started")
  
  try {
    // Get the current session
    const session = await auth()
    console.log("Session:", session ? "Found" : "Not found")
    
    if (!session?.user?.id) {
      console.error("No session found, redirecting to login")
      // Return HTML that shows error in popup
      return new NextResponse(
        `<html><body>
          <h3>Authentication Error</h3>
          <p>No session found. Please log in and try again.</p>
          <script>
            setTimeout(() => {
              window.opener.postMessage({ 
                type: 'oauth-error', 
                error: 'Please log in and try again' 
              }, '*');
              window.close();
            }, 2000);
          </script>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Get user and account
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { account: true }
    })
    console.log("User found:", user ? "Yes" : "No")

    if (!user) {
      console.error("User not found in database")
      return new NextResponse(
        `<html><body>
          <h3>User Error</h3>
          <p>User not found. Please try again.</p>
          <script>
            setTimeout(() => {
              window.opener.postMessage({ 
                type: 'oauth-error', 
                error: 'User not found' 
              }, '*');
              window.close();
            }, 2000);
          </script>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Get the authorization code from the callback
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    // Handle errors from Meta
    if (error) {
      console.error("Meta OAuth error:", error, errorDescription)
      // Return HTML that closes popup and notifies parent
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ 
            type: 'oauth-error', 
            error: '${errorDescription || error}' 
          }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    if (!code) {
      // Return HTML that closes popup and notifies parent
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ 
            type: 'oauth-error', 
            error: 'No authorization code received' 
          }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Exchange code for short-lived token
    console.log("Exchanging code for token...")
    // Use the same redirect URI that was used in the OAuth request
    const redirectUri = `${request.nextUrl.origin}/api/meta/oauth/callback`
    console.log("Redirect URI being sent to Meta:", redirectUri)
    console.log("META_APP_ID:", process.env.META_APP_ID)
    console.log("META_APP_SECRET exists:", !!process.env.META_APP_SECRET)
    console.log("NEXTAUTH_URL from env:", process.env.NEXTAUTH_URL)
    
    // Check if credentials exist
    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
      console.error("Missing Meta credentials in environment variables")
      return new NextResponse(
        `<html><body>
          <h3>Configuration Error</h3>
          <p>Meta App credentials are not configured properly.</p>
          <p>META_APP_ID exists: ${!!process.env.META_APP_ID}</p>
          <p>META_APP_SECRET exists: ${!!process.env.META_APP_SECRET}</p>
          <script>
            setTimeout(() => {
              window.opener.postMessage({ 
                type: 'oauth-error', 
                error: 'Meta App credentials not configured' 
              }, '*');
              window.close();
            }, 3000);
          </script>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }
    
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token")
    tokenUrl.searchParams.append("client_id", process.env.META_APP_ID)
    tokenUrl.searchParams.append("client_secret", process.env.META_APP_SECRET)
    tokenUrl.searchParams.append("redirect_uri", redirectUri)
    tokenUrl.searchParams.append("code", code)

    console.log("Token exchange URL (App ID):", process.env.META_APP_ID)
    console.log("Full URL:", tokenUrl.toString().replace(process.env.META_APP_SECRET, '[REDACTED]'))
    
    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()
    console.log("Token response status:", tokenResponse.status)

    if (!tokenResponse.ok || tokenData.error) {
      console.error("Failed to exchange code for token:", tokenData)
      return new NextResponse(
        `<html><body>
          <h3>Token Exchange Error</h3>
          <p>${tokenData.error?.message || tokenData.error || 'Failed to authenticate with Meta'}</p>
          <script>
            setTimeout(() => {
              window.opener.postMessage({ 
                type: 'oauth-error', 
                error: '${tokenData.error?.message || tokenData.error || 'Failed to authenticate with Meta'}' 
              }, '*');
              window.close();
            }, 3000);
          </script>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    const shortLivedToken = tokenData.access_token
    console.log("Got short-lived token successfully")

    // For now, skip long-lived token exchange to isolate the issue
    // We'll use the short-lived token directly
    const longLivedToken = shortLivedToken
    const expiresIn = tokenData.expires_in || 3600 // Default 1 hour
    
    console.log("Using short-lived token for now (debugging)")

    // Get user info and ad accounts
    const meUrl = `https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${longLivedToken}`
    const meResponse = await fetch(meUrl)
    const meData = await meResponse.json()

    if (!meResponse.ok || meData.error) {
      console.error("Failed to get user info:", meData)
      const redirectUrl = new URL("/dashboard/connections", request.url)
      redirectUrl.searchParams.set("error", "Failed to get user information")
      return NextResponse.redirect(redirectUrl)
    }

    // Get ad accounts
    const adAccountsUrl = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${longLivedToken}`
    const adAccountsResponse = await fetch(adAccountsUrl)
    const adAccountsData = await adAccountsResponse.json()

    if (!adAccountsResponse.ok || adAccountsData.error) {
      console.error("Failed to get ad accounts:", adAccountsData)
      const redirectUrl = new URL("/dashboard/connections", request.url)
      redirectUrl.searchParams.set("error", "Failed to get ad accounts")
      return NextResponse.redirect(redirectUrl)
    }

    // Store the connection temporarily in session/redis for account selection
    // For now, we'll store it directly and redirect to account selection
    const tempConnectionId = crypto.randomUUID()
    
    // Store in database as pending connection
    await prisma.connection.create({
      data: {
        id: tempConnectionId,
        accountId: user.accountId || "no-match",
        provider: "meta",
        status: "pending_selection",
        credentials: {
          accessToken: longLivedToken,
          userId: meData.id,
          userName: meData.name,
          userEmail: meData.email,
          expiresIn: expiresIn,
          tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
          availableAccounts: adAccountsData.data
        },
        metadata: {
          authMethod: "oauth",
          authenticatedAt: new Date().toISOString()
        }
      }
    })

    // Return HTML that closes popup and notifies parent about success
    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ 
          type: 'oauth-success', 
          connectionId: '${tempConnectionId}',
          availableAccounts: ${JSON.stringify(adAccountsData.data)}
        }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )

  } catch (error) {
    console.error("Meta OAuth callback error:", error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    
    // Return HTML that shows the error and closes popup
    return new NextResponse(
      `<html><body>
        <h3>Connection Error</h3>
        <p>${errorMessage}</p>
        <p style="color: #666; font-size: 12px;">Check the console for more details. This window will close in 5 seconds.</p>
        <script>
          console.error('OAuth Error:', ${JSON.stringify(errorMessage)});
          window.opener.postMessage({ 
            type: 'oauth-error', 
            error: '${errorMessage}' 
          }, '*');
          setTimeout(() => window.close(), 5000);
        </script>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}