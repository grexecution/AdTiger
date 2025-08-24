import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'import { UserRole } from "@prisma/client"

export const dynamic = 'force-dynamic'import { z } from "zod"

export const dynamic = 'force-dynamic'
const querySchema = z.object({
  query: z.string().min(1).max(10000),
})

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
    const { query } = querySchema.parse(body)

    // Security: Only allow SELECT statements
    const trimmedQuery = query.trim().toUpperCase()
    if (!trimmedQuery.startsWith('SELECT')) {
      return NextResponse.json(
        { error: "Only SELECT queries are allowed" },
        { status: 400 }
      )
    }

    // Additional security: Block certain keywords
    const dangerousKeywords = ['DELETE', 'UPDATE', 'INSERT', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE']
    if (dangerousKeywords.some(keyword => trimmedQuery.includes(keyword))) {
      return NextResponse.json(
        { error: "Query contains forbidden operations" },
        { status: 400 }
      )
    }

    // Execute the query using Prisma's raw query
    const results = await prisma.$queryRawUnsafe(query)

    return NextResponse.json({ 
      results: Array.isArray(results) ? results : [results],
      count: Array.isArray(results) ? results.length : 1
    })

  } catch (error) {
    console.error("Query execution failed:", error)
    return NextResponse.json(
      { error: "Query execution failed" },
      { status: 500 }
    )
  }
}