import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        metadata: true,
        createdAt: true,
        account: {
          select: {
            name: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Extract additional fields from metadata
    const metadata = user.metadata as any || {}

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      company: metadata.company || user.account?.name || "",
      phone: metadata.phone || "",
      timezone: metadata.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: metadata.language || "en",
      createdAt: user.createdAt
    })
  } catch (error) {
    console.error("Get profile error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, company, phone, timezone, language } = body

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Check if email is already taken by another user
    if (email && email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      })

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        )
      }
    }

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { metadata: true }
    })

    const currentMetadata = (currentUser?.metadata as any) || {}

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || undefined,
        email: email || undefined,
        metadata: {
          ...currentMetadata,
          company: company !== undefined ? company : currentMetadata.company,
          phone: phone !== undefined ? phone : currentMetadata.phone,
          timezone: timezone !== undefined ? timezone : currentMetadata.timezone,
          language: language !== undefined ? language : currentMetadata.language,
          updatedAt: new Date().toISOString()
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        metadata: true
      }
    })

    const updatedMetadata = updatedUser.metadata as any || {}

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      image: updatedUser.image,
      company: updatedMetadata.company || "",
      phone: updatedMetadata.phone || "",
      timezone: updatedMetadata.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: updatedMetadata.language || "en"
    })
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}