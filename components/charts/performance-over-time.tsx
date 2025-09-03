"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { format, subDays } from "date-fns"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface PerformanceData {
  date: string
  impressions: number
  clicks: number
  spend: number
  ctr: number
  cpc: number
  cpm: number
  conversions?: number
}

interface PerformanceOverTimeProps {
  entityType: 'campaign' | 'adGroup' | 'ad'
  entityId: string
  provider: string
}

export function PerformanceOverTime({
  entityType,
  entityId,
  provider
}: PerformanceOverTimeProps) {
  const [data, setData] = useState<PerformanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(30)
  const [metric, setMetric] = useState('impressions')

  useEffect(() => {
    fetchPerformanceData()
  }, [entityId, dateRange])

  const fetchPerformanceData = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/performance/historical?entityType=${entityType}&entityId=${entityId}&days=${dateRange}`
      )
      
      if (response.ok) {
        const result = await response.json()
        setData(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTrend = (metric: string) => {
    if (data.length < 2) return { value: 0, direction: 'neutral' }
    
    const recent = data.slice(-7)
    const previous = data.slice(-14, -7)
    
    if (recent.length === 0 || previous.length === 0) return { value: 0, direction: 'neutral' }
    
    const recentAvg = recent.reduce((sum, d) => sum + (d[metric as keyof PerformanceData] as number || 0), 0) / recent.length
    const previousAvg = previous.reduce((sum, d) => sum + (d[metric as keyof PerformanceData] as number || 0), 0) / previous.length
    
    if (previousAvg === 0) return { value: 0, direction: 'neutral' }
    
    const change = ((recentAvg - previousAvg) / previousAvg) * 100
    
    return {
      value: Math.abs(change),
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'neutral'
    }
  }

  const formatValue = (value: number, metric: string) => {
    switch (metric) {
      case 'spend':
      case 'cpc':
      case 'cpm':
        return `$${value.toFixed(2)}`
      case 'ctr':
        return `${value.toFixed(2)}%`
      case 'impressions':
      case 'clicks':
      case 'conversions':
        return value.toLocaleString()
      default:
        return value.toFixed(2)
    }
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const metricColors = {
    impressions: '#8884d8',
    clicks: '#82ca9d',
    spend: '#ffc658',
    ctr: '#ff7c7c',
    cpc: '#8dd1e1',
    cpm: '#d084d0',
    conversions: '#82d982'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Performance Over Time</CardTitle>
            <CardDescription>Track metrics changes and trends</CardDescription>
          </div>
          <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="14">14 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="60">60 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
            <TabsTrigger value="table">Data Table</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['impressions', 'clicks', 'ctr', 'spend'].map((m) => {
                const trend = calculateTrend(m)
                const latestValue = data[data.length - 1]?.[m as keyof PerformanceData] as number || 0
                
                return (
                  <Card key={m}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-muted-foreground capitalize">{m}</p>
                          <p className="text-xl font-bold">
                            {formatValue(latestValue, m)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(trend.direction)}
                          <span className="text-xs">{trend.value.toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Main Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                    formatter={(value: number, name: string) => formatValue(value, name)}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="impressions" 
                    stroke={metricColors.impressions}
                    fill={metricColors.impressions}
                    fillOpacity={0.1}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke={metricColors.clicks}
                    fill={metricColors.clicks}
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                    formatter={(value: number, name: string) => formatValue(value, name)}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="clicks" 
                    stroke={metricColors.clicks}
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="ctr" 
                    stroke={metricColors.ctr}
                    strokeWidth={2}
                  />
                  {data[0]?.conversions !== undefined && (
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="conversions" 
                      stroke={metricColors.conversions}
                      strokeWidth={2}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="cost" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                    formatter={(value: number, name: string) => formatValue(value, name)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="spend" 
                    stroke={metricColors.spend}
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cpc" 
                    stroke={metricColors.cpc}
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cpm" 
                    stroke={metricColors.cpm}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="table">
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-right">Impressions</th>
                    <th className="p-2 text-right">Clicks</th>
                    <th className="p-2 text-right">CTR</th>
                    <th className="p-2 text-right">Spend</th>
                    <th className="p-2 text-right">CPC</th>
                    <th className="p-2 text-right">CPM</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice().reverse().map((row, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{format(new Date(row.date), 'MMM d, yyyy')}</td>
                      <td className="p-2 text-right">{row.impressions.toLocaleString()}</td>
                      <td className="p-2 text-right">{row.clicks.toLocaleString()}</td>
                      <td className="p-2 text-right">{row.ctr.toFixed(2)}%</td>
                      <td className="p-2 text-right">${row.spend.toFixed(2)}</td>
                      <td className="p-2 text-right">${row.cpc.toFixed(2)}</td>
                      <td className="p-2 text-right">${row.cpm.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}