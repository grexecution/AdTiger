import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getAccountContext() {
  const session = await auth()
  
  if (!session?.user?.accountId) {
    throw new Error("No account context available")
  }
  
  const account = await prisma.account.findUnique({
    where: { id: session.user.accountId }
  })
  
  if (!account) {
    throw new Error("Account not found")
  }
  
  return {
    accountId: account.id,
    userId: session.user.id,
    account,
  }
}

export function scopeByAccount<T extends { accountId?: string }>(
  query: T,
  accountId: string
): T & { accountId: string } {
  return {
    ...query,
    accountId,
  }
}

export async function getAccountFromHeaders() {
  const headersList = await headers()
  const accountId = headersList.get("x-account-id")
  const userId = headersList.get("x-user-id")
  
  if (!accountId || !userId) {
    throw new Error("Missing account context in request")
  }
  
  return {
    accountId,
    userId,
  }
}

export const scopedPrisma = prisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, operation, args, query }) {
        const modelsWithAccount = [
          "User",
          "ProviderConnection",
          "AdAccount",
          "Campaign",
          "AdGroup",
          "Ad",
          "Insight",
          "Recommendation",
          "Feedback",
        ]
        
        if (modelsWithAccount.includes(model)) {
          const session = await auth()
          if (session?.user?.accountId) {
            args.where = {
              ...args.where,
              accountId: session.user.accountId,
            }
          }
        }
        
        return query(args)
      },
      
      async findFirst({ model, operation, args, query }) {
        const modelsWithAccount = [
          "User",
          "ProviderConnection",
          "AdAccount",
          "Campaign",
          "AdGroup",
          "Ad",
          "Insight",
          "Recommendation",
          "Feedback",
        ]
        
        if (modelsWithAccount.includes(model)) {
          const session = await auth()
          if (session?.user?.accountId) {
            args.where = {
              ...args.where,
              accountId: session.user.accountId,
            }
          }
        }
        
        return query(args)
      },
      
      async create({ model, operation, args, query }) {
        const modelsWithAccount = [
          "User",
          "ProviderConnection",
          "AdAccount",
          "Campaign",
          "AdGroup",
          "Ad",
          "Insight",
          "Recommendation",
          "Feedback",
        ]
        
        if (modelsWithAccount.includes(model)) {
          const session = await auth()
          if (session?.user?.accountId) {
            // Handle both direct data and nested account relation
            if (typeof args.data === 'object' && args.data !== null) {
              // If data has an account field (nested relation), don't add accountId
              if (!('account' in args.data)) {
                args.data = {
                  ...args.data,
                  accountId: session.user.accountId,
                } as any
              }
            }
          }
        }
        
        return query(args)
      },
    },
  },
})