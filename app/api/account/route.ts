import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'
const updateAccountSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const validatedData = updateAccountSchema.parse(body)
    
    // Get user's account
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
    
    // Update account name if provided
    if (validatedData.name) {
      await prisma.account.update({
        where: { id: user.accountId },
        data: { name: validatedData.name }
      })
    }

    // Update timezone and currency in provider connections metadata
    if (validatedData.timezone || validatedData.currency) {
      const connections = await prisma.providerConnection.findMany({
        where: { accountId: user.accountId }
      })

      for (const connection of connections) {
        const currentMetadata = (connection.metadata || {}) as any
        await prisma.providerConnection.update({
          where: { id: connection.id },
          data: {
            metadata: {
              ...currentMetadata,
              ...(validatedData.timezone && { timezone: validatedData.timezone }),
              ...(validatedData.currency && { currency: validatedData.currency })
            }
          }
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Account settings updated"
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Error updating account:", error)
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Get user and account data with relationships
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        account: {
          include: {
            providerConnections: {
              select: {
                id: true,
                provider: true,
                status: true,
                metadata: true,
                lastSyncAt: true,
              }
            },
            users: {
              select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
              }
            },
            _count: {
              select: {
                campaigns: true,
                ads: true,
                adAccounts: true,
              }
            }
          }
        }
      }
    })
    
    if (!user?.account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    // Calculate plan based on usage (simplified for demo)
    const plan = user.account._count.campaigns > 10 ? "Professional" : 
                 user.account._count.campaigns > 5 ? "Growth" : "Starter"
    
    // Get timezone and currency from first connection or defaults
    const firstConnection = user.account.providerConnections[0]
    const metadata = firstConnection?.metadata as any
    
    return NextResponse.json({
      account: {
        id: user.account.id,
        name: user.account.name,
        plan,
        users: user.account.users.length,
        maxUsers: plan === "Professional" ? 10 : plan === "Growth" ? 5 : 3,
        createdAt: user.account.createdAt,
        timezone: metadata?.timezone || "America/New_York",
        currency: metadata?.currency || "USD",
        stats: {
          campaigns: user.account._count.campaigns,
          ads: user.account._count.ads,
          adAccounts: user.account._count.adAccounts,
        },
        connections: user.account.providerConnections.map(conn => ({
          provider: conn.provider,
          status: conn.status,
          lastSyncAt: conn.lastSyncAt,
        })),
        teamMembers: user.account.users,
      }
    })
  } catch (error) {
    console.error("Error fetching account:", error)
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    )
  }
}