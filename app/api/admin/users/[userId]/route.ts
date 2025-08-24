import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, SubscriptionTier, SubscriptionStatus } from "@prisma/client"
import { z } from "zod"
import { hashPassword } from "@/lib/auth"
export const dynamic = 'force-dynamic'
const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum([UserRole.ADMIN, UserRole.CUSTOMER]).optional(),
  accountId: z.string().nullable().optional(),
})

const updateAccountSchema = z.object({
  name: z.string().optional(),
  subscriptionTier: z.enum([
    SubscriptionTier.FREE,
    SubscriptionTier.BASIC,
    SubscriptionTier.PRO,
    SubscriptionTier.ENTERPRISE
  ]).optional(),
  subscriptionStatus: z.enum([
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIAL,
    SubscriptionStatus.PAST_DUE,
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.EXPIRED
  ]).optional(),
  billingEmail: z.string().email().optional(),
})

// GET - Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      include: {
        account: true,
        _count: {
          select: {
            sessions: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { user: userUpdate, account: accountUpdate } = body

    // Validate user update data
    const validatedUser = userUpdate ? updateUserSchema.parse(userUpdate) : {}
    const validatedAccount = accountUpdate ? updateAccountSchema.parse(accountUpdate) : {}

    // If password is being updated, hash it
    if (validatedUser.password) {
      validatedUser.password = await hashPassword(validatedUser.password)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: validatedUser,
      include: {
        account: true
      }
    })

    // Update account if user has one and account data is provided
    if (updatedUser.accountId && Object.keys(validatedAccount).length > 0) {
      await prisma.account.update({
        where: { id: updatedUser.accountId },
        data: validatedAccount
      })
    }

    // Fetch updated user with account
    const finalUser = await prisma.user.findUnique({
      where: { id: params.userId },
      include: {
        account: true,
        _count: {
          select: {
            sessions: true
          }
        }
      }
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = finalUser!

    return NextResponse.json({ 
      user: userWithoutPassword,
      message: "User updated successfully" 
    })
  } catch (error) {
    console.error("Update user error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    // Don't allow deleting yourself
    if (params.userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    // Delete user (sessions will be cascade deleted)
    await prisma.user.delete({
      where: { id: params.userId }
    })

    return NextResponse.json({ 
      message: "User deleted successfully" 
    })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}