import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMetaApiClient } from "@/lib/meta-api-client"

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
    const client = getMetaApiClient(testToken)
    const isValid = await client.validateToken()
    
    if (!isValid) {
      return NextResponse.json(
        { error: "Test mode not properly configured" },
        { status: 400 }
      )
    }

    // Create or update the provider connection
    const connection = await prisma.providerConnection.upsert({
      where: {
        accountId_provider: {
          accountId: user.accountId,
          provider: "meta"
        }
      },
      update: {
        isActive: true,
        accessToken: testToken,
        metadata: {
          isTestMode: true,
          connectedAt: new Date().toISOString()
        },
        updatedAt: new Date()
      },
      create: {
        accountId: user.accountId,
        provider: "meta",
        isActive: true,
        accessToken: testToken,
        metadata: {
          isTestMode: true,
          connectedAt: new Date().toISOString()
        }
      }
    })

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