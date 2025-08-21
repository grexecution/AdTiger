import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { appId, appSecret, accessToken, adAccountId } = body

    if (!appId || !appSecret || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required credentials' },
        { status: 400 }
      )
    }

    // Test the connection with Meta API
    try {
      // Make a test request to Meta Graph API
      const testUrl = `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`
      const response = await fetch(testUrl)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Invalid credentials')
      }

      const userData = await response.json()
      
      // If ad account ID provided, test it
      if (adAccountId) {
        const adAccountUrl = `https://graph.facebook.com/v18.0/${adAccountId}?fields=name,currency,timezone_name&access_token=${accessToken}`
        const adAccountResponse = await fetch(adAccountUrl)
        
        if (adAccountResponse.ok) {
          const adAccountData = await adAccountResponse.json()
          return NextResponse.json({
            success: true,
            accountName: adAccountData.name || userData.name,
            currency: adAccountData.currency,
            timezone: adAccountData.timezone_name,
            message: 'Connection successful'
          })
        }
      }

      return NextResponse.json({
        success: true,
        accountName: userData.name || 'Meta Account',
        message: 'Connection successful'
      })

    } catch (error: any) {
      return NextResponse.json(
        { 
          error: 'Connection test failed',
          message: error.message || 'Failed to connect to Meta API'
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Meta connection test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}