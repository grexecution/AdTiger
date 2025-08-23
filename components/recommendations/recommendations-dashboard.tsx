"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EnhancedRecommendationCard } from "./enhanced-recommendation-card"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Palette,
  Target,
  Zap,
  BrainCircuit,
  Sparkles,
  Plus
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function RecommendationsDashboard() {
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [grouped, setGrouped] = useState<Record<string, any[]>>({})
  const [stats, setStats] = useState<any>({})
  const [campaignData, setCampaignData] = useState<Record<string, any>>({})
  const [historicalData, setHistoricalData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/recommendations")
      const data = await response.json()
      
      setRecommendations(data.recommendations || [])
      setGrouped(data.grouped || {})
      setStats(data.stats || {})
      
      // Fetch additional data for each recommendation's campaign
      const campaignIds = [...new Set(data.recommendations?.map((r: any) => r.scopeId).filter(Boolean))]
      
      if (campaignIds.length > 0) {
        // Fetch campaign details and historical data
        const histDataPromises = campaignIds.map(async (campaignId) => {
          try {
            const histResponse = await fetch(`/api/campaigns/${campaignId}/insights`)
            if (histResponse.ok) {
              const histData = await histResponse.json()
              return { campaignId, data: histData.insights || [] }
            }
          } catch (err) {
            console.error(`Failed to fetch history for campaign ${campaignId}:`, err)
          }
          return { campaignId, data: [] }
        })
        
        const histResults = await Promise.all(histDataPromises)
        const newHistoricalData: Record<string, any[]> = {}
        histResults.forEach(result => {
          if (result.campaignId && typeof result.campaignId === 'string') {
            newHistoricalData[result.campaignId] = result.data
          }
        })
        setHistoricalData(newHistoricalData)
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error)
      toast({
        title: "Error",
        description: "Failed to load recommendations",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchRecommendations()
    setRefreshing(false)
    toast({
      title: "Refreshed",
      description: "Recommendations have been updated"
    })
  }

  const handleGenerateNew = async () => {
    setGenerating(true)
    try {
      const response = await fetch("/api/recommendations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        toast({
          title: "AI Analysis Complete",
          description: data.message || `Generated ${data.count} new recommendations`,
        })
        
        // Refresh the list to show new recommendations
        await fetchRecommendations()
      } else {
        throw new Error(data.error || "Failed to generate recommendations")
      }
    } catch (error) {
      console.error("Failed to generate recommendations:", error)
      toast({
        title: "Error",
        description: "Failed to generate new recommendations",
        variant: "destructive"
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleAction = async (action: string, recommendationId: string, extra?: any) => {
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId,
          action,
          ...extra
        })
      })

      if (response.ok) {
        // Remove from local state immediately for better UX
        setRecommendations(prev => prev.filter(r => r.id !== recommendationId))
        
        // Update grouped data
        setGrouped(prev => {
          const newGrouped = { ...prev }
          Object.keys(newGrouped).forEach(key => {
            newGrouped[key] = newGrouped[key].filter(r => r.id !== recommendationId)
          })
          return newGrouped
        })

        // Show success message
        const actionMessages = {
          accept: "Recommendation marked as done",
          dismiss: "Recommendation dismissed",
          reject: "Recommendation rejected",
          snooze: "Recommendation snoozed"
        }
        
        toast({
          title: "Success",
          description: actionMessages[action as keyof typeof actionMessages] || "Action completed"
        })
      } else {
        throw new Error("Failed to update recommendation")
      }
    } catch (error) {
      console.error("Failed to update recommendation:", error)
      toast({
        title: "Error",
        description: "Failed to update recommendation",
        variant: "destructive"
      })
    }
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, JSX.Element> = {
      performance: <TrendingUp className="h-4 w-4" />,
      budget: <DollarSign className="h-4 w-4" />,
      creative: <Palette className="h-4 w-4" />,
      targeting: <Target className="h-4 w-4" />,
      growth: <Zap className="h-4 w-4" />
    }
    return icons[category] || <AlertCircle className="h-4 w-4" />
  }

  const getFilteredRecommendations = () => {
    if (activeTab === "all") return recommendations
    if (activeTab === "critical") return recommendations.filter(r => r.priority === "critical")
    if (activeTab === "high") return recommendations.filter(r => r.priority === "high")
    return grouped[activeTab] || []
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{recommendations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.critical || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High Priority</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{stats.high || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Categories</CardDescription>
            <CardTitle className="text-2xl">{Object.keys(grouped).length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5" />
              <CardTitle>AI Recommendations</CardTitle>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI Powered
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={handleGenerateNew}
                disabled={generating}
                className="gap-2"
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Generate New
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
          <CardDescription>
            Actionable insights to optimize your campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 lg:grid-cols-8">
              <TabsTrigger value="all">
                All ({recommendations.length})
              </TabsTrigger>
              <TabsTrigger value="critical" className="text-red-600">
                Critical ({stats.critical || 0})
              </TabsTrigger>
              <TabsTrigger value="high">
                High ({stats.high || 0})
              </TabsTrigger>
              {Object.entries(grouped).slice(0, 5).map(([category, items]) => (
                <TabsTrigger key={category} value={category} className="gap-1">
                  {getCategoryIcon(category)}
                  <span className="capitalize">{category}</span>
                  <span className="ml-1">({items.length})</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {getFilteredRecommendations().length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium">All caught up!</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    No recommendations in this category. Check back later.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {getFilteredRecommendations().map((recommendation) => (
                      <EnhancedRecommendationCard
                        key={recommendation.id}
                        recommendation={recommendation}
                        onAction={handleAction}
                        historicalData={historicalData[recommendation.scopeId]}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}