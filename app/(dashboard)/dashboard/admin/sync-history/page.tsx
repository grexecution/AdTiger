"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Activity,
  TrendingUp,
  Database,
  Calendar,
  Filter,
  Download
} from "lucide-react"
import { format } from "date-fns"

interface SyncHistoryEntry {
  id: string
  accountId: string
  provider: string
  syncType: string
  status: string
  startedAt: string
  completedAt: string | null
  duration: number | null
  campaignsSync: number
  adGroupsSync: number
  adsSync: number
  insightsSync: number
  errorMessage: string | null
  errorCategory: string | null
  metadata: any
}

export default function SyncHistoryPage() {
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    provider: 'all',
    syncType: 'all',
    status: 'all',
    days: 7
  })
  const [stats, setStats] = useState({
    totalSyncs: 0,
    successRate: 0,
    avgDuration: 0,
    totalInsights: 0
  })

  useEffect(() => {
    fetchSyncHistory()
  }, [filter])

  const fetchSyncHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        days: filter.days.toString(),
        ...(filter.provider !== 'all' && { provider: filter.provider }),
        ...(filter.syncType !== 'all' && { syncType: filter.syncType }),
        ...(filter.status !== 'all' && { status: filter.status })
      })
      
      const response = await fetch(`/api/admin/sync-history?${params}`)
      const data = await response.json()
      
      setSyncHistory(data.history || [])
      setStats(data.stats || {
        totalSyncs: 0,
        successRate: 0,
        avgDuration: 0,
        totalInsights: 0
      })
    } catch (error) {
      console.error('Error fetching sync history:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerDailySync = async () => {
    try {
      const response = await fetch('/api/cron/daily-insights', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev'}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        alert(`Daily sync triggered successfully! Processed ${data.summary?.totalAdsProcessed || 0} ads.`)
        fetchSyncHistory()
      } else {
        alert('Failed to trigger daily sync')
      }
    } catch (error) {
      console.error('Error triggering sync:', error)
      alert('Error triggering sync')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'IN_PROGRESS':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'PARTIAL':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      COMPLETED: "default",
      FAILED: "destructive",
      IN_PROGRESS: "secondary",
      PARTIAL: "outline"
    }
    
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status}
      </Badge>
    )
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sync History</h1>
        <Button onClick={triggerDailySync} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Trigger Daily Insights Sync
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Syncs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.totalSyncs}</span>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.totalInsights.toLocaleString()}</span>
              <Database className="h-4 w-4 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={filter.provider} onValueChange={(v) => setFilter({...filter, provider: v})}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="META">Meta</SelectItem>
                <SelectItem value="GOOGLE">Google</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filter.syncType} onValueChange={(v) => setFilter({...filter, syncType: v})}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sync Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="FULL">Full Sync</SelectItem>
                <SelectItem value="INCREMENTAL">Incremental</SelectItem>
                <SelectItem value="INSIGHTS">Insights Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filter.status} onValueChange={(v) => setFilter({...filter, status: v})}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filter.days.toString()} onValueChange={(v) => setFilter({...filter, days: parseInt(v)})}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 Hours</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchSyncHistory}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sync History Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Campaigns</TableHead>
                  <TableHead>Ads</TableHead>
                  <TableHead>Insights</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(entry.status)}
                        {getStatusBadge(entry.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {entry.syncType}
                      </Badge>
                      {entry.metadata?.source === 'daily_cron' && (
                        <Badge className="ml-1" variant="secondary">
                          Daily
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{entry.provider}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(entry.startedAt), 'MMM dd, HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>{formatDuration(entry.duration)}</TableCell>
                    <TableCell>
                      {entry.campaignsSync > 0 && (
                        <Badge variant="secondary">{entry.campaignsSync}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.adsSync > 0 && (
                        <Badge variant="secondary">{entry.adsSync}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.insightsSync > 0 && (
                        <Badge className="bg-blue-100 text-blue-700">
                          {entry.insightsSync}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.errorMessage && (
                        <span className="text-xs text-red-500" title={entry.errorMessage}>
                          {entry.errorMessage.substring(0, 30)}...
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}