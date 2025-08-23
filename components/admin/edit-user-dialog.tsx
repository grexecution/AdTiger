"use client"

import { useState } from "react"
import { User, Account, UserRole, SubscriptionTier, SubscriptionStatus } from "@prisma/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

type UserWithAccount = User & {
  account: (Pick<Account, 'id' | 'name' | 'subscriptionTier' | 'subscriptionStatus' | 'createdAt'>) | null
  _count: {
    sessions: number
  }
}

interface EditUserDialogProps {
  user: UserWithAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated: () => void
}

export function EditUserDialog({ user, open, onOpenChange, onUserUpdated }: EditUserDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    role: user?.role || UserRole.CUSTOMER,
    accountName: user?.account?.name || "",
    subscriptionTier: user?.account?.subscriptionTier || SubscriptionTier.FREE,
    subscriptionStatus: user?.account?.subscriptionStatus || SubscriptionStatus.ACTIVE,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updateData: any = {
        user: {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        },
        account: user?.account ? {
          name: formData.accountName,
          subscriptionTier: formData.subscriptionTier,
          subscriptionStatus: formData.subscriptionStatus,
        } : undefined
      }

      // Only include password if it's been changed
      if (formData.password) {
        updateData.user.password = formData.password
      }

      const response = await fetch(`/api/admin/users/${user?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update user")
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      })

      onUserUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Update error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and account settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="User name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="password">Password (leave blank to keep current)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="New password (optional)"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.CUSTOMER}>Customer</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {user.account && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="Account name"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="tier">Subscription Tier</Label>
                  <Select
                    value={formData.subscriptionTier}
                    onValueChange={(value) => setFormData({ ...formData, subscriptionTier: value as SubscriptionTier })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SubscriptionTier.FREE}>Free</SelectItem>
                      <SelectItem value={SubscriptionTier.BASIC}>Basic</SelectItem>
                      <SelectItem value={SubscriptionTier.PRO}>Pro</SelectItem>
                      <SelectItem value={SubscriptionTier.ENTERPRISE}>Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="status">Subscription Status</Label>
                  <Select
                    value={formData.subscriptionStatus}
                    onValueChange={(value) => setFormData({ ...formData, subscriptionStatus: value as SubscriptionStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SubscriptionStatus.ACTIVE}>Active</SelectItem>
                      <SelectItem value={SubscriptionStatus.TRIAL}>Trial</SelectItem>
                      <SelectItem value={SubscriptionStatus.PAST_DUE}>Past Due</SelectItem>
                      <SelectItem value={SubscriptionStatus.CANCELLED}>Cancelled</SelectItem>
                      <SelectItem value={SubscriptionStatus.EXPIRED}>Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}