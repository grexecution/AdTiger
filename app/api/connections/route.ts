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

    const connections = await prisma.providerConnection.findMany({
      where: {
        accountId: user.accountId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    
    // Remove sensitive data before sending to client
    const sanitizedConnections = connections.map((conn) => ({
      id: conn.id,
      provider: conn.provider,
      externalAccountId: conn.externalAccountId,
      isActive: conn.isActive,
      status: conn.status,
      lastSyncAt: conn.lastSyncAt,
      nextSyncAt: conn.nextSyncAt,
      metadata: {
        accountName: (conn.metadata as any)?.accountName,
        customerId: (conn.metadata as any)?.customerId,
        managerCustomerId: (conn.metadata as any)?.managerCustomerId,
        isManagerAccount: (conn.metadata as any)?.isManagerAccount || conn.provider.toLowerCase() === 'google', // For demo, treat all Google as manager
        currency: (conn.metadata as any)?.currency,
        timezone: (conn.metadata as any)?.timezone,
        enabledAccounts: (conn.metadata as any)?.enabledAccounts,
        // Don't send encrypted credentials to client
      },
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