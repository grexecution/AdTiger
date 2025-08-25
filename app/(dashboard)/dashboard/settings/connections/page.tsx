"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  Facebook, 
  Link, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Settings,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Loader2,
  Building
} from "lucide-react"
import { MetaConnectionDialog } from "@/components/settings/meta-connection-dialog"
import { GoogleConnectionDialog } from "@/components/settings/google-connection-dialog"
import { GoogleManagedAccountsInline } from "@/components/settings/google-managed-accounts-inline"
import { MetaManagedAccountsInline } from "@/components/settings/meta-managed-accounts-inline"
import { MetaManualConnection } from "@/components/settings/meta-manual-connection"

interface Connection {
  id: string
  provider: string
  status: string
  accountName?: string
  lastSyncAt?: string
  nextSyncAt?: string
  metadata?: any
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState<string | null>(null)
  const [showMetaDialog, setShowMetaDialog] = useState(false)
  const [showGoogleDialog, setShowGoogleDialog] = useState(false)
  const [showManualConnection, setShowManualConnection] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/connections')
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
      }
    } catch (error) {
      console.error('Error fetching connections:', error)
      toast({
        title: "Error",
        description: "Failed to load connections",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async (connectionId: string, provider: string) => {
    try {
      setIsSyncing(connectionId)
      const response = await fetch(`/api/connections/${connectionId}/test`, {
        method: 'POST'
      })
      
      if (response.ok) {
        toast({
          title: "Connection successful",
          description: `${provider} connection is working properly`,
        })
        fetchConnections()
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Connection test failed')
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to test connection",
        variant: "destructive"
      })
    } finally {
      setIsSyncing(null)
    }
  }

  const handleSyncData = async (connectionId: string, provider: string) => {
    try {
      setIsSyncing(connectionId)
      toast({
        title: "Sync started",
        description: "Fetching latest data from " + provider,
      })
      
      const response = await fetch(`/api/connections/${connectionId}/sync`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Sync completed",
          description: `Synced ${data.stats?.campaigns || 0} campaigns, ${data.stats?.ads || 0} ads`,
        })
        fetchConnections()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Sync failed')
      }
    } catch (error: any) {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync data",
        variant: "destructive"
      })
    } finally {
      setIsSyncing(null)
    }
  }

  const handleDisconnect = async (connectionId: string, provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast({
          title: "Disconnected",
          description: `${provider} has been disconnected`,
        })
        fetchConnections()
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect provider",
        variant: "destructive"
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'ERROR':
      case 'EXPIRED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase()
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      connected: "default",
      active: "default",
      error: "destructive",
      expired: "destructive",
      disconnected: "secondary",
      inactive: "secondary"
    }
    
    const displayStatus = normalizedStatus === 'active' ? 'CONNECTED' : status?.toUpperCase()
    
    return (
      <Badge variant={variants[normalizedStatus] || "outline"}>
        {displayStatus}
      </Badge>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  const getPlatformIcon = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'meta':
        return <Facebook className="h-5 w-5 text-blue-600" />
      case 'google':
        return (
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 p-0.5">
            <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
              <span className="text-[8px] font-bold">G</span>
            </div>
          </div>
        )
      default:
        return <Link className="h-5 w-5" />
    }
  }

  const platformInfo = [
    {
      provider: 'META',
      name: 'Meta (Facebook & Instagram)',
      description: 'Connect your Meta Business account to sync Facebook and Instagram ad campaigns',
      connected: connections.some(c => (c.provider === 'META' || c.provider === 'meta') && (c.status === 'CONNECTED' || c.status === 'active')),
      connection: connections.find(c => c.provider === 'META' || c.provider === 'meta'),
      onConnect: () => setShowMetaDialog(true),
      features: ['Facebook Ads', 'Instagram Ads', 'Audience Insights', 'Campaign Performance']
    },
    {
      provider: 'GOOGLE',
      name: 'Google Ads',
      description: 'Connect your Google Ads account to sync Search, Display, YouTube, and Shopping campaigns',
      connected: connections.some(c => (c.provider === 'GOOGLE' || c.provider === 'google') && (c.status === 'CONNECTED' || c.status === 'active')),
      connection: connections.find(c => c.provider === 'GOOGLE' || c.provider === 'google'),
      onConnect: () => setShowGoogleDialog(true),
      features: ['Search Ads', 'YouTube Ads', 'Display Network', 'Shopping Ads']
    }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Platform Connections</h3>
        <p className="text-sm text-muted-foreground">
          Connect your advertising platforms to sync campaign data and get AI-powered recommendations.
        </p>
      </div>
      
      <Separator />

      <div className="space-y-4">
        {platformInfo.map((platform) => (
          <Card key={platform.provider}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getPlatformIcon(platform.provider)}
                  <div>
                    <CardTitle className="text-base">{platform.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {platform.description}
                    </CardDescription>
                  </div>
                </div>
                {platform.connection && getStatusBadge(platform.connection.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Features */}
              <div className="flex flex-wrap gap-2">
                {platform.features.map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>

              {/* Connection details */}
              {platform.connection ? (
                <div className="space-y-3">
                  {/* Show warning if token expired */}
                  {(platform.connection.status === 'expired' || platform.connection.status === 'EXPIRED') && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <p className="text-sm text-red-800">
                          Access token has expired. Please reconnect with a new token.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Account</p>
                      <p className="font-medium">
                        {platform.provider === 'META' 
                          ? platform.connection.metadata?.userInfo?.name || platform.connection.metadata?.name || 'Connected Account'
                          : platform.connection.metadata?.accountName || 'Connected Account'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Sync</p>
                      <p className="font-medium">
                        {formatDate(platform.connection.lastSyncAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleSyncData(platform.connection!.id, platform.name)}
                      disabled={isSyncing === platform.connection.id}
                    >
                      {isSyncing === platform.connection.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Sync Data
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestConnection(platform.connection!.id, platform.name)}
                      disabled={isSyncing === platform.connection.id}
                    >
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => platform.onConnect()}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisconnect(platform.connection!.id, platform.name)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>

                  {/* Show managed accounts inline for Google - always show for any Google connection */}
                  {platform.provider === 'GOOGLE' && (
                    <GoogleManagedAccountsInline
                      connectionId={platform.connection.id}
                      onUpdate={fetchConnections}
                    />
                  )}
                  
                  {/* Show managed accounts inline for Meta - always show for any Meta connection */}
                  {platform.provider === 'META' && (
                    <MetaManagedAccountsInline
                      connectionId={platform.connection.id}
                      onUpdate={fetchConnections}
                    />
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Not connected</p>
                    <p className="text-xs text-muted-foreground">
                      Connect your {platform.name} account to start syncing campaigns
                    </p>
                  </div>
                  <Button onClick={() => platform.onConnect()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Manual Connection for Development */}
      {showManualConnection && (
        <MetaManualConnection 
          onSuccess={() => {
            fetchConnections()
            setShowManualConnection(false)
          }}
        />
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Need Help?</CardTitle>
          <CardDescription>
            Learn how to set up your platform connections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="link" className="justify-start p-0 h-auto">
            <ExternalLink className="h-4 w-4 mr-2" />
            Meta Business Manager Setup Guide
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button variant="link" className="justify-start p-0 h-auto">
            <ExternalLink className="h-4 w-4 mr-2" />
            Google Ads API Access Guide
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button 
            variant="link" 
            className="justify-start p-0 h-auto"
            onClick={() => setShowManualConnection(!showManualConnection)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {showManualConnection ? "Hide" : "Show"} Manual Token Connection (Development)
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <MetaConnectionDialog 
        open={showMetaDialog} 
        onOpenChange={setShowMetaDialog}
        onSuccess={() => {
          fetchConnections()
          setShowMetaDialog(false)
        }}
      />
      
      <GoogleConnectionDialog 
        open={showGoogleDialog} 
        onOpenChange={setShowGoogleDialog}
        onSuccess={() => {
          fetchConnections()
          setShowGoogleDialog(false)
        }}
      />
    </div>
  )
}