import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'import { UserRole } from "@prisma/client"

export const dynamic = 'force-dynamic'import { z } from "zod"

export const dynamic = 'force-dynamic'import { hashPassword } from "@/lib/auth"

export const dynamic = 'force-dynamic'
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  role: z.enum([UserRole.ADMIN, UserRole.CUSTOMER]),
  accountId: z.string().nullable().optional(),
})

// GET - List all users
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const users = await prisma.user.findMany({
      include: {
        account: {
          select: {
            id: true,
            name: true,
            subscriptionTier: true,
            subscriptionStatus: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            sessions: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password, ...user }) => user)

    return NextResponse.json({ users: usersWithoutPasswords })
  } catch (error) {
    console.error("List users error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      )
    }

    // Hash the password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        ...validatedData,
        password: hashedPassword
      },
      include: {
        account: true
      }
    })

    // Remove password from response
    const { password, ...userWithoutPassword } = newUser

    return NextResponse.json({ 
      user: userWithoutPassword,
      message: "User created successfully" 
    })
  } catch (error) {
    console.error("Create user error:", error)
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