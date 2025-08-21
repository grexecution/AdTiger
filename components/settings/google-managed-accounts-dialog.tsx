"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  Building,
  Users,
  DollarSign,
  Activity,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle,
  Globe,
  ShoppingBag,
  Youtube,
  Smartphone
} from "lucide-react"
import { Input } from "@/components/ui/input"

interface ManagedAccount {
  id: string
  name: string
  customerId: string
  currency: string
  timezone: string
  status: string
  type: string // "SEARCH", "SHOPPING", "DISPLAY", "VIDEO"
  campaigns?: number
  budget?: number
  enabled?: boolean
}

interface GoogleManagedAccountsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectionId: string
}

export function GoogleManagedAccountsDialog({
  open,
  onOpenChange,
  connectionId
}: GoogleManagedAccountsDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [accounts, setAccounts] = useState<ManagedAccount[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchManagedAccounts()
    }
  }, [open, connectionId])

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
      
      onOpenChange(false)
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
  }

  const toggleAll = () => {
    if (selectedAccounts.size === filteredAccounts.length) {
      setSelectedAccounts(new Set())
    } else {
      setSelectedAccounts(new Set(filteredAccounts.map(acc => acc.customerId)))
    }
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'SEARCH':
        return <Search className="h-4 w-4" />
      case 'SHOPPING':
        return <ShoppingBag className="h-4 w-4" />
      case 'VIDEO':
        return <Youtube className="h-4 w-4" />
      case 'DISPLAY':
        return <Smartphone className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ENABLED':
      case 'ACTIVE':
        return 'text-green-600'
      case 'PAUSED':
        return 'text-yellow-600'
      case 'REMOVED':
      case 'DISABLED':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.customerId.includes(searchQuery)
  )

  // Group accounts by type
  const groupedAccounts = filteredAccounts.reduce((groups, account) => {
    const type = account.type || 'OTHER'
    if (!groups[type]) groups[type] = []
    groups[type].push(account)
    return groups
  }, {} as Record<string, ManagedAccount[]>)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Google Ads Accounts</DialogTitle>
          <DialogDescription>
            Select which accounts from your Manager Account (MCC) should be synced to AdTiger.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Search and Actions Bar */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by account name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAll}
                >
                  {selectedAccounts.size === filteredAccounts.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-4 text-sm">
                  <span>
                    <strong>{accounts.length}</strong> total accounts
                  </span>
                  <span>
                    <strong>{selectedAccounts.size}</strong> selected for sync
                  </span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active: {accounts.filter(a => a.status === 'ENABLED').length}
                  </Badge>
                  <Badge variant="outline">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Paused: {accounts.filter(a => a.status === 'PAUSED').length}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Accounts List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      {getAccountIcon(type)}
                      <span>{type} Campaigns</span>
                      <Badge variant="secondary" className="ml-auto">
                        {typeAccounts.length}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {typeAccounts.map((account) => (
                        <Card 
                          key={account.customerId}
                          className={`cursor-pointer transition-colors ${
                            selectedAccounts.has(account.customerId) 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleAccount(account.customerId)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedAccounts.has(account.customerId)}
                                onCheckedChange={() => toggleAccount(account.customerId)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium">{account.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      ID: {account.customerId}
                                    </p>
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={getStatusColor(account.status)}
                                  >
                                    {account.status}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {account.currency}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    {account.timezone}
                                  </span>
                                  {account.campaigns !== undefined && (
                                    <span className="flex items-center gap-1">
                                      <Activity className="h-3 w-3" />
                                      {account.campaigns} campaigns
                                    </span>
                                  )}
                                  {account.budget !== undefined && (
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      ${account.budget.toLocaleString()}/mo
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {selectedAccounts.size === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select at least one account to sync campaign data.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || selectedAccounts.size === 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              `Save Selection (${selectedAccounts.size})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}