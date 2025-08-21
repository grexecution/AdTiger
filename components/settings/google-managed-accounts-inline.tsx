"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  DollarSign,
  Activity,
  Loader2,
  AlertCircle,
  CheckCircle,
  Save,
  Search,
  ShoppingBag,
  Youtube,
  Smartphone,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ManagedAccount {
  id: string
  name: string
  customerId: string
  currency: string
  timezone: string
  status: string
  type: string
  campaigns?: number
  budget?: number
  enabled?: boolean
}

interface GoogleManagedAccountsInlineProps {
  connectionId: string
  onUpdate?: () => void
}

export function GoogleManagedAccountsInline({
  connectionId,
  onUpdate
}: GoogleManagedAccountsInlineProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [accounts, setAccounts] = useState<ManagedAccount[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [hasChanges, setHasChanges] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchManagedAccounts()
  }, [connectionId])

  const fetchManagedAccounts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/connections/${connectionId}/managed-accounts`)
      if (!response.ok) throw new Error('Failed to fetch managed accounts')
      
      const data = await response.json()
      setAccounts(data.accounts || [])
      
      // Set initially selected accounts
      const enabled = new Set(
        data.accounts
          .filter((acc: ManagedAccount) => acc.enabled)
          .map((acc: ManagedAccount) => acc.customerId)
      )
      setSelectedAccounts(enabled)
      setHasChanges(false)
    } catch (error) {
      console.error('Error fetching managed accounts:', error)
      toast({
        title: "Error",
        description: "Failed to load managed accounts",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/connections/${connectionId}/managed-accounts`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabledAccounts: Array.from(selectedAccounts)
        })
      })

      if (!response.ok) throw new Error('Failed to save settings')

      toast({
        title: "Settings saved",
        description: `${selectedAccounts.size} accounts selected for syncing`,
      })
      
      setHasChanges(false)
      onUpdate?.()
    } catch (error) {
      console.error('Error saving managed accounts:', error)
      toast({
        title: "Error",
        description: "Failed to save account settings",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleAccount = (customerId: string) => {
    const newSelected = new Set(selectedAccounts)
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId)
    } else {
      newSelected.add(customerId)
    }
    setSelectedAccounts(newSelected)
    setHasChanges(true)
  }

  const toggleAll = () => {
    if (selectedAccounts.size === accounts.length) {
      setSelectedAccounts(new Set())
    } else {
      setSelectedAccounts(new Set(accounts.map(acc => acc.customerId)))
    }
    setHasChanges(true)
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'SEARCH':
        return <Search className="h-3 w-3" />
      case 'SHOPPING':
        return <ShoppingBag className="h-3 w-3" />
      case 'VIDEO':
        return <Youtube className="h-3 w-3" />
      case 'DISPLAY':
        return <Smartphone className="h-3 w-3" />
      default:
        return <Activity className="h-3 w-3" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ENABLED':
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'REMOVED':
      case 'DISABLED':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="mt-4 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading managed accounts...</span>
        </div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <Alert className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No managed accounts found. This might not be a Manager Account (MCC).
        </AlertDescription>
      </Alert>
    )
  }

  // Group accounts by type
  const groupedAccounts = accounts.reduce((groups, account) => {
    const type = account.type || 'OTHER'
    if (!groups[type]) groups[type] = []
    groups[type].push(account)
    return groups
  }, {} as Record<string, ManagedAccount[]>)

  return (
    <div className="mt-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Managed Accounts ({accounts.length})
          </button>
          <Badge variant="secondary">
            {selectedAccounts.size} selected
          </Badge>
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Unsaved changes
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAll}
            >
              {selectedAccounts.size === accounts.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
          {hasChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || selectedAccounts.size === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  Save Selection
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Accounts List */}
      {isExpanded && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {getAccountIcon(type)}
                <span>{type} Accounts</span>
                <span className="text-muted-foreground/60">({typeAccounts.length})</span>
              </div>
              
              <div className="grid gap-2">
                {typeAccounts.map((account) => (
                  <div
                    key={account.customerId}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-all",
                      selectedAccounts.has(account.customerId)
                        ? "bg-primary/5 border-primary/30"
                        : "bg-background hover:bg-muted/50 border-border"
                    )}
                  >
                    <Checkbox
                      checked={selectedAccounts.has(account.customerId)}
                      onCheckedChange={() => toggleAccount(account.customerId)}
                      className="mt-0.5"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{account.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {account.customerId}
                          </p>
                        </div>
                        <Badge 
                          variant="outline"
                          className={cn("text-xs shrink-0", getStatusColor(account.status))}
                        >
                          {account.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {account.currency}
                        </span>
                        {account.campaigns !== undefined && (
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {account.campaigns} campaigns
                          </span>
                        )}
                        {account.budget !== undefined && (
                          <span className="flex items-center gap-1">
                            ${account.budget.toLocaleString()}/mo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAccounts.size === 0 && isExpanded && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No accounts selected. Select at least one account to sync campaign data.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}