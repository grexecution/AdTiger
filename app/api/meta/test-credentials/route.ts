import { NextResponse } from "next/server"

// This is a test route - can be removed after debugging
export async function GET() {
  try {
    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    
    if (!appId || !appSecret) {
      return NextResponse.json({
        error: "Missing credentials",
        META_APP_ID_exists: !!appId,
        META_APP_SECRET_exists: !!appSecret
      }, { status: 400 })
    }
    
    // Test 1: Get app access token
    console.log("Testing Meta credentials...")
    const appTokenUrl = `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
    
    const appTokenResponse = await fetch(appTokenUrl)
    const appTokenData = await appTokenResponse.json()
    
    if (!appTokenResponse.ok || appTokenData.error) {
      console.error("App token error:", appTokenData)
      return NextResponse.json({
        error: "Failed to get app access token",
        details: appTokenData.error,
        hint: "Check that your META_APP_ID and META_APP_SECRET are correct"
      }, { status: 400 })
    }
    
    // Test 2: Get app info
    const appInfoUrl = `https://graph.facebook.com/${appId}?access_token=${appTokenData.access_token}`
    const appInfoResponse = await fetch(appInfoUrl)
    const appInfo = await appInfoResponse.json()
    
    if (!appInfoResponse.ok || appInfo.error) {
      console.error("App info error:", appInfo)
      return NextResponse.json({
        error: "Failed to get app info",
        details: appInfo.error,
        hint: "App exists but may not be properly configured"
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      app: {
        id: appInfo.id,
        name: appInfo.name,
        category: appInfo.category,
        link: appInfo.link
      },
      message: "Meta app credentials are valid!"
    })
    
  } catch (error) {
    console.error("Test credentials error:", error)
    return NextResponse.json({
      error: "Failed to test credentials",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}