"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  User, 
  Zap,
  Target,
  Image as ImageIcon,
  Activity,
  Filter,
} from "lucide-react"
import { format } from "date-fns"

interface Change {
  id: string
  changeType: string
  fieldName: string
  oldValue: any
  newValue: any
  detectedAt: string
  changeSource: 'ADMIN_EDIT' | 'PLATFORM_SYNC' | 'AUTO_OPTIMIZATION'
  user?: {
    name: string
    email: string
  }
  performanceBefore: {
    clicks: number
    impressions: number
    ctr: number
    spend: number
    conversions: number
  } | null
  performanceAfter: {
    clicks: number
    impressions: number
    ctr: number
    spend: number
    conversions: number
  } | null
  insights: Array<{
    date: Date
    metrics: any
  }>
}

interface AdTimelineViewProps {
  adId: string
  accountId: string
}

export function AdTimelineView({ adId, accountId }: AdTimelineViewProps) {
  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'clicks' | 'impressions' | 'ctr' | 'conversions'>('clicks')
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>('all')

  useEffect(() => {
    fetchChangesWithPerformance()
  }, [adId])

  const fetchChangesWithPerformance = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/changes/timeline?adId=${adId}&daysAround=7`)
      if (response.ok) {
        const data = await response.json()
        setChanges(data.changes || [])
      }
    } catch (error) {
      console.error('Error fetching timeline:', error)
    } finally {
      setLoading(false)
    }
  }

  const getChangeIcon = (changeType: string, fieldName: string) => {
    if (fieldName.includes('targeting') || fieldName.includes('age') || fieldName.includes('geo')) {
      return <Target className="h-4 w-4" />
    }
    if (fieldName.includes('creative') || fieldName.includes('image')) {
      return <ImageIcon className="h-4 w-4" />
    }
    if (changeType === 'status_change') {
      return <Activity className="h-4 w-4" />
    }
    return <Zap className="h-4 w-4" />
  }

  const getChangeSourceBadge = (source: string) => {
    const config = {
      ADMIN_EDIT: { variant: 'default' as const, label: 'Admin' },
      PLATFORM_SYNC: { variant: 'secondary' as const, label: 'Platform' },
      AUTO_OPTIMIZATION: { variant: 'outline' as const, label: 'Auto' },
    }
    const { variant, label } = config[source as keyof typeof config] || config.PLATFORM_SYNC
    return <Badge variant={variant}>{label}</Badge>
  }

  const getPerformanceImpact = (before: any, after: any, metric: string) => {
    if (!before || !after) return null
    
    const beforeValue = before[metric] || 0
    const afterValue = after[metric] || 0
    
    if (beforeValue === 0) return null
    
    const change = ((afterValue - beforeValue) / beforeValue) * 100
    const isPositive = change > 0
    
    return {
      change: Math.abs(change),
      isPositive,
      beforeValue,
      afterValue,
    }
  }

  const renderPerformanceImpact = (change: Change) => {
    const impact = getPerformanceImpact(
      change.performanceBefore,
      change.performanceAfter,
      selectedMetric
    )

    if (!impact) {
      return <span className="text-xs text-muted-foreground">No data</span>
    }

    return (
      <div className="flex items-center gap-2">
        {impact.isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
        <span className={`text-sm font-medium ${impact.isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {impact.change.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground">
          {impact.beforeValue.toFixed(0)} → {impact.afterValue.toFixed(0)}
        </span>
      </div>
    )
  }

  const prepareChartData = () => {
    if (changes.length === 0) return []

    // Collect all dates from all changes
    const allDates = new Set<string>()
    const dataByDate: Record<string, any> = {}

    changes.forEach(change => {
      change.insights.forEach(insight => {
        const dateStr = format(new Date(insight.date), 'MMM dd')
        allDates.add(dateStr)
        
        if (!dataByDate[dateStr]) {
          dataByDate[dateStr] = {
            date: dateStr,
            fullDate: insight.date,
            [selectedMetric]: 0,
          }
        }
        
        // Add metrics
        const metrics = insight.metrics as any
        dataByDate[dateStr][selectedMetric] = (dataByDate[dateStr][selectedMetric] || 0) + (metrics[selectedMetric] || 0)
      })
    })

    // Convert to array and sort by date
    return Object.values(dataByDate).sort((a, b) => 
      new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
    )
  }

  const chartData = prepareChartData()

  const filteredChanges = changes.filter(change => 
    changeTypeFilter === 'all' || change.changeType === changeTypeFilter
  )

  const changeTypes = Array.from(new Set(changes.map(c => c.changeType)))

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading timeline...</div>
        </CardContent>
      </Card>
    )
  }

  if (changes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No changes recorded yet. Changes will appear here after syncs.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedMetric} onValueChange={(v: any) => setSelectedMetric(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clicks">Clicks/Day</SelectItem>
              <SelectItem value="impressions">Impressions/Day</SelectItem>
              <SelectItem value="ctr">CTR</SelectItem>
              <SelectItem value="conversions">Conversions/Day</SelectItem>
            </SelectContent>
          </Select>

          <Select value={changeTypeFilter} onValueChange={setChangeTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Changes</SelectItem>
              {changeTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Badge variant="outline">
          {filteredChanges.length} changes
        </Badge>
      </div>

      {/* Performance Chart with Change Markers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Timeline</CardTitle>
          <CardDescription>
            {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} over time with change markers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#metricGradient)"
              />
              
              {/* Add reference lines for each change */}
              {filteredChanges.map((change, idx) => {
                const changeDate = format(new Date(change.detectedAt), 'MMM dd')
                return (
                  <ReferenceLine
                    key={change.id}
                    x={changeDate}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{ value: `Change ${idx + 1}`, position: 'top', fill: '#ef4444', fontSize: 10 }}
                  />
                )
              })}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Changes Timeline */}
      <div className="space-y-3">
        {filteredChanges.map((change, index) => (
          <Card key={change.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {getChangeIcon(change.changeType, change.fieldName)}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {change.fieldName.replace(/_/g, ' ')}
                      </span>
                      {getChangeSourceBadge(change.changeSource)}
                      {change.user && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {change.user.name}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-mono text-xs">
                        {typeof change.oldValue === 'object' 
                          ? JSON.stringify(change.oldValue).substring(0, 30)
                          : String(change.oldValue).substring(0, 30)}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="secondary" className="font-mono text-xs">
                        {typeof change.newValue === 'object'
                          ? JSON.stringify(change.newValue).substring(0, 30)
                          : String(change.newValue).substring(0, 30)}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(change.detectedAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                      {renderPerformanceImpact(change)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


