"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DollarSign,
  Eye,
  MousePointerClick,
  Target,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Users,
  ShoppingBag,
  Percent,
  Clock,
  ChevronRight,
} from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"

// Dynamically import chart components to avoid SSR issues
const AreaChart = dynamic(
  () => import("@/components/charts/area-chart").then(mod => mod.AreaChart),
  { ssr: false, loading: () => <div className="h-[350px] flex items-center justify-center">Loading chart...</div> }
)

const BarChartComponent = dynamic(
  () => import("@/components/charts/bar-chart").then(mod => mod.BarChart),
  { ssr: false, loading: () => <div className="h-[350px] flex items-center justify-center">Loading chart...</div> }
)

const LineChartComponent = dynamic(
  () => import("@/components/charts/line-chart").then(mod => mod.LineChart),
  { ssr: false, loading: () => <div className="h-[350px] flex items-center justify-center">Loading chart...</div> }
)

const PieChartComponent = dynamic(
  () => import("@/components/charts/pie-chart").then(mod => mod.PieChart),
  { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center">Loading chart...</div> }
)

// Metric card component
const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = "up",
  prefix = "",
  suffix = ""
}: {
  title: string
  value: string | number
  change: number
  icon: any
  trend?: "up" | "down"
  prefix?: string
  suffix?: string
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </span>
          <span className={cn(
            "text-sm flex items-center",
            trend === "up" && change > 0 ? "text-green-600" : 
            trend === "down" && change < 0 ? "text-green-600" :
            "text-red-600"
          )}>
            {change > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(change)}%
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")
  const [selectedMetric, setSelectedMetric] = useState<string>("spend")
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<any>({
    performanceData: [],
    platformData: [],
    campaignPerformance: [],
    campaigns: [],
    totals: {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      roas: 0
    }
  })

  // Quick date range presets
  const dateRangePresets = [
    { label: "Today", value: "today", range: { from: new Date(), to: new Date() } },
    { label: "Yesterday", value: "yesterday", range: { from: subDays(new Date(), 1), to: subDays(new Date(), 1) } },
    { label: "Last 7 days", value: "7days", range: { from: subDays(new Date(), 7), to: new Date() } },
    { label: "Last 30 days", value: "30days", range: { from: subDays(new Date(), 30), to: new Date() } },
    { label: "This month", value: "month", range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
    { label: "This week", value: "week", range: { from: startOfWeek(new Date()), to: endOfWeek(new Date()) } },
  ]

  // Fetch real analytics data
  const fetchAnalyticsData = async () => {
    setIsLoading(true)
    try {
      const days = dateRange?.from && dateRange?.to
        ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
        : 30

      const params = new URLSearchParams({
        days: days.toString(),
        platform: selectedPlatform,
        campaignId: selectedCampaign,
        metric: selectedMetric
      })

      const response = await fetch(`/api/analytics/insights?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      } else {
        console.error('Failed to fetch analytics data')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange, selectedPlatform, selectedCampaign])

  // Extract data from state
  const { performanceData, platformData, campaignPerformance, campaigns, totals } = analyticsData

  // Show loading state
  if (isLoading && performanceData.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
            <p className="text-muted-foreground">
              Loading performance data...
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            {performanceData.length > 0 
              ? `Showing data from ${performanceData[0]?.date || ''} to ${performanceData[performanceData.length - 1]?.date || ''}`
              : 'No data available for selected period'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={performanceData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {dateRangePresets.map((preset) => (
                      <Button
                        key={preset.value}
                        variant="outline"
                        size="sm"
                        onClick={() => setDateRange(preset.range)}
                        className="justify-start"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <Separator />
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* Platform Filter */}
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="meta">Meta</SelectItem>
                <SelectItem value="google">Google</SelectItem>
              </SelectContent>
            </Select>

            {/* Campaign Filter */}
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns?.map((campaign: any) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Metric Selector */}
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spend">Spend</SelectItem>
                <SelectItem value="impressions">Impressions</SelectItem>
                <SelectItem value="clicks">Clicks</SelectItem>
                <SelectItem value="conversions">Conversions</SelectItem>
                <SelectItem value="ctr">CTR</SelectItem>
                <SelectItem value="cpc">CPC</SelectItem>
                <SelectItem value="roas">ROAS</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard
          title="Total Spend"
          value={totals.spend.toFixed(2)}
          change={12}
          icon={DollarSign}
          prefix="$"
        />
        <MetricCard
          title="Impressions"
          value={totals.impressions}
          change={8}
          icon={Eye}
        />
        <MetricCard
          title="Clicks"
          value={totals.clicks}
          change={15}
          icon={MousePointerClick}
        />
        <MetricCard
          title="Conversions"
          value={totals.conversions}
          change={23}
          icon={Target}
        />
        <MetricCard
          title="Avg ROAS"
          value={totals.roas.toFixed(2)}
          change={5}
          icon={TrendingUp}
          suffix="x"
        />
      </div>

      {/* Show empty state if no data */}
      {performanceData.length === 0 && !isLoading && (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold">No Analytics Data Available</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              There's no data for the selected period. This could be because:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• No campaigns have been synced yet</li>
              <li>• The selected date range has no activity</li>
              <li>• Historical data hasn't been fetched</li>
            </ul>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/dashboard/campaigns'}
            >
              Go to Campaigns
            </Button>
          </div>
        </Card>
      )}

      {/* Main Charts Section */}
      {performanceData.length > 0 && (
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trend</CardTitle>
                <CardDescription>
                  Daily performance metrics over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AreaChart
                  data={performanceData}
                  dataKey={selectedMetric}
                  color="hsl(var(--primary))"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>
                  User journey from impression to conversion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarChartComponent
                  data={[
                    { stage: "Impressions", value: totals.impressions },
                    { stage: "Clicks", value: totals.clicks },
                    { stage: "Engagements", value: totals.likes + totals.comments + totals.shares },
                    { stage: "Conversions", value: totals.conversions },
                  ]}
                  dataKey="value"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Hourly Performance Heatmap</CardTitle>
              <CardDescription>
                Best performing hours and days of the week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Heatmap visualization would go here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Platform Distribution</CardTitle>
                <CardDescription>
                  Spend allocation across platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PieChartComponent data={platformData} />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Platform Performance Comparison</CardTitle>
                <CardDescription>
                  Key metrics by platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {platformData.map((platform: any) => (
                    <div key={platform.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: platform.color }}
                        />
                        <span className="font-medium">{platform.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          ${platform.spend.toLocaleString()}
                        </span>
                        <Badge variant="secondary">{platform.value}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance Matrix</CardTitle>
              <CardDescription>
                Detailed metrics for each campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">Campaign</th>
                      <th className="p-3 text-right font-medium">Spend</th>
                      <th className="p-3 text-right font-medium">Clicks</th>
                      <th className="p-3 text-right font-medium">Conversions</th>
                      <th className="p-3 text-right font-medium">ROAS</th>
                      <th className="p-3 text-right font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignPerformance.map((campaign: any) => (
                      <tr key={campaign.name} className="border-b">
                        <td className="p-3 font-medium">{campaign.name}</td>
                        <td className="p-3 text-right">${campaign.spend.toLocaleString()}</td>
                        <td className="p-3 text-right">{campaign.clicks.toLocaleString()}</td>
                        <td className="p-3 text-right">{campaign.conversions}</td>
                        <td className="p-3 text-right">{campaign.roas}x</td>
                        <td className="p-3 text-right">
                          <span className="inline-flex items-center text-green-600">
                            <TrendingUp className="h-4 w-4" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
                <CardDescription>
                  Performance by age group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarChartComponent
                  data={[
                    { age: "18-24", value: 15 },
                    { age: "25-34", value: 35 },
                    { age: "35-44", value: 25 },
                    { age: "45-54", value: 15 },
                    { age: "55+", value: 10 },
                  ]}
                  dataKey="value"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gender Split</CardTitle>
                <CardDescription>
                  Audience distribution by gender
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PieChartComponent
                  data={[
                    { name: "Male", value: 45, color: "#3B82F6" },
                    { name: "Female", value: 52, color: "#EC4899" },
                    { name: "Other", value: 3, color: "#8B5CF6" },
                  ]}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Geographic Performance</CardTitle>
              <CardDescription>
                Top performing regions and cities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                Geographic map visualization would go here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Device Types</CardTitle>
                <CardDescription>
                  Performance by device category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PieChartComponent
                  data={[
                    { name: "Mobile", value: 65, color: "#10B981" },
                    { name: "Desktop", value: 25, color: "#6366F1" },
                    { name: "Tablet", value: 10, color: "#F59E0B" },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operating Systems</CardTitle>
                <CardDescription>
                  User distribution by OS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarChartComponent
                  data={[
                    { os: "iOS", value: 45 },
                    { os: "Android", value: 40 },
                    { os: "Windows", value: 10 },
                    { os: "MacOS", value: 5 },
                  ]}
                  dataKey="value"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Browser Distribution</CardTitle>
                <CardDescription>
                  Top browsers used by your audience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "Chrome", percentage: 55 },
                    { name: "Safari", percentage: 25 },
                    { name: "Firefox", percentage: 12 },
                    { name: "Edge", percentage: 8 },
                  ].map((browser) => (
                    <div key={browser.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{browser.name}</span>
                        <span className="text-muted-foreground">{browser.percentage}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ width: `${browser.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      )}

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights & Recommendations</CardTitle>
          <CardDescription>
            AI-powered insights based on your performance data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Strong Mobile Performance</p>
                <p className="text-sm text-muted-foreground">
                  Mobile traffic shows 23% higher conversion rate than desktop. Consider increasing mobile ad spend.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Peak Hours Identified</p>
                <p className="text-sm text-muted-foreground">
                  Best performance between 7-9 PM EST. Schedule important campaigns during these hours.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
              <Activity className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Campaign Optimization Opportunity</p>
                <p className="text-sm text-muted-foreground">
                  "Brand Awareness" campaign has lowest ROAS. Consider pausing or adjusting targeting.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}