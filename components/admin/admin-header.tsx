"use client"

import { Shield } from "lucide-react"

export function AdminHeader() {
  return (
    <div className="flex items-center space-x-2">
      <Shield className="h-6 w-6 text-red-600" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground">
          System administration and user management
        </p>
      </div>
    </div>
  )
}