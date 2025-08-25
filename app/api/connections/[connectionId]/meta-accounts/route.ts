import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMetaAdAccounts } from '@/lib/meta-auth'

export const dynamic = 'force-dynamic'

export async function GET(
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

    // Get the connection
    const whereClause = user.role === "ADMIN"
      ? { id: params.connectionId }
      : user.accountId
        ? { id: params.connectionId, accountId: user.accountId }
        : { id: "no-match" }

    const connection = await prisma.connection.findFirst({
      where: whereClause
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    if (connection.provider !== 'meta' && connection.provider !== 'META') {
      return NextResponse.json({ error: "Not a Meta connection" }, { status: 400 })
    }

    // Get the access token from credentials
    const credentials = connection.credentials as any
    const accessToken = credentials?.accessToken

    if (!accessToken) {
      return NextResponse.json({ error: "No access token found" }, { status: 400 })
    }

    // Fetch ad accounts from Meta API
    let metaAccounts = []
    try {
      metaAccounts = await getMetaAdAccounts(accessToken)
    } catch (error) {
      console.error("Error fetching Meta ad accounts:", error)
      return NextResponse.json({ 
        error: "Failed to fetch ad accounts from Meta",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }

    // Get selected account IDs from connection
    const selectedAccountIds = credentials?.selectedAccountIds || []
    
    // Add enabled flag to each account
    const accountsWithSelection = metaAccounts.map((account: any) => ({
      ...account,
      enabled: selectedAccountIds.includes(account.id)
    }))

    return NextResponse.json({
      accounts: accountsWithSelection,
      totalCount: metaAccounts.length,
      selectedCount: selectedAccountIds.length
    })
  } catch (error) {
    console.error("Failed to fetch Meta accounts:", error)
    return NextResponse.json(
      { error: "Failed to fetch Meta accounts" },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    const { enabledAccounts } = await request.json()

    if (!enabledAccounts || !Array.isArray(enabledAccounts)) {
      return NextResponse.json(
        { error: "Invalid enabled accounts list" },
        { status: 400 }
      )
    }

    // Get the connection
    const whereClause = user.role === "ADMIN"
      ? { id: params.connectionId }
      : user.accountId
        ? { id: params.connectionId, accountId: user.accountId }
        : { id: "no-match" }

    const connection = await prisma.connection.findFirst({
      where: whereClause
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // Update the connection with selected account IDs
    const updatedConnection = await prisma.connection.update({
      where: { id: params.connectionId },
      data: {
        credentials: {
          ...(connection.credentials as any),
          selectedAccountIds: enabledAccounts
        },
        metadata: {
          ...(connection.metadata as any),
          lastAccountSelectionUpdate: new Date().toISOString(),
          selectedAccountsCount: enabledAccounts.length
        }
      }
    })

    // Also update AdAccount records if they exist
    if (user.accountId) {
      // Mark selected accounts as enabled
      await prisma.adAccount.updateMany({
        where: {
          accountId: user.accountId,
          provider: "meta",
          externalId: { in: enabledAccounts }
        },
        data: {
          metadata: {
            selected: true,
            connectionId: params.connectionId,
            selectedAt: new Date().toISOString()
          }
        }
      })

      // Mark unselected accounts as disabled
      await prisma.adAccount.updateMany({
        where: {
          accountId: user.accountId,
          provider: "meta",
          externalId: { notIn: enabledAccounts }
        },
        data: {
          metadata: {
            selected: false,
            connectionId: params.connectionId
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      selectedCount: enabledAccounts.length,
      message: `${enabledAccounts.length} accounts selected for syncing`
    })
  } catch (error) {
    console.error("Failed to update Meta account selection:", error)
    return NextResponse.json(
      { error: "Failed to update account selection" },
      { status: 500 }
    )
  }
}