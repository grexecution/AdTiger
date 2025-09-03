"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Activity,
  BarChart3,
  Zap,
  Timer,
  TrendingUp,
  TrendingDown,
  Info
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow, formatDuration, format } from "date-fns"

interface SyncStatus {
  success: boolean
  accountId: string
  providers: Array<{
    provider: string
    connection: {
      status: string
      lastSyncAt: string | null
      nextSyncAt: string | null
      hasErrors: boolean
    }
    queue: any
  }>
  recentSyncs: Array<{
    id: string
    provider: string
    syncType: string
    status: string
    startedAt: string
    completedAt: string | null
    duration: number | null
    campaignsSync: number | null
    adGroupsSync: number | null
    adsSync: number | null
    insightsSync: number | null
    errorMessage: string | null
    errorCategory: string | null
    retryCount: number
  }>
  stats: {
    totalSyncs: number
    successfulSyncs: number
    failedSyncs: number
    avgDuration: number
    avgDurationMs: number
    avgDurationFormatted: string
    successRate: string
    lastSuccessfulSync: any
    lastFailedSync: any
    manualSyncsToday: number
    maxManualSyncsPerDay: number
    canSyncManually: boolean
    nextScheduledSync: string
    errorCategories: Record<string, number>
  }
  queues: {
    'campaign-sync': {
      waiting: number
      active: number
      completed: number
      failed: number
    }
    'ad-sync': {
      waiting: number
      active: number
      completed: number
      failed: number
    }
    'insights-sync': {
      waiting: number
      active: number
      completed: number
      failed: number
    }
  }
  timestamp: string
}

interface SyncStatusPanelProps {
  onSync: (provider: string) => Promise<void>
  isSyncing: boolean
}

