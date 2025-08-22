import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { account: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { accountIds } = await request.json()

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json(
        { error: "No account IDs provided" },
        { status: 400 }
      )
    }

    const connection = await prisma.connection.findFirst({
      where: {
        id: params.connectionId,
        accountId: user.accountId
      }
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // Update the connection with selected account IDs
    const updatedConnection = await prisma.connection.update({
      where: { id: params.connectionId },
      data: {
        status: "active",
        credentials: {
          ...(connection.credentials as any),
          selectedAccountIds: accountIds // Store just the IDs for quick reference
        },
        metadata: {
          ...(connection.metadata as any),
          accountSelectionCompletedAt: new Date().toISOString()
        }
      }
    })

    // Get the AdAccount records that were created during manual connection
    const selectedAdAccounts = await prisma.adAccount.findMany({
      where: {
        accountId: user.accountId,
        provider: "meta",
        externalId: { in: accountIds }
      }
    })

    // Update AdAccount records to mark them as selected
    await prisma.adAccount.updateMany({
      where: {
        accountId: user.accountId,
        provider: "meta",
        externalId: { in: accountIds }
      },
      data: {
        metadata: {
          selected: true,
          connectionId: params.connectionId,
          selectedAt: new Date().toISOString()
        }
      }
    })

    // Mark unselected accounts
    await prisma.adAccount.updateMany({
      where: {
        accountId: user.accountId,
        provider: "meta",
        externalId: { notIn: accountIds }
      },
      data: {
        metadata: {
          selected: false,
          connectionId: params.connectionId
        }
      }
    })

    return NextResponse.json({ 
      success: true,
      selectedCount: accountIds.length
    })
  } catch (error) {
    console.error("Failed to save account selection:", error)
    return NextResponse.json(
      { error: "Failed to save account selection" },
      { status: 500 }
    )
  }
}