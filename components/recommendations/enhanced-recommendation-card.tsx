"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Target,
  Palette,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Clock,
  MoreVertical,
  Eye,
  MousePointer,
  Image as ImageIcon,
  Video,
  FileText,
  ExternalLink,
  ChartLine,
  BarChart3
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"

interface EnhancedRecommendationCardProps {
  recommendation: any
  onAction: (action: string, recommendationId: string, extra?: any) => Promise<void>
  campaignData?: any
  adsData?: any[]
  historicalData?: any[]
}

export function EnhancedRecommendationCard({ 
  recommendation, 
  onAction,
  campaignData,
  adsData,
  historicalData
}: EnhancedRecommendationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState('ctr')

  const handleAction = async (action: string, extra?: any) => {
    setLoading(action)
    try {
      await onAction(action, recommendation.id, extra)
    } finally {
      setLoading(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'default'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance':
        return <TrendingUp className="h-4 w-4" />
      case 'budget':
        return <DollarSign className="h-4 w-4" />
      case 'creative':
        return <Palette className="h-4 w-4" />
      case 'targeting':
        return <Target className="h-4 w-4" />
      case 'growth':
        return <Zap className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getAdTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      case 'carousel':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const formatMetric = (key: string, value: any) => {
    if (!value && value !== 0) return 'N/A'
    if (key.includes('spend') || key.includes('cpc') || key.includes('budget') || key.includes('cost')) {
      return `$${parseFloat(value).toFixed(2)}`
    }
    if (key.includes('ctr') || key.includes('rate')) {
      return `${parseFloat(value).toFixed(2)}%`
    }
    if (key.includes('roas')) {
      return `${parseFloat(value).toFixed(2)}x`
    }
    return value.toLocaleString()
  }

  // Prepare chart data
  const chartData = historicalData?.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    ctr: d.metrics?.ctr || 0,
    cpc: d.metrics?.cpc || 0,
    roas: d.metrics?.roas || 0,
    spend: d.metrics?.spend || 0,
    conversions: d.metrics?.conversions || 0,
    clicks: d.metrics?.clicks || 0
  })) || []

  const metricConfig = {
    ctr: { label: 'CTR (%)', color: '#8884d8', format: (v: number) => `${v.toFixed(2)}%` },
    cpc: { label: 'CPC ($)', color: '#82ca9d', format: (v: number) => `$${v.toFixed(2)}` },
    roas: { label: 'ROAS', color: '#ffc658', format: (v: number) => `${v.toFixed(2)}x` },
    spend: { label: 'Spend ($)', color: '#ff7c7c', format: (v: number) => `$${v.toFixed(0)}` },
    conversions: { label: 'Conversions', color: '#8dd1e1', format: (v: number) => v.toFixed(0) },
    clicks: { label: 'Clicks', color: '#d084d0', format: (v: number) => v.toFixed(0) }
  }

  // Mock ad creative data if not provided
  const mockAds = adsData || [
    {
      id: '1',
      name: 'Top Performing Ad',
      type: 'image',
      status: 'ACTIVE',
      thumbnail: 'https://via.placeholder.com/300x200/3b82f6/ffffff?text=Ad+Creative',
      metrics: {
        ctr: 2.5,
        conversions: 45,
        spend: 850
      }
    },
    {
      id: '2', 
      name: 'Video Campaign',
      type: 'video',
      status: 'ACTIVE',
      thumbnail: 'https://via.placeholder.com/300x200/8b5cf6/ffffff?text=Video+Ad',
      metrics: {
        ctr: 1.8,
        conversions: 32,
        spend: 620
      }
    }
  ]

  return (
    <Card className={cn(
      "transition-all duration-200",
      "hover:shadow-lg",
      recommendation.priority === 'critical' && "border-red-500/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{recommendation.title}</CardTitle>
              <Badge variant={getPriorityColor(recommendation.priority)}>
                {recommendation.priority}
              </Badge>
              <Badge variant="outline" className="gap-1">
                {getCategoryIcon(recommendation.category)}
                {recommendation.category}
              </Badge>
            </div>
            <CardDescription>
              {recommendation.campaign?.name || 'Unknown Campaign'} • {recommendation.provider}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAction('snooze', { days: 7 })}>
                  <Clock className="mr-2 h-4 w-4" />
                  Snooze for 1 week
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleAction('dismiss')}
                  className="text-red-600"
                >
                  <X className="mr-2 h-4 w-4" />
                  Dismiss
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* AI Explanation */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm leading-relaxed">
              {recommendation.aiExplanation || recommendation.description}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-4 gap-3">
            {recommendation.metricsSnapshot && Object.entries(recommendation.metricsSnapshot).slice(0, 4).map(([key, value]) => (
              <div key={key} className="text-center">
                <p className="text-xs text-muted-foreground capitalize mb-1">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="text-sm font-semibold">
                  {formatMetric(key, value)}
                </p>
              </div>
            ))}
          </div>

          {/* Expanded Content */}
          {expanded && (
            <Tabs defaultValue="performance" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="performance">
                  <ChartLine className="h-4 w-4 mr-1" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="creatives">
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Ad Creatives
                </TabsTrigger>
                <TabsTrigger value="details">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Details
                </TabsTrigger>
              </TabsList>

              {/* Performance Tab */}
              <TabsContent value="performance" className="space-y-4">
                {/* Metric Selector */}
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(metricConfig).map(([key, config]) => (
                    <Button
                      key={key}
                      variant={selectedMetric === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedMetric(key)}
                    >
                      {config.label}
                    </Button>
                  ))}
                </div>

                {/* Chart */}
                {chartData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any) => metricConfig[selectedMetric as keyof typeof metricConfig].format(value)}
                        />
                        <Area
                          type="monotone"
                          dataKey={selectedMetric}
                          stroke={metricConfig[selectedMetric as keyof typeof metricConfig].color}
                          fill={metricConfig[selectedMetric as keyof typeof metricConfig].color}
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center border rounded-lg">
                    <p className="text-muted-foreground">No historical data available</p>
                  </div>
                )}

                {/* Performance Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">7-Day Trend</h4>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm">+15.3% CTR improvement</span>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">Best Day</h4>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Tuesday (2.8% CTR)</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Ad Creatives Tab */}
              <TabsContent value="creatives" className="space-y-4">
                <ScrollArea className="w-full">
                  <div className="flex gap-4 pb-4">
                    {mockAds.map((ad) => (
                      <Card key={ad.id} className="min-w-[250px]">
                        <div className="relative aspect-video bg-muted">
                          <img
                            src={ad.thumbnail}
                            alt={ad.name}
                            className="object-cover w-full h-full rounded-t-lg"
                          />
                          <Badge className="absolute top-2 right-2 gap-1">
                            {getAdTypeIcon(ad.type)}
                            {ad.type}
                          </Badge>
                        </div>
                        <CardContent className="p-3">
                          <p className="font-medium text-sm mb-2">{ad.name}</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">CTR</p>
                              <p className="font-medium">{ad.metrics.ctr}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Conv.</p>
                              <p className="font-medium">{ad.metrics.conversions}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Spend</p>
                              <p className="font-medium">${ad.metrics.spend}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="w-full mt-3 gap-1">
                            <ExternalLink className="h-3 w-3" />
                            View in {recommendation.provider === 'meta' ? 'Meta Ads' : 'Google Ads'}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4">
                {/* Estimated Impact */}
                {recommendation.estimatedImpact && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Estimated Impact</h4>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                      {Object.entries(recommendation.estimatedImpact).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center py-1">
                          <span className="text-sm text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm font-medium">
                            {typeof value === 'boolean' ? (value ? '✓' : '✗') : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confidence Score */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Analysis Confidence</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${recommendation.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {(recommendation.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Full Metrics</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {recommendation.metricsSnapshot && Object.entries(recommendation.metricsSnapshot).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1 px-2 bg-muted/30 rounded">
                        <span className="text-xs text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-medium">
                          {formatMetric(key, value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleAction('accept')}
              disabled={loading !== null}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Mark as Done
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction('snooze', { days: 7 })}
              disabled={loading !== null}
              className="gap-2"
            >
              <Clock className="h-4 w-4" />
              Snooze
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAction('dismiss')}
              disabled={loading !== null}
              className="gap-2 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
              Dismiss
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}