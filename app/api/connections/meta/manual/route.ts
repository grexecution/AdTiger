import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!prisma) {
      console.error("Prisma client is not initialized")
      return NextResponse.json({ error: "Database connection error" }, { status: 500 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { account: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    console.log("Request body:", JSON.stringify(body, null, 2))
    
    const { accessToken, user: metaUser, adAccounts } = body

    if (!accessToken) {
      return NextResponse.json({ error: "Access token required" }, { status: 400 })
    }

    console.log("Creating manual connection for user:", user.id)
    console.log("Meta user info:", metaUser)
    console.log("Ad accounts found:", adAccounts?.length || 0)

    // Check if a Meta connection already exists
    const existingConnection = await prisma.connection.findFirst({
      where: {
        accountId: user.accountId || "no-match",
        provider: "meta"
      }
    })

    let connectionId: string

    if (existingConnection) {
      // Update existing connection
      console.log("Updating existing connection:", existingConnection.id)
      connectionId = existingConnection.id
      
      await prisma.connection.update({
        where: { id: connectionId },
        data: {
          status: "active",
          credentials: {
            accessToken,
            userId: metaUser?.id || "unknown",
            userName: metaUser?.name || "Unknown User",
            userEmail: metaUser?.email || null,
            tokenType: "manual",
            createdAt: new Date().toISOString(),
            selectedAccounts: adAccounts || []
          },
          metadata: {
            authMethod: "manual",
            authenticatedAt: new Date().toISOString()
          }
        }
      })
    } else {
      // Create new connection
      connectionId = crypto.randomUUID()
      console.log("Creating new connection:", connectionId)
      
      try {
        await prisma.connection.create({
          data: {
            id: connectionId,
            accountId: user.accountId || "no-match",
            provider: "meta",
            status: "active",
            credentials: {
              accessToken,
              userId: metaUser?.id || "unknown",
              userName: metaUser?.name || "Unknown User",
              userEmail: metaUser?.email || null,
              tokenType: "manual",
              createdAt: new Date().toISOString(),
              selectedAccounts: adAccounts || []
            },
            metadata: {
              authMethod: "manual",
              authenticatedAt: new Date().toISOString()
            }
          }
        })
      } catch (dbError) {
        console.error("Database error creating connection:", dbError)
        throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
      }
    }

    // Create AdAccount records if we have them
    if (adAccounts && adAccounts.length > 0) {
      for (const account of adAccounts) {
        await prisma.adAccount.upsert({
          where: {
            accountId_provider_externalId: {
              accountId: user.accountId || "no-match",
              provider: "meta",
              externalId: account.id
            }
          },
          update: {
            name: account.name,
            currency: account.currency,
            timezone: account.timezone_name,
            status: account.account_status === 1 ? "active" : "inactive",
            metadata: {
              accountStatus: account.account_status,
              connectionId
            }
          },
          create: {
            accountId: user.accountId || "no-match",
            provider: "meta",
            externalId: account.id,
            name: account.name,
            currency: account.currency,
            timezone: account.timezone_name,
            status: account.account_status === 1 ? "active" : "inactive",
            metadata: {
              accountStatus: account.account_status,
              connectionId
            }
          }
        })
      }
    }

    return NextResponse.json({ 
      success: true,
      connectionId,
      accountsConnected: adAccounts?.length || 0
    })
  } catch (error) {
    console.error("Failed to create manual connection:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })
    
    return NextResponse.json(
      { 
        error: "Failed to create connection",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}