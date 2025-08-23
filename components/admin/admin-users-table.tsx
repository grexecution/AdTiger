"use client"

import { useState, useEffect } from "react"
import { User, Account, UserRole, SubscriptionTier, SubscriptionStatus } from "@prisma/client"
import { EditUserDialog } from "./edit-user-dialog"
import { CreateUserDialog } from "./create-user-dialog"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Crown, User as UserIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type UserWithAccount = User & {
  account: (Pick<Account, 'id' | 'name' | 'subscriptionTier' | 'subscriptionStatus' | 'createdAt'>) | null
  _count: {
    sessions: number
  }
}

interface AdminUsersTableProps {
  users: UserWithAccount[]
}

export function AdminUsersTable({ users: initialUsers }: AdminUsersTableProps) {
  const [users, setUsers] = useState(initialUsers)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState<UserRole | "ALL">("ALL")
  const [editingUser, setEditingUser] = useState<UserWithAccount | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setUsers(initialUsers)
  }, [initialUsers])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.account?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = selectedRole === "ALL" || user.role === selectedRole
    
    return matchesSearch && matchesRole
  })

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <Badge variant="destructive" className="gap-1"><Crown className="h-3 w-3" />Admin</Badge>
      case UserRole.CUSTOMER:
        return <Badge variant="secondary" className="gap-1"><UserIcon className="h-3 w-3" />Customer</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const getTierBadge = (tier: SubscriptionTier) => {
    const variants = {
      FREE: "outline" as const,
      BASIC: "secondary" as const,
      PRO: "default" as const,
      ENTERPRISE: "destructive" as const
    }
    
    return <Badge variant={variants[tier]}>{tier}</Badge>
  }

  const getStatusBadge = (status: SubscriptionStatus) => {
    const variants = {
      ACTIVE: "default" as const,
      TRIAL: "secondary" as const,
      PAST_DUE: "destructive" as const,
      CANCELLED: "outline" as const,
      EXPIRED: "outline" as const
    }
    
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole | "ALL")}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="ALL">All Roles</option>
            <option value={UserRole.CUSTOMER}>Customer</option>
            <option value={UserRole.ADMIN}>Admin</option>
          </select>
        </div>
        <CreateUserDialog onUserCreated={handleUserUpdated} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium">{user.name || "No name"}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {getRoleBadge(user.role)}
                </TableCell>
                <TableCell>
                  {user.account ? (
                    <div className="flex flex-col">
                      <div className="font-medium">{user.account.name}</div>
                      <div className="text-sm text-muted-foreground">{user.account.id}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No account</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.account ? (
                    <div className="flex flex-col space-y-1">
                      {getTierBadge(user.account.subscriptionTier)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.account ? (
                    getStatusBadge(user.account.subscriptionStatus)
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {user._count.sessions > 0 ? "Active" : "Inactive"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(user.createdAt, { addSuffix: true })}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="gap-2"
                        onClick={() => {
                          setEditingUser(user)
                          setEditDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="gap-2 text-destructive"
                        onClick={() => handleDeleteUser(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No users found matching your criteria.
        </div>
      )}
      
      <EditUserDialog
        user={editingUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  )
  
  async function handleDeleteUser(user: UserWithAccount) {
    if (!confirm(`Are you sure you want to delete ${user.email}?`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete user")
      }
      
      toast({
        title: "Success",
        description: "User deleted successfully",
      })
      
      // Remove user from local state
      setUsers(users.filter(u => u.id !== user.id))
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      })
    }
  }
  
  async function handleUserUpdated() {
    // Refresh users list
    try {
      const response = await fetch("/api/admin/users")
      const data = await response.json()
      setUsers(data.users)
    } catch (error) {
      console.error("Failed to refresh users:", error)
    }
  }
}