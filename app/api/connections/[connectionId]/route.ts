import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    // First verify the connection belongs to this account
    const connection = await prisma.providerConnection.findFirst({
      where: {
        id: params.connectionId,
        accountId: session.user.accountId,
      },
    })
    
    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      )
    }
    
    // Delete associated ad accounts
    await prisma.adAccount.deleteMany({
      where: {
        accountId: session.user.accountId,
        provider: connection.provider,
      },
    })
    
    // Delete the connection
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