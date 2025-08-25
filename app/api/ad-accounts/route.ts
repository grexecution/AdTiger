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
    // Get all connections for the user's account
    const connections = await prisma.connection.findMany({
      where: {
        accountId: session.user.accountId || "no-match",
        status: { in: ["active", "CONNECTED"] }
      }
    })
    
    // Extract selected account IDs from connections
    const selectedAccountIds: string[] = []
    connections.forEach(conn => {
      const credentials = conn.credentials as any
      if (credentials?.selectedAccountIds) {
        selectedAccountIds.push(...credentials.selectedAccountIds)
      } else if (credentials?.selectedAccounts) {
        const ids = credentials.selectedAccounts.map((acc: any) => 
          typeof acc === 'string' ? acc : (acc.id || acc.account_id)
        )
        selectedAccountIds.push(...ids)
      } else if (credentials?.accountIds) {
        selectedAccountIds.push(...credentials.accountIds)
      }
    })
    
    // Now get only the ad accounts that are selected
    const where = session.user.role === "ADMIN" 
      ? {} 
      : session.user.accountId 
        ? { 
            accountId: session.user.accountId,
            externalId: { in: selectedAccountIds }
          }
        : { accountId: "no-match" }
    
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