"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  DollarSign,
  MousePointer,
  Package,
  Target,
  Eye
} from "lucide-react"
import { format } from "date-fns"

interface PerformanceTrendChartProps {
  entityType: 'campaign' | 'ad_group' | 'ad'
  entityId: string
  className?: string
  showSnapshots?: boolean
}

const metricConfig = {
  impressions: { 
    label: "Impressions", 
    color: "#8b5cf6", 
    icon: Eye,
    format: (v: number) => v.toLocaleString()
  },
  clicks: { 
    label: "Clicks", 
    color: "#10b981", 
    icon: MousePointer,
    format: (v: number) => v.toLocaleString()
  },
  ctr: { 
    label: "CTR", 
    color: "#3b82f6", 
    icon: Activity,
    format: (v: number) => `${v.toFixed(2)}%`
  },
  conversions: { 
    label: "Conversions", 
    color: "#f59e0b", 
    icon: Target,
    format: (v: number) => v.toLocaleString()
  },
  spend: { 
    label: "Spend", 
    color: "#ef4444", 
    icon: DollarSign,
    format: (v: number) => `$${v.toFixed(2)}`
  },
  roas: { 
    label: "ROAS", 
    color: "#14b8a6", 
    icon: Package,
    format: (v: number) => `${v.toFixed(2)}x`
  }
}

export function PerformanceTrendChart({ 
  entityType, 
  entityId, 
  className,
  showSnapshots = false 
}: PerformanceTrendChartProps) {
  const [loading, setLoading] = useState(true)
  const [trendData, setTrendData] = useState<any>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("30d")
  const [selectedMetric, setSelectedMetric] = useState("clicks")
  const [snapshots, setSnapshots] = useState<any[]>([])

  useEffect(() => {
    fetchTrendData()
  }, [entityType, entityId, selectedPeriod])

  const fetchTrendData = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/performance/trends?entityType=${entityType}&entityId=${entityId}&period=${selectedPeriod}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setTrendData(data)
        
        if (showSnapshots && data.snapshots) {
          setSnapshots(data.snapshots)
        }
      }
    } catch (error) {
      console.error("Failed to fetch trend data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = () => {
    if (!trendData) return null
    
    const score = trendData.trendScore || 0
    if (score > 0.1) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (score < -0.1) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getTrendLabel = () => {
    if (!trendData) return "Loading..."
    
    const score = trendData.trendScore || 0
    const volatility = trendData.volatility || 0
    
    let trend = "Stable"
    if (score > 0.1) trend = "Improving"
    else if (score < -0.1) trend = "Declining"
    
    let volatilityLabel = "Low"
    if (volatility > 0.6) volatilityLabel = "High"
    else if (volatility > 0.3) volatilityLabel = "Medium"
    
    return `${trend} (${volatilityLabel} volatility)`
  }

  const formatChartData = () => {
    if (!trendData?.data) return []
    
    return trendData.data.map((item: any) => ({
      date: format(new Date(item.date), "MMM dd"),
      ...item.metrics
    }))
  }

  const getSnapshotComparison = (snapshot: any) => {
    const comparison = snapshot.comparison?.spend
    if (!comparison) return null
    
    const change = comparison.change || 0
    const direction = comparison.direction || 'stable'
    
    return {
      change: Math.abs(change).toFixed(1),
      isUp: direction === 'up',
      isDown: direction === 'down'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  const chartData = formatChartData()
  const MetricIcon = metricConfig[selectedMetric as keyof typeof metricConfig].icon

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Performance Trend
              {getTrendIcon()}
            </CardTitle>
            <CardDescription>{getTrendLabel()}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <TabsList>
                <TabsTrigger value="7d">7D</TabsTrigger>
                <TabsTrigger value="30d">30D</TabsTrigger>
                <TabsTrigger value="90d">90D</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Metric Selection */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(metricConfig).map(([key, config]) => {
            const Icon = config.icon
            return (
              <Button
                key={key}
                variant={selectedMetric === key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMetric(key)}
                className="gap-1"
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </Button>
            )
          })}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                <stop 
                  offset="5%" 
                  stopColor={metricConfig[selectedMetric as keyof typeof metricConfig].color} 
                  stopOpacity={0.3}
                />
                <stop 
                  offset="95%" 
                  stopColor={metricConfig[selectedMetric as keyof typeof metricConfig].color} 
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={metricConfig[selectedMetric as keyof typeof metricConfig].format}
            />
            <Tooltip 
              formatter={(value: any) => 
                metricConfig[selectedMetric as keyof typeof metricConfig].format(value)
              }
            />
            <Area
              type="monotone"
              dataKey={selectedMetric}
              stroke={metricConfig[selectedMetric as keyof typeof metricConfig].color}
              strokeWidth={2}
              fill={`url(#gradient-${selectedMetric})`}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Performance Snapshots */}
        {showSnapshots && snapshots.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-3">Period Comparisons</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {snapshots.map((snapshot) => {
                const comparison = getSnapshotComparison(snapshot)
                return (
                  <div 
                    key={snapshot.id} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground capitalize">
                        {snapshot.snapshotType}
                      </p>
                      <p className="text-sm font-medium">
                        ${snapshot.metrics?.spend?.toFixed(2) || '0'}
                      </p>
                    </div>
                    {comparison && (
                      <Badge 
                        variant={comparison.isUp ? "destructive" : comparison.isDown ? "secondary" : "outline"}
                        className="gap-1"
                      >
                        {comparison.isUp ? "+" : comparison.isDown ? "-" : ""}
                        {comparison.change}%
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {trendData?.avgMetrics && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-3">Average Performance</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Avg CTR</p>
                <p className="text-sm font-medium">
                  {trendData.avgMetrics.ctr?.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg CPC</p>
                <p className="text-sm font-medium">
                  ${trendData.avgMetrics.cpc?.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg ROAS</p>
                <p className="text-sm font-medium">
                  {trendData.avgMetrics.roas?.toFixed(2)}x
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Spend</p>
                <p className="text-sm font-medium">
                  ${(trendData.avgMetrics.spend * chartData.length).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}