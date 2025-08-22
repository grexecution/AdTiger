import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    let connection = await prisma.connection.findFirst({
      where: {
        id: params.connectionId,
        accountId: session.user.accountId,
      },
    })
    
    if (connection) {
      // Sanitize sensitive data
      const sanitized = {
        id: connection.id,
        provider: connection.provider,
        status: connection.status,
        credentials: {
          userName: connection.credentials?.userName,
          userEmail: connection.credentials?.userEmail,
          tokenExpiresAt: connection.credentials?.tokenExpiresAt,
          selectedAccounts: connection.credentials?.selectedAccounts,
          availableAccounts: connection.status === "pending_selection" ? connection.credentials?.availableAccounts : undefined,
        },
        metadata: connection.metadata,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      }
      return NextResponse.json({ connection: sanitized })
    }
    
    // Fallback to legacy ProviderConnection
    const legacyConnection = await prisma.providerConnection.findFirst({
      where: {
        id: params.connectionId,
        accountId: session.user.accountId,
      },
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
    let connection = await prisma.connection.findFirst({
      where: {
        id: params.connectionId,
        accountId: session.user.accountId,
      },
    })
    
    if (connection) {
      // Delete associated ad accounts
      await prisma.adAccount.deleteMany({
        where: {
          accountId: session.user.accountId,
          provider: connection.provider,
        },
      })
      
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
    const legacyConnection = await prisma.providerConnection.findFirst({
      where: {
        id: params.connectionId,
        accountId: session.user.accountId,
      },
    })
    
    if (!legacyConnection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      )
    }
    
    // Delete associated ad accounts
    await prisma.adAccount.deleteMany({
      where: {
        accountId: session.user.accountId,
        provider: legacyConnection.provider,
      },
    })
    
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