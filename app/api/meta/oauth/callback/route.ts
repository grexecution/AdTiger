import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { exchangeCodeForToken, saveMetaConnection, getMetaAdAccounts } from "@/lib/meta-auth"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error, errorDescription)
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'oauth-error',
                error: '${errorDescription || error}'
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" }
      })
    }

    // Validate required parameters
    if (!code || !state) {
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'oauth-error',
                error: 'Missing authorization code or state'
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" }
      })
    }

    // Get current session
    const session = await auth()
    if (!session?.user?.accountId) {
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'oauth-error',
                error: 'Authentication required'
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" }
      })
    }

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code)
    
    // Save the connection
    const connection = await saveMetaConnection(
      session.user.accountId,
      session.user.id,
      tokenData.access_token,
      tokenData.expires_in || 5184000 // Default to 60 days
    )

    // Fetch available ad accounts
    let availableAccounts = []
    try {
      availableAccounts = await getMetaAdAccounts(tokenData.access_token)
    } catch (error) {
      console.error("Failed to fetch ad accounts:", error)
    }

    // Return success HTML that posts message to opener
    return new NextResponse(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'oauth-success',
              connectionId: '${connection.id}',
              availableAccounts: ${JSON.stringify(availableAccounts)}
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" }
    })

  } catch (error) {
    console.error("OAuth callback error:", error)
    return new NextResponse(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'oauth-error',
              error: 'Failed to complete authentication'
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" }
    })
  }
}