"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AdAccount {
  id: string
  name: string
  account_status: number
  currency: string
  timezone_name: string
}

interface MetaAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  accounts: AdAccount[]
  connectionId: string
  onSuccess: () => void
}

export function MetaAccountSelector({
  isOpen,
  onClose,
  accounts,
  connectionId,
  onSuccess
}: MetaAccountSelectorProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleToggleAccount = (accountId: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    )
  }

  const handleSelectAll = () => {
    const activeAccounts = accounts
      .filter(acc => acc.account_status === 1)
      .map(acc => acc.id)
    setSelectedAccounts(activeAccounts)
  }

  const handleSave = async () => {
    if (selectedAccounts.length === 0) {
      toast({
        title: "No accounts selected",
        description: "Please select at least one account to sync",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      // Save selected accounts
      const response = await fetch(`/api/connections/${connectionId}/select-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountIds: selectedAccounts
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Failed to save selection:", errorData)
        throw new Error(errorData.error || "Failed to save selection")
      }

      // Trigger initial sync
      const syncResponse = await fetch(`/api/connections/${connectionId}/sync`, {
        method: "POST"
      })

      if (!syncResponse.ok) {
        console.error("Initial sync failed, but accounts were saved")
      }

      toast({
        title: "Success",
        description: `${selectedAccounts.length} accounts selected and sync started`,
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error("Failed to save account selection:", error)
      toast({
        title: "Failed to save selection",
        description: "Please try again",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge variant="default">Active</Badge>
      case 2:
        return <Badge variant="secondary">Disabled</Badge>
      case 101:
        return <Badge variant="outline">Closed</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Ad Accounts to Sync</DialogTitle>
          <DialogDescription>
            Choose which Meta ad accounts you want to sync with AdTiger.
            You can change this selection later in settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {selectedAccounts.length} of {accounts.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              Select All Active
            </Button>
          </div>

          <ScrollArea className="h-[400px] border rounded-lg p-4">
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={account.id}
                    checked={selectedAccounts.includes(account.id)}
                    onCheckedChange={() => handleToggleAccount(account.id)}
                    disabled={account.account_status !== 1}
                  />
                  <label
                    htmlFor={account.id}
                    className="flex-1 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {account.id} • {account.currency} • {account.timezone_name}
                      </div>
                    </div>
                    {getStatusBadge(account.account_status)}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Start Sync
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}