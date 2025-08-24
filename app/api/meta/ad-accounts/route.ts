import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'import { getMetaAdAccounts } from "@/lib/meta-auth"

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  try {
    // Get the Meta connection for this account
    const connection = await prisma.providerConnection.findFirst({
      where: {
        accountId: session.user.accountId || "no-match",
        provider: "meta",
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    
    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: "No active Meta connection found" },
        { status: 404 }
      )
    }
    
    // Fetch ad accounts from Meta
    const adAccounts = await getMetaAdAccounts(connection.accessToken)
    
    // Get existing ad accounts from database
    const existingAccounts = await prisma.adAccount.findMany({
      where: {
        accountId: session.user.accountId || "no-match",
        provider: "meta",
      },
    })
    
    const existingAccountIds = new Set(
      existingAccounts.map((acc) => acc.externalId)
    )
    
    // Format the response
    const formattedAccounts = adAccounts.map((account: any) => ({
      id: account.account_id,
      name: account.name,
      currency: account.currency,
      timezone: account.timezone_name,
      status: account.account_status === 1 ? "active" : "inactive",
      isConnected: existingAccountIds.has(account.account_id),
      business: account.business,
    }))
    
    return NextResponse.json({
      accounts: formattedAccounts,
      connectionId: connection.id,
    })
  } catch (error) {
    console.error("Error fetching Meta ad accounts:", error)
    return NextResponse.json(
      { error: "Failed to fetch ad accounts" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  try {
    const { accountIds } = await request.json()
    
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid account IDs" },
        { status: 400 }
      )
    }
    
    // Get the Meta connection
    const connection = await prisma.providerConnection.findFirst({
      where: {
        accountId: session.user.accountId || "no-match",
        provider: "meta",
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    
    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: "No active Meta connection found" },
        { status: 404 }
      )
    }
    
    // Fetch full ad account details from Meta
    const adAccounts = await getMetaAdAccounts(connection.accessToken)
    
    // Filter to only the selected accounts
    const selectedAccounts = adAccounts.filter((acc: any) =>
      accountIds.includes(acc.account_id)
    )
    
    // Save the selected ad accounts to the database
    const savedAccounts = await Promise.all(
      selectedAccounts.map(async (account: any) => {
        return prisma.adAccount.upsert({
          where: {
            accountId_provider_externalId: {
              accountId: session.user.accountId || "no-match",
              provider: "meta",
              externalId: account.account_id,
            },
          },
          update: {
            name: account.name,
            currency: account.currency,
            timezone: account.timezone_name,
            status: account.account_status === 1 ? "active" : "inactive",
            metadata: {
              business: account.business,
              id: account.id, // Full ID with act_ prefix
            },
          },
          create: {
            accountId: session.user.accountId || "no-match",
            provider: "meta",
            externalId: account.account_id,
            name: account.name,
            currency: account.currency,
            timezone: account.timezone_name,
            status: account.account_status === 1 ? "active" : "inactive",
            metadata: {
              business: account.business,
              id: account.id, // Full ID with act_ prefix
            },
          },
        })
      })
    )
    
    return NextResponse.json({
      success: true,
      accounts: savedAccounts,
    })
  } catch (error) {
    console.error("Error saving Meta ad accounts:", error)
    return NextResponse.json(
      { error: "Failed to save ad accounts" },
      { status: 500 }
    )
  }
}