export function SyncStatusPanel({ onSync, isSyncing }: SyncStatusPanelProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentSyncJob, setCurrentSyncJob] = useState<string | null>(null)
  const { toast } = useToast()

  // Safely access nested properties with defaults
  const stats = syncStatus?.stats || {} as any
  const canSyncManually = stats.canSyncManually !== undefined ? stats.canSyncManually : true
  const maxManualSyncsPerDay = stats.maxManualSyncsPerDay || 3
  const manualSyncsToday = stats.manualSyncsToday || 0
  
  const canSync = canSyncManually && !isSyncing
  const remainingManualSyncs = Math.max(0, maxManualSyncsPerDay - manualSyncsToday)

  const fetchSyncStatus = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/sync/status')
      if (response.ok) {
        const data = await response.json()
        setSyncStatus(data)
      }
    } catch (error) {
      console.error('Error fetching sync status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSyncStatus()
    // Refresh sync status every 30 seconds
    const interval = setInterval(fetchSyncStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  // Refresh after sync completes
  useEffect(() => {
    if (!isSyncing && currentSyncJob) {
      fetchSyncStatus()
      setCurrentSyncJob(null)
    }
  }, [isSyncing, currentSyncJob])

  const handleSync = async (provider: string) => {
    try {
      // Use the already computed canSync value instead of accessing nested properties
      if (!canSync) {
        toast({
          title: "Sync unavailable",
          description: isSyncing 
            ? "A sync is already in progress" 
            : `You have reached the daily limit of ${maxManualSyncsPerDay} manual syncs`,
          variant: "destructive"
        })
        return
      }

      setCurrentSyncJob(provider)
      await onSync(provider)
      
      toast({
        title: "Sync started",
        description: "Your sync has been added to the queue and will process shortly",
      })

      // Refresh status immediately and again in 5 seconds
      fetchSyncStatus()
      setTimeout(fetchSyncStatus, 5000)
      
    } catch (error: any) {
      console.error('Sync error:', error)
      setCurrentSyncJob(null)
      
      if (error.message?.includes('Rate limit')) {
        toast({
          title: "Rate limit exceeded",
          description: "You have reached the daily limit for manual syncs",
          variant: "destructive"
        })
      } else if (error.message?.includes('already in progress')) {
        toast({
          title: "Sync in progress",
          description: "A sync is already running. Please wait for it to complete.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Sync failed to start",
          description: error.message || "Failed to start sync",
          variant: "destructive"
        })
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'IN_PROGRESS':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      SUCCESS: "default",
      IN_PROGRESS: "secondary", 
      FAILED: "destructive",
      CANCELLED: "outline"
    }
    
    return (
      <Badge variant={variants[status?.toUpperCase()] || "outline"} className="text-xs">
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </Badge>
    )
  }

  const formatRelativeTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Quick Status Indicator */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1">
              {(syncStatus as any)?.lastSync || syncStatus?.stats?.lastSuccessfulSync ? (
                getStatusIcon((syncStatus as any)?.lastSync?.status || syncStatus?.stats?.lastSuccessfulSync?.status)
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              {(syncStatus as any)?.lastSync || syncStatus?.stats?.lastSuccessfulSync ? (
                <>
                  <p className="font-medium">Last sync: {(syncStatus as any)?.lastSync?.status || syncStatus?.stats?.lastSuccessfulSync?.status}</p>
                  <p>{formatRelativeTime((syncStatus as any)?.lastSync?.completedAt || syncStatus?.stats?.lastSuccessfulSync?.startedAt)}</p>
                </>
              ) : (
                <p>No recent syncs</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Sync Button */}
      <Button 
        onClick={() => handleSync("meta")} 
        disabled={!canSync}
        variant="outline"
        size="sm"
        className="relative"
      >
        {isSyncing || currentSyncJob ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Data
          </>
        )}
        
        {/* Rate limit indicator */}
        {remainingManualSyncs <= 1 && remainingManualSyncs > 0 && (
          <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center">
            {remainingManualSyncs}
          </div>
        )}
      </Button>

      {/* Detailed Status Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Info className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Sync Status & Statistics
            </DialogTitle>
            <DialogDescription>
              Detailed sync information, queue status, and rate limiting
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : syncStatus ? (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(syncStatus as any)?.lastSync || syncStatus?.stats?.lastSuccessfulSync ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusBadge((syncStatus as any)?.lastSync?.status || syncStatus?.stats?.lastSuccessfulSync?.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatRelativeTime((syncStatus as any)?.lastSync?.completedAt || syncStatus?.stats?.lastSuccessfulSync?.startedAt)}
                        </p>
                        {((syncStatus as any)?.lastSync?.duration || syncStatus?.stats?.lastSuccessfulSync?.duration) && (
                          <p className="text-xs text-muted-foreground">
                            Duration: {Math.round(((syncStatus as any)?.lastSync?.duration || syncStatus?.stats?.lastSuccessfulSync?.duration || 0) / 1000)}s
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent syncs</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      Next Scheduled
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="font-mono text-sm">
                        {format(new Date((syncStatus as any)?.nextSync?.scheduledAt || syncStatus?.stats?.nextScheduledSync), 'HH:mm')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime((syncStatus as any)?.nextSync?.scheduledAt || syncStatus?.stats?.nextScheduledSync)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Manual Syncs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Today</span>
                        <Badge variant={remainingManualSyncs > 0 ? "secondary" : "destructive"}>
                          {manualSyncsToday}/{maxManualSyncsPerDay}
                        </Badge>
                      </div>
                      <Progress 
                        value={(manualSyncsToday / maxManualSyncsPerDay) * 100}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {remainingManualSyncs} remaining
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Performance Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Success Rate</p>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{syncStatus?.stats?.successRate || '0%'}</p>
                        {parseFloat(syncStatus?.stats?.successRate || '0') >= 90 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Duration</p>
                      <p className="font-semibold">{syncStatus?.stats?.avgDurationFormatted || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Syncs</p>
                      <p className="font-semibold">{syncStatus?.stats?.totalSyncs || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Failed Syncs</p>
                      <p className="font-semibold text-red-500">{syncStatus?.stats?.failedSyncs || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Queue Status */}
              {syncStatus.queues && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600">
                          {syncStatus.queues['campaign-sync']?.waiting || 0}
                        </p>
                        <p className="text-muted-foreground">Waiting</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {syncStatus.queues['campaign-sync']?.active || 0}
                        </p>
                        <p className="text-muted-foreground">Active</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {syncStatus.queues['campaign-sync']?.completed || 0}
                        </p>
                        <p className="text-muted-foreground">Completed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {syncStatus.queues['campaign-sync']?.failed || 0}
                        </p>
                        <p className="text-muted-foreground">Failed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Syncs */}
              {syncStatus?.recentSyncs && syncStatus.recentSyncs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Recent Sync History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {syncStatus.recentSyncs.slice(0, 10).map((sync) => (
                        <div key={sync.id} className="flex items-center justify-between p-2 rounded border">
                          <div className="flex items-center gap-3">
                            {getStatusBadge(sync.status)}
                            <div>
                              <p className="text-sm font-medium capitalize">{sync.provider} {sync.syncType}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatRelativeTime(sync.startedAt)}
                              </p>
                            </div>
                          </div>
                          {sync.duration && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                {Math.round(sync.duration / 1000)}s
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Unable to load sync status</p>
              <Button onClick={fetchSyncStatus} variant="outline" size="sm" className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}