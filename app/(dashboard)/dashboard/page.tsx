"use client"

import { Metadata } from "next"
import Link from "next/link"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { SyncStatusIndicator } from "@/components/sync-status-indicator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  AlertCircle,
  BrainCircuit,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CreditCard,
  Eye,
  MousePointerClick,
  RefreshCw,
  BarChart3,
  ChevronRight,
} from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

// Note: Metadata export is not supported in client components

// Mock data for dashboard
const metrics = {
  totalSpend: 48750,
  totalRevenue: 152840,
  roas: 3.14,
  activeCampaigns: 12,
  totalImpressions: 2847000,
  totalClicks: 42300,
  ctr: 1.49,
  cpc: 1.15,
  conversions: 3240,
  conversionRate: 7.66,
}

const performanceData = [
  { platform: "Meta", spend: 24500, revenue: 78400, roas: 3.20, change: 12.5 },
  { platform: "Google", spend: 18200, revenue: 58200, roas: 3.20, change: -5.2 },
  { platform: "TikTok", spend: 6050, revenue: 16240, roas: 2.68, change: 28.4 },
]

const recommendations = [
  {
    id: 1,
    type: "optimization",
    priority: "high",
    title: "Pause underperforming ad sets",
    description: "3 ad sets have spent $2,400 with ROAS below 1.5x",
    impact: "Save $800/day",
    icon: AlertCircle,
  },
  {
    id: 2,
    type: "scaling",
    priority: "high",
    title: "Scale winning campaign",
    description: "Campaign has 4.2x ROAS - increase budget by 50%",
    impact: "+$3,200 revenue/day",
    icon: TrendingUp,
  },
  {
    id: 3,
    type: "creative",
    priority: "medium",
    title: "Refresh ad creative",
    description: "Top performing ad showing creative fatigue after 2.1M impressions",
    impact: "Maintain 3.5x ROAS",
    icon: RefreshCw,
  },
]

const alerts = [
  { type: "warning", message: "Daily spend limit reaching 85% on Google Ads" },
  { type: "success", message: "Meta campaign 'Black Friday' exceeded target ROAS by 40%" },
  { type: "error", message: "TikTok API connection needs re-authorization" },
]

// Chart data for performance over time
const performanceChartData = [
  { date: "Mon", spend: 6800, revenue: 21200, roas: 3.12 },
  { date: "Tue", spend: 7200, revenue: 23400, roas: 3.25 },
  { date: "Wed", spend: 6500, revenue: 19800, roas: 3.05 },
  { date: "Thu", spend: 7800, revenue: 26500, roas: 3.40 },
  { date: "Fri", spend: 8200, revenue: 28700, roas: 3.50 },
  { date: "Sat", spend: 5900, revenue: 17300, roas: 2.93 },
  { date: "Sun", spend: 6350, revenue: 15940, roas: 2.51 },
]

// Chart data for conversions funnel
const conversionFunnelData = [
  { stage: "Impressions", value: 2847000, percentage: 100 },
  { stage: "Clicks", value: 42300, percentage: 1.49 },
  { stage: "Landing Page", value: 38070, percentage: 90 },
  { stage: "Add to Cart", value: 11421, percentage: 30 },
  { stage: "Checkout", value: 4568, percentage: 40 },
  { stage: "Purchase", value: 3240, percentage: 71 },
]

// Chart data for campaign distribution
const campaignDistributionData = [
  { name: "Meta", value: 24500, color: "#1877F2" },
  { name: "Google", value: 18200, color: "#4285F4" },
  { name: "TikTok", value: 6050, color: "#FF0050" },
]

