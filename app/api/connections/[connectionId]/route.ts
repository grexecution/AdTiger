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
      // Delete associated ad accounts
      if (session.user.accountId) {
        await prisma.adAccount.deleteMany({
          where: {
            accountId: session.user.accountId,
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
    
    // Delete associated ad accounts
    if (session.user.accountId) {
      await prisma.adAccount.deleteMany({
        where: {
          accountId: session.user.accountId,
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
    })
  } catch (error) {
    console.error("Error deleting connection:", error)
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    )
  }
}