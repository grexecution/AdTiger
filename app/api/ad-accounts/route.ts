import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'
export async function GET() {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  try {
    // Admin can see all accounts, regular users only their own
    const where = session.user.role === "ADMIN" 
      ? {} 
      : session.user.accountId 
        ? { accountId: session.user.accountId }
        : { accountId: "no-match" } // If no accountId, return empty
    
    const accounts = await prisma.adAccount.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    })
    
    return NextResponse.json({
      accounts: accounts,
    })
  } catch (error) {
    console.error("Error fetching ad accounts:", error)
    return NextResponse.json(
      { error: "Failed to fetch ad accounts" },
      { status: 500 }
    )
  }
}