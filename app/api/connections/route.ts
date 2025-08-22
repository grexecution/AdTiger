import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  try {
    // Get user's account from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true }
    })

    if (!user?.accountId) {
      return NextResponse.json(
        { error: "No account found" },
        { status: 404 }
      )
    }

    // Try to find connections in Connection table first (new OAuth flow)
    let connections = []
    try {
      connections = await prisma.connection.findMany({
        where: {
          accountId: user.accountId,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    } catch (e) {
      console.log("Connection table might not exist yet, using legacy only")
    }
    
    // If no connections found, check legacy ProviderConnection table
    let legacyConnections = []
    if (connections.length === 0) {
      const providerConnections = await prisma.providerConnection.findMany({
        where: {
          accountId: user.accountId,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
      
      // Map legacy connections to new format
      legacyConnections = providerConnections.map((conn) => ({
        id: conn.id,
        provider: conn.provider,
        status: conn.isActive ? "active" : "inactive",
        credentials: {
          accessToken: conn.credentials?.accessToken,
          refreshToken: conn.credentials?.refreshToken,
          expiresAt: conn.credentials?.expiresAt,
        },
        metadata: conn.metadata,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      }))
    }
    
    const allConnections = [...connections, ...legacyConnections]
    
    // Remove sensitive data before sending to client
    const sanitizedConnections = allConnections.map((conn) => ({
      id: conn.id,
      provider: conn.provider,
      status: conn.status,
      credentials: {
        userName: conn.credentials?.userName,
        userEmail: conn.credentials?.userEmail,
        tokenExpiresAt: conn.credentials?.tokenExpiresAt,
        selectedAccounts: conn.credentials?.selectedAccounts,
        availableAccounts: conn.status === "pending_selection" ? conn.credentials?.availableAccounts : undefined,
      },
      metadata: conn.metadata,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
    }))
    
    return NextResponse.json({
      connections: sanitizedConnections,
    })
  } catch (error) {
    console.error("Error fetching connections:", error)
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    )
  }
}