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
    // Get session for authentication
    const session = await auth()
    if (!session?.user?.id) {
      // For development, allow unauthenticated access
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
        return new NextResponse(Buffer.from(asset.data), {
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
          const imageUrl = creative?.asset_feed_spec?.images?.[0]?.url || 
                          creative?.image_url ||
                          creative?.object_story_spec?.link_data?.picture
          
          if (imageUrl && typeof imageUrl === 'string' && (imageUrl.includes('scontent') || imageUrl.includes('fbcdn'))) {
            // Return a redirect to the CDN URL - browser will handle CORS
            return NextResponse.redirect(imageUrl)
          }
        }
      } catch (error) {
        console.error('Error fetching ad for fallback:', error)
      }
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
            const imageUrl = creative?.asset_feed_spec?.images?.[0]?.url || 
                            creative?.image_url ||
                            creative?.object_story_spec?.link_data?.picture
            
            if (imageUrl && typeof imageUrl === 'string' && (imageUrl.includes('scontent') || imageUrl.includes('fbcdn'))) {
              // Return a redirect to the CDN URL - browser will handle CORS
              return NextResponse.redirect(imageUrl)
            }
          }
        } catch (error) {
          console.error('Error fetching ad for fallback:', error)
        }
        
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
      }
      
      // Return the stored image data
      return new NextResponse(Buffer.from(asset.data), {
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