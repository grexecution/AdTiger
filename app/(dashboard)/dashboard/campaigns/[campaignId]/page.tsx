"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { PerformanceTrendChart } from "@/components/performance/performance-trend-chart"
import {
  ArrowLeft,
  BarChart3,
  DollarSign,
  Eye,
  MousePointer,
  Package,
  Target,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Settings,
  ExternalLink
} from "lucide-react"
import { format } from "date-fns"

const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
    active: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
    paused: { variant: "secondary", icon: <Pause className="h-3 w-3" /> },
    deleted: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    draft: { variant: "outline", icon: <Clock className="h-3 w-3" /> }
  }
  
  const config = variants[status] || variants.draft
  
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {status}
    </Badge>
  )
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.campaignId as string
  
  const [campaign, setCampaign] = useState<any>(null)
  const [adGroups, setAdGroups] = useState<any[]>([])
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    fetchCampaignData()
  }, [campaignId])

  const fetchCampaignData = async () => {
    try {
      setLoading(true)
      
      // Fetch campaign details
      const campaignResponse = await fetch(`/api/campaigns/${campaignId}`)
      if (campaignResponse.ok) {
        const campaignData = await campaignResponse.json()
        setCampaign(campaignData)
      }
      
      // Fetch ad groups
      const adGroupsResponse = await fetch(`/api/campaigns/${campaignId}/ad-groups`)
      if (adGroupsResponse.ok) {
        const adGroupsData = await adGroupsResponse.json()
        setAdGroups(adGroupsData.adGroups || [])
      }
      
      // Fetch insights
      const insightsResponse = await fetch(`/api/campaigns/${campaignId}/insights`)
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json()
        setInsights(insightsData)
      }
    } catch (error) {
      console.error("Failed to fetch campaign data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const latestMetrics = insights?.insights?.[insights.insights.length - 1]?.metrics || {}

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign?.name || "Campaign Details"}</h1>
            <p className="text-sm text-muted-foreground">
              {campaign?.provider === 'meta' ? 'Meta Ads' : 'Google Ads'} • 
              Created {campaign?.createdAt ? format(new Date(campaign.createdAt), 'MMM dd, yyyy') : 'Unknown'}
            </p>
          </div>
          <StatusBadge status={campaign?.status || 'draft'} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            View in {campaign?.provider === 'meta' ? 'Meta' : 'Google'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${latestMetrics.spend?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Budget: ${campaign?.budgetAmount?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestMetrics.impressions?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              CTR: {latestMetrics.ctr?.toFixed(2) || '0'}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestMetrics.conversions?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              CVR: {latestMetrics.cvr?.toFixed(2) || '0'}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROAS</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestMetrics.roas?.toFixed(2) || '0'}x
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue: ${latestMetrics.revenue?.toFixed(2) || '0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend Chart */}
      <PerformanceTrendChart
        entityType="campaign"
        entityId={campaignId}
        showSnapshots={true}
      />

      {/* Tabs Section */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>
            Manage your campaign settings, ad groups, and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="adgroups">
                Ad Groups ({adGroups.length})
              </TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Objective</p>
                  <p className="font-medium capitalize">
                    {campaign?.objective || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Daily Budget</p>
                  <p className="font-medium">
                    ${campaign?.budgetAmount?.toFixed(2) || '0'} {campaign?.budgetCurrency || 'USD'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {campaign?.startDate ? format(new Date(campaign.startDate), 'MMM dd, yyyy') : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {campaign?.endDate ? format(new Date(campaign.endDate), 'MMM dd, yyyy') : 'Ongoing'}
                  </p>
                </div>
              </div>
              
              {/* Recent Performance */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Recent Performance (Last 7 Days)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-xs text-muted-foreground">Avg. CTR</p>
                    <p className="text-lg font-bold">
                      {(Math.random() * 3 + 1).toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-xs text-muted-foreground">Avg. CPC</p>
                    <p className="text-lg font-bold">
                      ${(Math.random() * 2 + 0.5).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-xs text-muted-foreground">Avg. CPM</p>
                    <p className="text-lg font-bold">
                      ${(Math.random() * 20 + 5).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-xs text-muted-foreground">Frequency</p>
                    <p className="text-lg font-bold">
                      {(Math.random() * 2 + 1).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="adgroups" className="space-y-4 mt-6">
              {adGroups.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No ad groups found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {adGroups.map((adGroup) => (
                    <div key={adGroup.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <p className="font-medium">{adGroup.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {adGroup.adsCount || 0} ads • 
                          Budget: ${adGroup.budgetAmount?.toFixed(2) || '0'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={adGroup.status} />
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Campaign Settings</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm">Campaign ID</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {campaign?.id}
                      </code>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm">External ID</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {campaign?.externalId}
                      </code>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm">Provider</span>
                      <Badge variant="outline">
                        {campaign?.provider}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}