import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/assets/[entityId]?type=main_image
 * Serves stored asset images from the database
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { entityId: string } }
) {
  try {
    // In development, allow unauthenticated access
    let session = null
    if (process.env.NODE_ENV !== 'development') {
      session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      // Try to get session but don't require it in development
      try {
        session = await auth()
      } catch (e) {
        // Ignore auth errors in development
        console.log('Auth skipped in development mode')
      }
    }

    const { searchParams } = new URL(request.url)
    const assetType = searchParams.get('type') || 'main_image'
    
    // Get user's accountId
    let accountId: string | undefined
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { accountId: true }
      })
      accountId = user?.accountId || undefined
    }
    
    // For development without auth, try to get any matching asset
    if (!accountId && process.env.NODE_ENV === 'development') {
      const asset = await prisma.assetStorage.findFirst({
        where: {
          entityId: params.entityId,
          assetType: assetType
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          data: true,
          mimeType: true,
          size: true,
          changedAt: true,
          changeCount: true
        }
      })
      
      if (asset && asset.data && asset.data.length > 0) {
        // Convert Prisma Bytes to Uint8Array for NextResponse
        const imageData = new Uint8Array(asset.data)
        return new NextResponse(imageData, {
          status: 200,
          headers: {
            'Content-Type': asset.mimeType,
            'Content-Length': asset.size.toString(),
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            'X-Asset-Changed': asset.changedAt?.toISOString() || '',
            'X-Asset-Change-Count': asset.changeCount.toString()
          }
        })
      }
      
      // If no stored asset, try to proxy from the ad's creative URL
      try {
        const ad = await prisma.ad.findUnique({
          where: { id: params.entityId },
          select: { creative: true }
        })
        
        if (ad?.creative) {
          const creative = ad.creative as any
          
          // Check if this is a carousel image request
          if (assetType.startsWith('carousel_image_')) {
            const carouselIndex = parseInt(assetType.replace('carousel_image_', ''))
            const attachment = creative?.object_story_spec?.link_data?.child_attachments?.[carouselIndex]
            
            if (attachment) {
              // Try URL first - but skip Graph API URLs as they require auth
              const carouselUrl = attachment.image_url || attachment.picture
              if (carouselUrl && typeof carouselUrl === 'string') {
                // Only redirect if it's NOT a graph API URL (those require auth)
                if (!carouselUrl.includes('graph.facebook.com')) {
                  return NextResponse.redirect(carouselUrl)
                }
              }
              
              // If we only have a hash and no URL, return a placeholder SVG
              // The hash alone can't be used to fetch images without proper auth
              const placeholderSvg = `
                <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
                  <rect width="400" height="400" fill="#f3f4f6"/>
                  <rect x="1" y="1" width="398" height="398" fill="none" stroke="#d1d5db" stroke-width="2"/>
                  <text x="200" y="180" font-family="sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="#6b7280">
                    Card ${carouselIndex + 1}
                  </text>
                  <text x="200" y="230" font-family="sans-serif" font-size="24" text-anchor="middle" fill="#6b7280">
                    Carousel Image
                  </text>
                  <text x="200" y="260" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#9ca3af">
                    ${attachment.image_hash ? attachment.image_hash.substring(0, 16) + '...' : 'No hash'}
                  </text>
                </svg>
              `.trim()
              
              return new NextResponse(placeholderSvg, {
                status: 200,
                headers: {
                  'Content-Type': 'image/svg+xml',
                  'Cache-Control': 'public, max-age=3600',
                  'X-Placeholder': 'true',
                  'X-Image-Hash': attachment.image_hash || 'unknown'
                }
              })
            }
          } else {
            // Regular image handling
            // Try to get hash first for Graph API picture endpoint
            const imageHash = creative?.asset_feed_spec?.images?.[0]?.hash || 
                            creative?.image_hash ||
                            creative?.object_story_spec?.link_data?.image_hash
            
            if (imageHash) {
              // Use Graph API picture endpoint which works with hash
              const graphApiUrl = `https://graph.facebook.com/v21.0/${imageHash}/picture?width=1200&height=1200`
              return NextResponse.redirect(graphApiUrl)
            }
            
            // Fallback to URL if no hash available
            const imageUrl = creative?.asset_feed_spec?.images?.[0]?.url || 
                            creative?.image_url ||
                            creative?.object_story_spec?.link_data?.picture
            
            // Only redirect if it's a Graph API picture URL (not scontent CDN)
            if (imageUrl && typeof imageUrl === 'string' && imageUrl.includes('graph.facebook.com') && imageUrl.includes('/picture')) {
              return NextResponse.redirect(imageUrl)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching ad for fallback:', error)
      }
      
      // If we're in development and didn't find anything, return 404
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }
    
    // Normal flow with accountId
    if (accountId) {
      const asset = await prisma.assetStorage.findFirst({
        where: {
          accountId: accountId,
          entityId: params.entityId,
          assetType: assetType
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          data: true,
          mimeType: true,
          size: true,
          changedAt: true,
          changeCount: true
        }
      })
      
      if (!asset || !asset.data || asset.data.length === 0) {
        // Try to proxy from the ad's creative URL
        try {
          const ad = await prisma.ad.findFirst({
            where: { 
              id: params.entityId,
              accountId: accountId
            },
            select: { creative: true }
          })
          
          if (ad?.creative) {
            const creative = ad.creative as any
            
            // Check if this is a carousel image request
            if (assetType.startsWith('carousel_image_')) {
              const carouselIndex = parseInt(assetType.replace('carousel_image_', ''))
              const attachment = creative?.object_story_spec?.link_data?.child_attachments?.[carouselIndex]
              
              if (attachment) {
                // Try URL first - but skip Graph API URLs as they require auth
                const carouselUrl = attachment.image_url || attachment.picture
                if (carouselUrl && typeof carouselUrl === 'string') {
                  // Only redirect if it's NOT a graph API URL (those require auth)
                  if (!carouselUrl.includes('graph.facebook.com')) {
                    return NextResponse.redirect(carouselUrl)
                  }
                }
                
                // If we only have a hash and no URL, return a placeholder SVG
                // The hash alone can't be used to fetch images without proper auth
                const placeholderSvg = `
                  <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
                    <rect width="400" height="400" fill="#f3f4f6"/>
                    <rect x="1" y="1" width="398" height="398" fill="none" stroke="#d1d5db" stroke-width="2"/>
                    <text x="200" y="180" font-family="sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="#6b7280">
                      Card ${carouselIndex + 1}
                    </text>
                    <text x="200" y="230" font-family="sans-serif" font-size="24" text-anchor="middle" fill="#6b7280">
                      Carousel Image
                    </text>
                    <text x="200" y="260" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#9ca3af">
                      ${attachment.image_hash ? attachment.image_hash.substring(0, 16) + '...' : 'No hash'}
                    </text>
                  </svg>
                `.trim()
                
                return new NextResponse(placeholderSvg, {
                  status: 200,
                  headers: {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'public, max-age=3600',
                    'X-Placeholder': 'true',
                    'X-Image-Hash': attachment.image_hash || 'unknown'
                  }
                })
              }
            } else {
              // Regular image handling
              // Try to get hash first for Graph API picture endpoint
              const imageHash = creative?.asset_feed_spec?.images?.[0]?.hash || 
                              creative?.image_hash ||
                              creative?.object_story_spec?.link_data?.image_hash
              
              if (imageHash) {
                // Use Graph API picture endpoint which works with hash
                const graphApiUrl = `https://graph.facebook.com/v21.0/${imageHash}/picture?width=1200&height=1200`
                return NextResponse.redirect(graphApiUrl)
              }
              
              // Fallback to URL if no hash available
              const imageUrl = creative?.asset_feed_spec?.images?.[0]?.url || 
                              creative?.image_url ||
                              creative?.object_story_spec?.link_data?.picture
              
              // Only redirect if it's a Graph API picture URL (not scontent CDN)
              if (imageUrl && typeof imageUrl === 'string' && imageUrl.includes('graph.facebook.com') && imageUrl.includes('/picture')) {
                return NextResponse.redirect(imageUrl)
              }
            }
          }
        } catch (error) {
          console.error('Error fetching ad for fallback:', error)
        }
        
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
      }
      
      // Return the stored image data
      // Convert Prisma Bytes to Uint8Array for NextResponse
      const imageData = new Uint8Array(asset.data)
      return new NextResponse(imageData, {
        status: 200,
        headers: {
          'Content-Type': asset.mimeType,
          'Content-Length': asset.size.toString(),
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'X-Asset-Changed': asset.changedAt?.toISOString() || '',
          'X-Asset-Change-Count': asset.changeCount.toString()
        }
      })
    }
    
    return NextResponse.json({ error: 'No account found' }, { status: 400 })
    
  } catch (error) {
    console.error('Error serving asset:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/assets/[entityId]/history
 * Returns the change history for an asset
 * Note: This is now handled via query parameter ?history=true
 */
async function getHistory(
  request: NextRequest,
  { params }: { params: { entityId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assetType = searchParams.get('type') || 'main_image'
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true }
    })
    
    if (!user?.accountId) {
      return NextResponse.json({ error: 'No account found' }, { status: 400 })
    }
    
    const history = await prisma.assetStorage.findMany({
      where: {
        accountId: user.accountId,
        entityId: params.entityId,
        assetType: assetType
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        hash: true,
        previousHash: true,
        changedAt: true,
        changeCount: true,
        size: true,
        width: true,
        height: true,
        createdAt: true
      }
    })
    
    return NextResponse.json({ history })
    
  } catch (error) {
    console.error('Error getting asset history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}