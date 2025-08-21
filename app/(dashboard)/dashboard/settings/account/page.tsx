"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Building, 
  Users, 
  Calendar,
  Globe,
  DollarSign,
  Loader2,
  AlertCircle,
  Activity,
  TrendingUp,
  Zap,
  RefreshCw
} from "lucide-react"

export default function AccountPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [accountData, setAccountData] = useState<any>(null)
  const [editedData, setEditedData] = useState({
    name: "",
    timezone: "",
    currency: ""
  })
  const { toast } = useToast()

  // Fetch account data on mount
  useEffect(() => {
    fetchAccountData()
  }, [])

  const fetchAccountData = async () => {
    try {
      const response = await fetch('/api/account')
      if (!response.ok) throw new Error('Failed to fetch account')
      const data = await response.json()
      setAccountData(data.account)
      setEditedData({
        name: data.account.name,
        timezone: data.account.timezone,
        currency: data.account.currency
      })
    } catch (error) {
      console.error('Error fetching account:', error)
      toast({
        title: "Error",
        description: "Failed to load account data",
        variant: "destructive"
      })
    } finally {
      setIsFetching(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/account/sync', {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Failed to sync account')
      
      const data = await response.json()
      
      toast({
        title: "Sync complete",
        description: `Successfully synced ${data.results.length} provider accounts`,
      })
      
      // Refresh account data
      await fetchAccountData()
    } catch (error) {
      console.error('Error syncing account:', error)
      toast({
        title: "Sync failed",
        description: "Failed to sync account data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedData)
      })
      
      if (!response.ok) throw new Error('Failed to update account')
      
      toast({
        title: "Settings saved",
        description: "Your account settings have been updated",
      })
      
      // Refresh data
      await fetchAccountData()
    } catch (error) {
      console.error('Error saving account:', error)
      toast({
        title: "Error",
        description: "Failed to save account settings",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!accountData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load account data. Please refresh the page.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account details and preferences
        </p>
      </div>
      
      <Separator />

      {/* Account Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Account Overview</CardTitle>
              <CardDescription>
                Basic information about your account
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Data
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name</Label>
            <Input
              id="accountName"
              value={editedData.name}
              onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
              placeholder="Enter account name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plan</Label>
              <div className="flex items-center gap-2">
                <Badge variant={accountData.plan === "Professional" ? "default" : accountData.plan === "Growth" ? "secondary" : "outline"}>
                  {accountData.plan}
                </Badge>
                {accountData.plan !== "Professional" && (
                  <Button variant="link" size="sm" className="h-auto p-0">
                    Upgrade
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Team Members</Label>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {accountData.users} / {accountData.maxUsers} users
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Account Created</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(accountData.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Connected Platforms</Label>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {accountData.connections.map((conn: any) => (
                    <Badge key={conn.provider} variant="outline" className="text-xs">
                      {conn.provider}
                    </Badge>
                  ))}
                  {accountData.connections.length === 0 && (
                    <span className="text-sm text-muted-foreground">No connections</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Campaigns</Label>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{accountData.stats.campaigns}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total Ads</Label>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{accountData.stats.ads}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ad Accounts</Label>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{accountData.stats.adAccounts}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regional Settings</CardTitle>
          <CardDescription>
            Configure your timezone and currency preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editedData.timezone}
                onChange={(e) => setEditedData({ ...editedData, timezone: e.target.value })}
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editedData.currency}
                onChange={(e) => setEditedData({ ...editedData, currency: e.target.value })}
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="JPY">JPY - Japanese Yen</option>
              </select>
            </div>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Currency settings affect how monetary values are displayed throughout the application.
              This does not convert actual campaign budgets.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>
            Manage team members and their access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accountData.teamMembers && accountData.teamMembers.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{member.name || member.email}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    Member since {new Date(member.createdAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            ))}
            
            {accountData.users < accountData.maxUsers && (
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Invite Team Member
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  )
}