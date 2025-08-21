"use client"

import { useState } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  Facebook,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  Loader2,
  Info,
  Key,
  Globe,
  Shield,
  ChevronRight
} from "lucide-react"

interface MetaConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function MetaConnectionDialog({ open, onOpenChange, onSuccess }: MetaConnectionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [activeTab, setActiveTab] = useState("instructions")
  const { toast } = useToast()
  
  // Form fields
  const [appId, setAppId] = useState("")
  const [appSecret, setAppSecret] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [adAccountId, setAdAccountId] = useState("")

  const handleTest = async () => {
    if (!appId || !appSecret || !accessToken) {
      toast({
        title: "Missing credentials",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      setIsTesting(true)
      const response = await fetch('/api/connections/meta/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId,
          appSecret,
          accessToken,
          adAccountId
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Connection successful",
          description: `Connected to ${data.accountName || 'Meta account'}`,
        })
        setActiveTab("credentials")
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Connection test failed')
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Meta",
        variant: "destructive"
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    if (!appId || !appSecret || !accessToken) {
      toast({
        title: "Missing credentials",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/connections/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId,
          appSecret,
          accessToken,
          adAccountId
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Meta connection saved successfully",
        })
        onSuccess()
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save connection')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save connection",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Facebook className="h-6 w-6 text-blue-600" />
            <div>
              <DialogTitle>Connect Meta Business Account</DialogTitle>
              <DialogDescription>
                Connect your Meta Business account to sync Facebook and Instagram ad campaigns
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instructions">Setup Instructions</TabsTrigger>
            <TabsTrigger value="credentials">Enter Credentials</TabsTrigger>
          </TabsList>

          <TabsContent value="instructions" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Before you begin</AlertTitle>
              <AlertDescription>
                You'll need a Meta Business account with admin access to your ad accounts.
                This process takes about 10-15 minutes.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">1</Badge>
                  <h4 className="font-semibold">Create a Meta App</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Go to Meta for Developers and create a new app for business integrations.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">
                      Open Meta for Developers
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>Click "Create App"</li>
                    <li>Choose "Business" as the app type</li>
                    <li>Enter your app details and create the app</li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">2</Badge>
                  <h4 className="font-semibold">Configure Marketing API</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Add the Marketing API product to your app.
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>In your app dashboard, click "Add Product"</li>
                    <li>Find "Marketing API" and click "Set Up"</li>
                    <li>Follow the setup wizard</li>
                  </ul>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">3</Badge>
                  <h4 className="font-semibold">Get Your App Credentials</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Copy your App ID and App Secret from the app settings.
                  </p>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">App ID</p>
                        <p className="text-xs text-muted-foreground">Found in Settings → Basic</p>
                      </div>
                      <Key className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">App Secret</p>
                        <p className="text-xs text-muted-foreground">Click "Show" in Settings → Basic</p>
                      </div>
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">4</Badge>
                  <h4 className="font-semibold">Generate Access Token</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Generate a long-lived access token for your app.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer">
                      Open Graph API Explorer
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>Select your app from the dropdown</li>
                    <li>Click "Generate Access Token"</li>
                    <li>Grant the following permissions:
                      <ul className="ml-4 mt-1 space-y-0.5">
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          ads_read
                        </li>
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          ads_management
                        </li>
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          business_management
                        </li>
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          insights
                        </li>
                      </ul>
                    </li>
                    <li>Copy the generated access token</li>
                  </ul>
                </div>
              </div>

              {/* Step 5 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">5</Badge>
                  <h4 className="font-semibold">Get Ad Account ID (Optional)</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Find your Ad Account ID in Meta Business Manager.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://business.facebook.com/settings/ad-accounts" target="_blank" rel="noopener noreferrer">
                      Open Business Settings
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    The Ad Account ID starts with "act_" followed by numbers
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("credentials")}>
                Continue to Credentials
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-4 mt-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Secure Storage</AlertTitle>
              <AlertDescription>
                Your credentials are encrypted and stored securely. We never share your API keys.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appId">
                  App ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="appId"
                  placeholder="Enter your Meta App ID"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Found in your app's Settings → Basic
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appSecret">
                  App Secret <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="appSecret"
                  type="password"
                  placeholder="Enter your Meta App Secret"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Click "Show" in Settings → Basic to reveal
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessToken">
                  Access Token <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder="Enter your access token"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(accessToken)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generated from Graph API Explorer
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adAccountId">
                  Ad Account ID (Optional)
                </Label>
                <Input
                  id="adAccountId"
                  placeholder="act_123456789 (optional)"
                  value={adAccountId}
                  onChange={(e) => setAdAccountId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to sync all accessible ad accounts
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || !appId || !appSecret || !accessToken}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isLoading || !appId || !appSecret || !accessToken}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Connection'
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}