// Chart data for hourly performance
const hourlyPerformanceData = [
  { hour: "00", clicks: 120, conversions: 8 },
  { hour: "02", clicks: 80, conversions: 5 },
  { hour: "04", clicks: 60, conversions: 3 },
  { hour: "06", clicks: 140, conversions: 9 },
  { hour: "08", clicks: 320, conversions: 24 },
  { hour: "10", clicks: 480, conversions: 38 },
  { hour: "12", clicks: 560, conversions: 45 },
  { hour: "14", clicks: 520, conversions: 42 },
  { hour: "16", clicks: 490, conversions: 39 },
  { hour: "18", clicks: 580, conversions: 47 },
  { hour: "20", clicks: 420, conversions: 32 },
  { hour: "22", clicks: 280, conversions: 18 },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your performance overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Data
          </Button>
          <Button size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Reports
          </Button>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 rounded-lg border p-3 ${
                alert.type === "error"
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : alert.type === "warning"
                  ? "border-yellow-500/50 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
                  : "border-green-500/50 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sync Status */}
      <SyncStatusIndicator />

      {/* Key Metrics - Compact */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Performance Snapshot</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Spend</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">${(metrics.totalSpend / 1000).toFixed(1)}k</span>
                  <span className="text-sm flex items-center text-green-600">
                    <ArrowDownRight className="h-3 w-3" />
                    8%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Impressions</span>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{(metrics.totalImpressions / 1000000).toFixed(1)}M</span>
                  <span className="text-sm flex items-center text-green-600">
                    <ArrowUpRight className="h-3 w-3" />
                    12%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Clicks</span>
                  <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{(metrics.totalClicks / 1000).toFixed(1)}k</span>
                  <span className="text-sm flex items-center text-green-600">
                    <ArrowUpRight className="h-3 w-3" />
                    15%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conversions</span>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{metrics.conversions.toLocaleString()}</span>
                  <span className="text-sm flex items-center text-green-600">
                    <ArrowUpRight className="h-3 w-3" />
                    23%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg ROAS</span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{metrics.roas}x</span>
                  <span className="text-sm flex items-center text-green-600">
                    <ArrowUpRight className="h-3 w-3" />
                    5%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>
              Spend vs Revenue over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceChartData}>
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
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="spend" 
                  stackId="1"
                  stroke="#f97316" 
                  fill="#f97316"
                  fillOpacity={0.6}
                  name="Spend ($)"
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stackId="2"
                  stroke="#10b981" 
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="Revenue ($)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
            <CardDescription>
              Spend allocation across advertising platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={campaignDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {campaignDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value) => `$${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {campaignDistributionData.map((platform) => (
                <div key={platform.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: platform.color }}
                    />
                    <span>{platform.name}</span>
                  </div>
                  <span className="font-medium">
                    ${platform.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>
              User journey from impression to purchase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={conversionFunnelData} 
                layout="horizontal"
                margin={{ left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number"
                  tick={{ fill: 'currentColor' }}
                  className="text-xs"
                />
                <YAxis 
                  dataKey="stage" 
                  type="category"
                  tick={{ fill: 'currentColor' }}
                  className="text-xs"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value) => value.toLocaleString()}
                />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hourly Performance</CardTitle>
            <CardDescription>
              Clicks and conversions by hour of day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fill: 'currentColor' }}
                  className="text-xs"
                />
                <YAxis 
                  tick={{ fill: 'currentColor' }}
                  className="text-xs"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Clicks"
                />
                <Line 
                  type="monotone" 
                  dataKey="conversions" 
                  stroke="#ec4899" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Conversions"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Recommendations</CardTitle>
              <CardDescription>
                Actionable insights to improve your campaign performance
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1">
              <BrainCircuit className="h-3 w-3" />
              AI Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="flex items-start gap-4 rounded-lg border p-4"
              >
                <div
                  className={`rounded-full p-2 ${
                    rec.priority === "high"
                      ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                      : "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400"
                  }`}
                >
                  <rec.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{rec.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {rec.description}
                      </p>
                    </div>
                    <Badge
                      variant={rec.priority === "high" ? "destructive" : "secondary"}
                    >
                      {rec.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      Impact: {rec.impact}
                    </span>
                    <Button size="sm" variant="outline">
                      <Zap className="h-3 w-3 mr-1" />
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Button variant="outline" className="h-auto flex-col gap-2 p-4">
          <Target className="h-5 w-5" />
          <span className="text-xs">Create Campaign</span>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 p-4">
          <BrainCircuit className="h-5 w-5" />
          <span className="text-xs">AI Insights</span>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 p-4">
          <RefreshCw className="h-5 w-5" />
          <span className="text-xs">Sync Platforms</span>
        </Button>
      </div>
    </div>
  )
}