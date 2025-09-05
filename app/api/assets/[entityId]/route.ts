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
      
      if (asset) {
        return new NextResponse(asset.data, {
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
      
      if (!asset) {
        // Return a 404 with a placeholder image
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
      }
      
      // Return the image data
      return new NextResponse(asset.data, {
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
 */
export async function getHistory(
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