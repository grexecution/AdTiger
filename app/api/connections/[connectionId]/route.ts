import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'
export async function GET(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  try {
    // Try new Connection model first
    // Admin can see all connections, regular users only their own
    const whereClause = session.user.role === "ADMIN" 
      ? { id: params.connectionId }
      : session.user.accountId 
        ? { id: params.connectionId, accountId: session.user.accountId }
        : { id: "no-match" } // If no accountId, return nothing
    
    let connection = await prisma.connection.findFirst({
      where: whereClause,
    })
    
    if (connection) {
      // Sanitize sensitive data
      const sanitized = {
        id: connection.id,
        provider: connection.provider,
        status: connection.status,
        credentials: {
          userName: (connection.credentials as any)?.userName,
          userEmail: (connection.credentials as any)?.userEmail,
          tokenExpiresAt: (connection.credentials as any)?.tokenExpiresAt,
          selectedAccounts: (connection.credentials as any)?.selectedAccounts,
          availableAccounts: connection.status === "pending_selection" ? (connection.credentials as any)?.availableAccounts : undefined,
        },
        metadata: connection.metadata,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      }
      return NextResponse.json({ connection: sanitized })
    }
    
    // Fallback to legacy ProviderConnection
    const legacyWhereClause = session.user.role === "ADMIN" 
      ? { id: params.connectionId }
      : session.user.accountId 
        ? { id: params.connectionId, accountId: session.user.accountId }
        : { id: "no-match" } // If no accountId, return nothing
    
    const legacyConnection = await prisma.providerConnection.findFirst({
      where: legacyWhereClause,
    })
    
    if (!legacyConnection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      )
    }
    
    // Map legacy to new format
    const mapped = {
      id: legacyConnection.id,
      provider: legacyConnection.provider,
      status: legacyConnection.isActive ? "active" : "inactive",
      credentials: {
        // Don't expose sensitive tokens
      },
      metadata: legacyConnection.metadata,
      createdAt: legacyConnection.createdAt,
      updatedAt: legacyConnection.updatedAt,
    }
    
    return NextResponse.json({ connection: mapped })
  } catch (error) {
    console.error("Error fetching connection:", error)
    return NextResponse.json(
      { error: "Failed to fetch connection" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  try {
    // Try new Connection model first
    // Admin can see all connections, regular users only their own
    const whereClause = session.user.role === "ADMIN" 
      ? { id: params.connectionId }
      : session.user.accountId 
        ? { id: params.connectionId, accountId: session.user.accountId }
        : { id: "no-match" } // If no accountId, return nothing
    
    let connection = await prisma.connection.findFirst({
      where: whereClause,
    })
    
    if (connection) {
      const accountId = session.user.accountId
      const provider = connection.provider.toLowerCase()
      
      // If this is a Meta connection, delete ALL related data
      if (provider === 'meta' && accountId) {
        console.log(`Deleting all Meta data for account ${accountId}...`)
        
        // Delete in order of dependencies
        // 1. Delete all asset storage for Meta ads
        const ads = await prisma.ad.findMany({
          where: {
            accountId,
            provider: 'meta'
          },
          select: { id: true }
        })
        
        if (ads.length > 0) {
          const adIds = ads.map(ad => ad.id)
          await prisma.assetStorage.deleteMany({
            where: {
              accountId,
              provider: 'meta',
              entityId: { in: adIds }
            }
          })
          console.log(`Deleted asset storage for ${ads.length} ads`)
        }
        
        // 2. Delete insights
        await prisma.insight.deleteMany({
          where: {
            accountId,
            provider: 'meta'
          }
        })
        console.log('Deleted all Meta insights')
        
        // 3. Delete ads
        await prisma.ad.deleteMany({
          where: {
            accountId,
            provider: 'meta'
          }
        })
        console.log('Deleted all Meta ads')
        
        // 4. Delete ad groups
        await prisma.adGroup.deleteMany({
          where: {
            accountId,
            provider: 'meta'
          }
        })
        console.log('Deleted all Meta ad groups')
        
        // 5. Delete campaigns
        await prisma.campaign.deleteMany({
          where: {
            accountId,
            provider: 'meta'
          }
        })
        console.log('Deleted all Meta campaigns')
        
        // 6. Delete change history
        await prisma.changeHistory.deleteMany({
          where: {
            accountId,
            provider: 'meta'
          }
        })
        console.log('Deleted all Meta change history')
        
        // 7. Delete sync history
        await prisma.syncHistory.deleteMany({
          where: {
            accountId,
            provider: 'meta'
          }
        })
        console.log('Deleted all Meta sync history')
        
        // 8. Delete ad accounts
        await prisma.adAccount.deleteMany({
          where: {
            accountId,
            provider: 'meta'
          }
        })
        console.log('Deleted all Meta ad accounts')
      } else if (accountId) {
        // For non-Meta providers, just delete ad accounts
        await prisma.adAccount.deleteMany({
          where: {
            accountId,
            provider: connection.provider,
          },
        })
      }
      
      // Delete the connection
      await prisma.connection.delete({
        where: {
          id: params.connectionId,
        },
      })
      
      return NextResponse.json({
        success: true,
        message: provider === 'meta' ? 'Meta connection and all associated data have been deleted' : 'Connection deleted successfully'
      })
    }
    
    // Fallback to legacy ProviderConnection
    const legacyWhereClause = session.user.role === "ADMIN" 
      ? { id: params.connectionId }
      : session.user.accountId 
        ? { id: params.connectionId, accountId: session.user.accountId }
        : { id: "no-match" } // If no accountId, return nothing
    
    const legacyConnection = await prisma.providerConnection.findFirst({
      where: legacyWhereClause,
    })
    
    if (!legacyConnection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      )
    }
    
    const accountId = session.user.accountId
    const provider = legacyConnection.provider.toLowerCase()
    
    // If this is a Meta connection, delete ALL related data
    if (provider === 'meta' && accountId) {
      console.log(`Deleting all Meta data for account ${accountId}...`)
      
      // Delete in order of dependencies
      // 1. Delete all asset storage for Meta ads
      const ads = await prisma.ad.findMany({
        where: {
          accountId,
          provider: 'meta'
        },
        select: { id: true }
      })
      
      if (ads.length > 0) {
        const adIds = ads.map(ad => ad.id)
        await prisma.assetStorage.deleteMany({
          where: {
            accountId,
            provider: 'meta',
            entityId: { in: adIds }
          }
        })
        console.log(`Deleted asset storage for ${ads.length} ads`)
      }
      
      // 2. Delete insights
      await prisma.insight.deleteMany({
        where: {
          accountId,
          provider: 'meta'
        }
      })
      
      // 3. Delete ads
      await prisma.ad.deleteMany({
        where: {
          accountId,
          provider: 'meta'
        }
      })
      
      // 4. Delete ad groups
      await prisma.adGroup.deleteMany({
        where: {
          accountId,
          provider: 'meta'
        }
      })
      
      // 5. Delete campaigns
      await prisma.campaign.deleteMany({
        where: {
          accountId,
          provider: 'meta'
        }
      })
      
      // 6. Delete change history
      await prisma.changeHistory.deleteMany({
        where: {
          accountId,
          provider: 'meta'
        }
      })
      
      // 7. Delete sync history
      await prisma.syncHistory.deleteMany({
        where: {
          accountId,
          provider: 'meta'
        }
      })
      
      // 8. Delete ad accounts
      await prisma.adAccount.deleteMany({
        where: {
          accountId,
          provider: 'meta'
        }
      })
    } else if (accountId) {
      // For non-Meta providers, just delete ad accounts
      await prisma.adAccount.deleteMany({
        where: {
          accountId,
          provider: legacyConnection.provider,
        },
      })
    }
    
    // Delete the legacy connection
    await prisma.providerConnection.delete({
      where: {
        id: params.connectionId,
      },
    })
    
    return NextResponse.json({
      success: true,
      message: provider === 'meta' ? 'Meta connection and all associated data have been deleted' : 'Connection deleted successfully'
    })
  } catch (error) {
    console.error("Error deleting connection:", error)
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    )
  }
}