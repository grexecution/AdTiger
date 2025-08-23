"use client"

import { useSession } from "next-auth/react"
import { UserRole } from "@prisma/client"

export function useUserRole() {
  const { data: session } = useSession()
  
  return {
    user: session?.user,
    role: session?.user?.role || UserRole.CUSTOMER,
    isAdmin: session?.user?.role === UserRole.ADMIN,
    isCustomer: session?.user?.role === UserRole.CUSTOMER,
    isAuthenticated: !!session?.user,
  }
}