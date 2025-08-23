import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createMetaApiClient } from "@/lib/meta-api-client"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's account
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true }
    })

    if (!user?.accountId) {
      return NextResponse.json({ error: "No account found" }, { status: 404 })
    }

    // For test mode, create a test token
    const testToken = `test_token_${Date.now()}`
    
    // Validate that we're in test mode
    const client = createMetaApiClient(testToken)
    const isValid = await client.testConnection()
    
    if (!isValid) {
      return NextResponse.json(
        { error: "Test mode not properly configured" },
        { status: 400 }
      )
    }

    // Create or update the provider connection
    // Use findFirst and then create/update since we don't have a unique constraint on just accountId+provider
    let connection = await prisma.providerConnection.findFirst({
      where: {
        accountId: user.accountId || "no-match",
        provider: "meta"
      }
    })
    
    if (connection) {
      connection = await prisma.providerConnection.update({
        where: { id: connection.id },
        data: {
          isActive: true,
          accessToken: testToken,
          metadata: {
            isTestMode: true,
            connectedAt: new Date().toISOString()
          },
          updatedAt: new Date()
        }
      })
    } else {
      connection = await prisma.providerConnection.create({
        data: {
          accountId: user.accountId || "no-match",
          provider: "meta",
          externalAccountId: "test",
          isActive: true,
          accessToken: testToken,
          metadata: {
            isTestMode: true,
            connectedAt: new Date().toISOString()
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: "Test Meta account connected successfully",
      connectionId: connection.id
    })
  } catch (error) {
    console.error("Connect test Meta account error:", error)
    return NextResponse.json(
      { error: "Failed to connect test account" },
      { status: 500 }
    )
  }
}