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
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  Loader2,
  Info,
  Key,
  Globe,
  Shield,
  ChevronRight,
  User,
  Building,
  Code2
} from "lucide-react"

interface GoogleConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function GoogleConnectionDialog({ open, onOpenChange, onSuccess }: GoogleConnectionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [activeTab, setActiveTab] = useState("instructions")
  const { toast } = useToast()
  
  // Form fields
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [refreshToken, setRefreshToken] = useState("")
  const [developerToken, setDeveloperToken] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [managerCustomerId, setManagerCustomerId] = useState("")

  const handleTest = async () => {
    if (!clientId || !clientSecret || !refreshToken || !developerToken || !customerId) {
      toast({
        title: "Missing credentials",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      setIsTesting(true)
      const response = await fetch('/api/connections/google/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientSecret,
          refreshToken,
          developerToken,
          customerId,
          managerCustomerId
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Connection successful",
          description: `Connected to ${data.accountName || 'Google Ads account'}`,
        })
        setActiveTab("credentials")
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Connection test failed')
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Google Ads",
        variant: "destructive"
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    if (!clientId || !clientSecret || !refreshToken || !developerToken || !customerId) {
      toast({
        title: "Missing credentials",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/connections/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientSecret,
          refreshToken,
          developerToken,
          customerId,
          managerCustomerId
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Google Ads connection saved successfully",
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
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 p-0.5">
              <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
                <span className="text-xs font-bold">G</span>
              </div>
            </div>
            <div>
              <DialogTitle>Connect Google Ads Account</DialogTitle>
              <DialogDescription>
                Connect your Google Ads account to sync Search, Display, YouTube, and Shopping campaigns
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
                You'll need a Google Ads account with API access enabled. This process requires
                creating a Google Cloud project and may take 20-30 minutes.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">1</Badge>
                  <h4 className="font-semibold">Apply for Google Ads API Access</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Request a developer token to access the Google Ads API.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://ads.google.com/aw/apicenter" target="_blank" rel="noopener noreferrer">
                      Open Google Ads API Center
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>Sign in to your Google Ads manager account</li>
                    <li>Navigate to Tools & Settings → Setup → API Center</li>
                    <li>Click "Apply for Access" if you don't have a developer token</li>
                    <li>Fill out the application form</li>
                    <li>Copy your developer token once approved</li>
                  </ul>
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-sm">
                      <strong>Note:</strong> Basic access is usually approved instantly. 
                      Standard access may take 1-2 business days.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">2</Badge>
                  <h4 className="font-semibold">Create a Google Cloud Project</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Set up a project in Google Cloud Console for OAuth2 authentication.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener noreferrer">
                      Create New Project
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>Enter a project name (e.g., "AdFire Integration")</li>
                    <li>Click "Create" and wait for the project to be created</li>
                    <li>Make note of your Project ID</li>
                  </ul>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">3</Badge>
                  <h4 className="font-semibold">Enable Google Ads API</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Enable the Google Ads API in your Cloud project.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://console.cloud.google.com/apis/library/googleads.googleapis.com" target="_blank" rel="noopener noreferrer">
                      Enable Google Ads API
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>Select your project from the dropdown</li>
                    <li>Click "Enable" on the Google Ads API page</li>
                  </ul>
                </div>
              </div>

              {/* Step 4 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">4</Badge>
                  <h4 className="font-semibold">Create OAuth2 Credentials</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Set up OAuth2 credentials for secure authentication.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
                      Open Credentials Page
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>Click "Create Credentials" → "OAuth client ID"</li>
                    <li>Choose "Web application" as the application type</li>
                    <li>Add authorized redirect URI:
                      <code className="block mt-1 p-2 bg-muted rounded text-xs">
                        https://developers.google.com/oauthplayground
                      </code>
                    </li>
                    <li>Click "Create" and save your credentials:
                      <div className="grid gap-2 mt-2">
                        <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <span className="text-xs font-medium">Client ID</span>
                          <Key className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <span className="text-xs font-medium">Client Secret</span>
                          <Shield className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step 5 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">5</Badge>
                  <h4 className="font-semibold">Generate Refresh Token</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Use OAuth Playground to generate a refresh token.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer">
                      Open OAuth Playground
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>Click the settings gear icon → Check "Use your own OAuth credentials"</li>
                    <li>Enter your Client ID and Client Secret</li>
                    <li>In Step 1, find and select:
                      <code className="block mt-1 p-2 bg-muted rounded text-xs">
                        https://www.googleapis.com/auth/adwords
                      </code>
                    </li>
                    <li>Click "Authorize APIs" and grant access</li>
                    <li>In Step 2, click "Exchange authorization code for tokens"</li>
                    <li>Copy the <strong>Refresh Token</strong></li>
                  </ul>
                </div>
              </div>

              {/* Step 6 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">6</Badge>
                  <h4 className="font-semibold">Get Customer IDs</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Find your Google Ads Customer ID(s).
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer">
                      Open Google Ads
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>Your Customer ID is shown in the top right (format: XXX-XXX-XXXX)</li>
                    <li>Remove dashes when entering (e.g., 1234567890)</li>
                    <li>If using a manager account, note both:
                      <ul className="ml-4 mt-1 space-y-0.5">
                        <li className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          Manager Customer ID
                        </li>
                        <li className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Client Customer ID
                        </li>
                      </ul>
                    </li>
                  </ul>
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
                <Label htmlFor="developerToken">
                  Developer Token <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="developerToken"
                  type="password"
                  placeholder="Enter your Google Ads developer token"
                  value={developerToken}
                  onChange={(e) => setDeveloperToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Found in Google Ads → Tools & Settings → API Center
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId">
                  OAuth2 Client ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientId"
                  placeholder="Enter your OAuth2 Client ID"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  From Google Cloud Console → Credentials
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">
                  OAuth2 Client Secret <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="Enter your OAuth2 Client Secret"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  From Google Cloud Console → Credentials
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refreshToken">
                  Refresh Token <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="refreshToken"
                    type="password"
                    placeholder="Enter your refresh token"
                    value={refreshToken}
                    onChange={(e) => setRefreshToken(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(refreshToken)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generated from OAuth Playground
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerId">
                  Customer ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customerId"
                  placeholder="1234567890 (without dashes)"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value.replace(/-/g, ''))}
                />
                <p className="text-xs text-muted-foreground">
                  Your Google Ads account ID (remove dashes)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="managerCustomerId">
                  Manager Customer ID (Optional)
                </Label>
                <Input
                  id="managerCustomerId"
                  placeholder="9876543210 (optional, for MCC accounts)"
                  value={managerCustomerId}
                  onChange={(e) => setManagerCustomerId(e.target.value.replace(/-/g, ''))}
                />
                <p className="text-xs text-muted-foreground">
                  Only needed if using a manager (MCC) account
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || !clientId || !clientSecret || !refreshToken || !developerToken || !customerId}
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
                  disabled={isLoading || !clientId || !clientSecret || !refreshToken || !developerToken || !customerId}
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