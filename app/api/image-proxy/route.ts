import { NextRequest, NextResponse } from 'next/server'

/**
 * Image proxy endpoint to fetch Facebook CDN images that require proper referrer headers
 * This solves the 403 Forbidden issue when accessing Facebook images from localhost
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    // Validate that it's a Facebook CDN URL for security
    const isFacebookCDN = imageUrl.includes('scontent') && imageUrl.includes('fbcdn.net')
    const isGraphAPI = imageUrl.includes('graph.facebook.com') && imageUrl.includes('/picture')
    
    if (!isFacebookCDN && !isGraphAPI) {
      return NextResponse.json({ error: 'Only Facebook CDN and Graph API picture URLs are allowed' }, { status: 403 })
    }

    // Prepare headers for Facebook CDN requests
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    }

    // For Graph API requests, add access token if available
    if (isGraphAPI && process.env.META_ACCESS_TOKEN) {
      const separator = imageUrl.includes('?') ? '&' : '?'
      const authenticatedUrl = `${imageUrl}${separator}access_token=${process.env.META_ACCESS_TOKEN}`
      
      const response = await fetch(authenticatedUrl, {
        headers,
        method: 'GET'
      })

      if (!response.ok) {
        console.error(`Failed to fetch Graph API image: ${response.status} ${response.statusText}`)
        
        // In development, return a placeholder image instead of failing
        if (process.env.NODE_ENV === 'development') {
          console.log('Serving placeholder image for development (Graph API failed)')
          return serveGrayPlaceholder()
        }
        
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status })
      }

      const imageBuffer = await response.arrayBuffer()
      const contentType = response.headers.get('content-type') || 'image/jpeg'

      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400', // Cache for 1 day
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // For Facebook CDN URLs, try direct fetch with proper headers
    const response = await fetch(imageUrl, {
      headers,
      method: 'GET'
    })

    if (!response.ok) {
      console.error(`Failed to fetch Facebook CDN image: ${response.status} ${response.statusText}`)
      
      // In development, return a placeholder image instead of failing
      if (process.env.NODE_ENV === 'development') {
        console.log('Serving placeholder image for development')
        return serveGrayPlaceholder()
      }
      
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status })
    }

    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Image proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

/**
 * Generate a simple gray placeholder image for development when Facebook images aren't accessible
 */
function serveGrayPlaceholder() {
  // Simple 1x1 transparent PNG as base64
  const transparentPixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  
  // Create a simple gray placeholder image (200x200) as SVG
  const placeholderSvg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#e5e7eb"/>
      <text x="100" y="90" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="14">
        Facebook Image
      </text>
      <text x="100" y="110" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="12">
        (Dev Placeholder)
      </text>
      <text x="100" y="130" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="10">
        Image not accessible
      </text>
      <text x="100" y="145" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="10">
        in development
      </text>
    </svg>
  `

  const buffer = Buffer.from(placeholderSvg)
  const uint8Array = new Uint8Array(buffer)
  
  return new NextResponse(uint8Array, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      'Access-Control-Allow-Origin': '*',
    },
  })
}