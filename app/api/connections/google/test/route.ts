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
    const { clientId, clientSecret, refreshToken, developerToken, customerId } = body

    if (!clientId || !clientSecret || !refreshToken || !developerToken || !customerId) {
      return NextResponse.json(
        { error: 'Missing required credentials' },
        { status: 400 }
      )
    }

    // Test the connection with Google OAuth2
    try {
      // Exchange refresh token for access token
      const tokenUrl = 'https://oauth2.googleapis.com/token'
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      })

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json()
        throw new Error(error.error_description || 'Invalid OAuth credentials')
      }

      const tokens = await tokenResponse.json()
      
      // For a real test, you would make a request to Google Ads API
      // For demo purposes, we'll just validate the OAuth flow
      if (tokens.access_token) {
        return NextResponse.json({
          success: true,
          accountName: `Google Ads Account (${customerId})`,
          message: 'Connection successful',
          hasValidToken: true
        })
      }

      throw new Error('Failed to obtain access token')

    } catch (error: any) {
      return NextResponse.json(
        { 
          error: 'Connection test failed',
          message: error.message || 'Failed to connect to Google Ads'
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Google connection test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}