import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { UserRole } from "@prisma/client"

export type RoleRequirement = UserRole | UserRole[]

export function createRoleMiddleware(requiredRoles: RoleRequirement) {
  return async function roleMiddleware(request: NextRequest) {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }
    
    const userRole = session.user.role
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
    
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }
    
    return null // Allow request to continue
  }
}

export function requireAdmin() {
  return createRoleMiddleware(UserRole.ADMIN)
}

export function requireCustomerOrAdmin() {
  return createRoleMiddleware([UserRole.CUSTOMER, UserRole.ADMIN])
}

export async function isAdmin(userId: string): Promise<boolean> {
  const session = await auth()
  return session?.user?.role === UserRole.ADMIN
}

export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  const session = await auth()
  return session?.user?.role === role
}

export async function canAccessAccount(userId: string, accountId: string): Promise<boolean> {
  const session = await auth()
  
  if (!session?.user) return false
  
  // Admin can access any account
  if (session.user.role === UserRole.ADMIN) return true
  
  // Regular users can only access their own account
  return session.user.accountId === accountId
}