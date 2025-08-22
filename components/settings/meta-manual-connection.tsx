"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { 
  Facebook,
  AlertCircle,
  Loader2,
  ExternalLink,
  Key
} from "lucide-react"
import { MetaAccountSelector } from "./meta-account-selector"

interface MetaManualConnectionProps {
  onSuccess: () => void
}

export function MetaManualConnection({ onSuccess }: MetaManualConnectionProps) {
  const [accessToken, setAccessToken] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [showAccountSelector, setShowAccountSelector] = useState(false)
  const [connectionData, setConnectionData] = useState<{
    connectionId: string
    accounts: any[]
  } | null>(null)
  const { toast } = useToast()

  const handleConnect = async () => {
    if (!accessToken.trim()) {
      toast({
        title: "Missing token",
        description: "Please enter your access token",
        variant: "destructive"
      })
      return
    }

    setIsConnecting(true)
    try {
      // Test the token
      const testResponse = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${accessToken}`)
      const testData = await testResponse.json()
      
      console.log("Meta user data:", testData)
      
      if (!testResponse.ok || testData.error) {
        throw new Error(testData.error?.message || "Invalid token")
      }

      // Get all ad accounts (with pagination)
      let allAccounts: any[] = []
      let nextUrl = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=100&access_token=${accessToken}`
      
      while (nextUrl) {
        const accountsResponse = await fetch(nextUrl)
        const accountsData = await accountsResponse.json()
        
        if (accountsData.error) {
          throw new Error(accountsData.error?.message || "Failed to fetch ad accounts")
        }
        
        if (accountsData.data) {
          allAccounts = [...allAccounts, ...accountsData.data]
        }
        
        // Check if there are more pages
        nextUrl = accountsData.paging?.next || null
        console.log(`Fetched ${accountsData.data?.length || 0} accounts, total so far: ${allAccounts.length}`)
      }
      
      console.log("All Meta ad accounts:", allAccounts.length, "accounts found")

      // Save the connection
      const response = await fetch("/api/connections/meta/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          user: testData,
          adAccounts: allAccounts
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Show account selector instead of immediate success
        setConnectionData({
          connectionId: data.connectionId,
          accounts: allAccounts
        })
        setShowAccountSelector(true)
      } else {
        const errorData = await response.json()
        console.error("Connection save failed:", errorData)
        throw new Error(errorData.details || errorData.error || "Failed to save connection")
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect Meta account",
        variant: "destructive"
      })
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Facebook className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <CardTitle>Manual Token Connection</CardTitle>
            <CardDescription>
              For development/testing while waiting for API approval
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>To get an access token:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to the Graph API Explorer</li>
                <li>Select your app</li>
                <li>Get User Access Token with ads_read permission</li>
                <li>Copy and paste the token below</li>
              </ol>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto"
                asChild
              >
                <a 
                  href="https://developers.facebook.com/tools/explorer" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Open Graph API Explorer
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="token">Access Token</Label>
          <div className="flex gap-2">
            <Input
              id="token"
              type="password"
              placeholder="Paste your access token here"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !accessToken.trim()}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    {connectionData && (
      <MetaAccountSelector
        isOpen={showAccountSelector}
        onClose={() => setShowAccountSelector(false)}
        accounts={connectionData.accounts}
        connectionId={connectionData.connectionId}
        onSuccess={onSuccess}
      />
    )}
  </>
  )
}