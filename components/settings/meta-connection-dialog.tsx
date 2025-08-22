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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { 
  Facebook,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  DollarSign,
  Globe,
  Link2
} from "lucide-react"

interface MetaConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface AdAccount {
  id: string
  name: string
  account_status: number
  currency: string
  timezone_name: string
}

export function MetaConnectionDialog({ open, onOpenChange, onSuccess }: MetaConnectionDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [availableAccounts, setAvailableAccounts] = useState<AdAccount[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [showAccountSelection, setShowAccountSelection] = useState(false)
  const { toast } = useToast()

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'oauth-success') {
        setConnectionId(event.data.connectionId)
        setAvailableAccounts(event.data.availableAccounts || [])
        setShowAccountSelection(true)
        setIsConnecting(false)
      } else if (event.data.type === 'oauth-error') {
        toast({
          title: "Connection failed",
          description: event.data.error,
          variant: "destructive"
        })
        setIsConnecting(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [toast])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowAccountSelection(false)
      setConnectionId(null)
      setAvailableAccounts([])
      setSelectedAccounts(new Set())
      setIsConnecting(false)
    }
  }, [open])

  const handleConnect = () => {
    setIsConnecting(true)
    
    const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID
    
    if (!metaAppId) {
      toast({
        title: "Configuration Error",
        description: "Meta App ID is not configured. Please contact support.",
        variant: "destructive"
      })
      setIsConnecting(false)
      return
    }
    
    // Build OAuth URL - ensure redirect URI matches exactly
    const redirectUri = `${window.location.origin}/api/meta/oauth/callback`
    console.log("OAuth redirect URI:", redirectUri)
    
    const params = new URLSearchParams({
      client_id: metaAppId,
      redirect_uri: redirectUri,
      state: crypto.randomUUID(),
      scope: [
        "ads_management",
        "ads_read",
        "business_management",
        "pages_read_engagement",
        "pages_show_list",
        "read_insights"
      ].join(",")
    })
    
    // Open OAuth popup
    const width = 600
    const height = 700
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2
    
    window.open(
      `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`,
      'meta-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    )
  }

  const handleToggleAccount = (accountId: string) => {
    const newSelected = new Set(selectedAccounts)
    if (newSelected.has(accountId)) {
      newSelected.delete(accountId)
    } else {
      newSelected.add(accountId)
    }
    setSelectedAccounts(newSelected)
  }

  const handleSaveSelection = async () => {
    if (selectedAccounts.size === 0) {
      toast({
        title: "No accounts selected",
        description: "Please select at least one ad account",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/connections/${connectionId}/select-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountIds: Array.from(selectedAccounts)
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Connected ${selectedAccounts.size} ad account${selectedAccounts.size !== 1 ? 's' : ''}`,
        })
        onSuccess()
        onOpenChange(false)
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to save account selection")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save account selection",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1: // ACTIVE
        return <Badge variant="default" className="text-xs">Active</Badge>
      case 2: // DISABLED
        return <Badge variant="destructive" className="text-xs">Disabled</Badge>
      case 3: // UNSETTLED
        return <Badge variant="secondary" className="text-xs">Unsettled</Badge>
      default:
        return <Badge variant="outline" className="text-xs">Unknown</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Facebook className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle>
                {showAccountSelection ? "Select Ad Accounts" : "Connect Meta Business Account"}
              </DialogTitle>
              <DialogDescription>
                {showAccountSelection 
                  ? "Choose which ad accounts to sync with AdTiger"
                  : "Connect your Meta Business account to sync Facebook and Instagram campaigns"
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!showAccountSelection ? (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You'll be redirected to Facebook to authorize AdTiger. We'll only access your ad data, never post on your behalf.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">What we'll access:</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Ad campaign data</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Performance metrics</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Account information</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Business insights</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Connect with Meta
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {availableAccounts.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No ad accounts found. Please make sure your Meta user has access to at least one ad account.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  Found {availableAccounts.length} ad account{availableAccounts.length !== 1 ? 's' : ''}. 
                  Select the ones you want to sync:
                </div>

                <ScrollArea className="h-[300px] border rounded-lg p-4">
                  <div className="space-y-3">
                    {availableAccounts.map((account) => (
                      <div 
                        key={account.id}
                        className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => handleToggleAccount(account.id)}
                      >
                        <Checkbox
                          checked={selectedAccounts.has(account.id)}
                          onCheckedChange={() => handleToggleAccount(account.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">{account.name}</p>
                              <p className="text-xs text-muted-foreground">
                                ID: {account.id}
                              </p>
                            </div>
                            {getStatusBadge(account.account_status)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {account.currency}
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {account.timezone_name}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="text-sm text-muted-foreground">
                  {selectedAccounts.size} of {availableAccounts.length} accounts selected
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSelection}
                disabled={isSaving || selectedAccounts.size === 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  `Connect ${selectedAccounts.size} Account${selectedAccounts.size !== 1 ? 's' : ''}`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}