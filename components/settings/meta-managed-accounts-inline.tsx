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
  Save,
  Facebook,
  Instagram,
  ChevronDown,
  ChevronUp,
  Building,
  Globe
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MetaAdAccount {
  id: string
  account_id: string
  name: string
  currency: string
  timezone_name: string
  account_status: number
  amount_spent?: string
  balance?: string
  business?: {
    id: string
    name: string
  }
  enabled?: boolean
}

interface MetaManagedAccountsInlineProps {
  connectionId: string
  onUpdate?: () => void
}

export function MetaManagedAccountsInline({
  connectionId,
  onUpdate
}: MetaManagedAccountsInlineProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [hasChanges, setHasChanges] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchMetaAccounts()
  }, [connectionId])

  const fetchMetaAccounts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/connections/${connectionId}/meta-accounts`)
      if (!response.ok) throw new Error('Failed to fetch Meta ad accounts')
      
      const data = await response.json()
      setAccounts(data.accounts || [])
      
      // Set initially selected accounts
      const enabled = new Set<string>(
        data.accounts
          .filter((acc: MetaAdAccount) => acc.enabled)
          .map((acc: MetaAdAccount) => acc.id)
      )
      setSelectedAccounts(enabled)
      setHasChanges(false)
    } catch (error) {
      console.error('Error fetching Meta accounts:', error)
      toast({
        title: "Error",
        description: "Failed to load Meta ad accounts",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/connections/${connectionId}/meta-accounts`, {
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
        description: `${selectedAccounts.size} ad accounts selected for syncing`,
      })
      
      setHasChanges(false)
      onUpdate?.()
    } catch (error) {
      console.error('Error saving Meta accounts:', error)
      toast({
        title: "Error",
        description: "Failed to save account settings",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleAccount = (accountId: string) => {
    const newSelected = new Set(selectedAccounts)
    if (newSelected.has(accountId)) {
      newSelected.delete(accountId)
    } else {
      newSelected.add(accountId)
    }
    setSelectedAccounts(newSelected)
    setHasChanges(true)
  }

  const toggleAll = () => {
    if (selectedAccounts.size === accounts.length) {
      setSelectedAccounts(new Set())
    } else {
      setSelectedAccounts(new Set(accounts.map(acc => acc.id)))
    }
    setHasChanges(true)
  }

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1: // ACTIVE
        return { label: 'Active', className: 'bg-green-100 text-green-800 border-green-200' }
      case 2: // DISABLED
        return { label: 'Disabled', className: 'bg-red-100 text-red-800 border-red-200' }
      case 3: // UNSETTLED
        return { label: 'Unsettled', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
      case 7: // PENDING_RISK_REVIEW
        return { label: 'Under Review', className: 'bg-orange-100 text-orange-800 border-orange-200' }
      case 9: // IN_GRACE_PERIOD
        return { label: 'Grace Period', className: 'bg-purple-100 text-purple-800 border-purple-200' }
      default:
        return { label: 'Unknown', className: 'bg-gray-100 text-gray-800 border-gray-200' }
    }
  }

  const formatCurrency = (amount?: string, currency?: string) => {
    if (!amount) return null
    const value = parseFloat(amount) / 100 // Meta returns amounts in cents
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  if (isLoading) {
    return (
      <div className="mt-4 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading Meta ad accounts...</span>
        </div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <Alert className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No ad accounts found. Please make sure your Meta user has access to at least one ad account.
        </AlertDescription>
      </Alert>
    )
  }

  // Group accounts by business
  const groupedAccounts = accounts.reduce((groups, account) => {
    const businessName = account.business?.name || 'Personal Accounts'
    if (!groups[businessName]) groups[businessName] = []
    groups[businessName].push(account)
    return groups
  }, {} as Record<string, MetaAdAccount[]>)

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
            Ad Accounts ({accounts.length})
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
          {Object.entries(groupedAccounts).map(([businessName, businessAccounts]) => (
            <div key={businessName} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Building className="h-3 w-3" />
                <span>{businessName}</span>
                <span className="text-muted-foreground/60">({businessAccounts.length})</span>
              </div>
              
              <div className="grid gap-2">
                {businessAccounts.map((account) => {
                  const status = getStatusBadge(account.account_status)
                  return (
                    <div
                      key={account.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-all",
                        selectedAccounts.has(account.id)
                          ? "bg-primary/5 border-primary/30"
                          : "bg-background hover:bg-muted/50 border-border"
                      )}
                    >
                      <Checkbox
                        checked={selectedAccounts.has(account.id)}
                        onCheckedChange={() => toggleAccount(account.id)}
                        className="mt-0.5"
                        disabled={account.account_status !== 1} // Only allow selection of active accounts
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{account.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {account.account_id}
                            </p>
                          </div>
                          <Badge 
                            variant="outline"
                            className={cn("text-xs shrink-0", status.className)}
                          >
                            {status.label}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {account.currency}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {account.timezone_name?.split('/').pop()?.replace('_', ' ')}
                          </span>
                          {account.amount_spent && (
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              Spent: {formatCurrency(account.amount_spent, account.currency)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAccounts.size === 0 && isExpanded && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No accounts selected. Select at least one active account to sync campaign data.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}