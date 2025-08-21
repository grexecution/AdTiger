import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  try {
    const accounts = await prisma.adAccount.findMany({
      where: {
        accountId: session.user.accountId,
      },
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