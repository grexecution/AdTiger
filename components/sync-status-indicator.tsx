"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Loader2,
  Activity,
  Calendar,
  Zap
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SyncStatus {
  isRunning: boolean
  currentProvider?: string
  progress?: number
  message?: string
  lastSync?: {
    provider: string
    status: string
    completedAt: string
    duration: number
    campaignsSync: number
    adsSync: number
    insightsSync: number
  }
  nextSync?: {
    provider: string
    scheduledAt: string
  }
  queueStatus?: {
    waiting: number
    active: number
    completed: number
    failed: number
  }
}

export function SyncStatusIndicator() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [isManualSyncing, setIsManualSyncing] = useState(false)

  useEffect(() => {
    fetchSyncStatus()
    
    // Poll for updates every 5 seconds when sync is running
    const interval = setInterval(() => {
      fetchSyncStatus()
    }, syncStatus?.isRunning ? 2000 : 10000) // Faster polling when syncing

    return () => clearInterval(interval)
  }, [syncStatus?.isRunning])

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/status')
      if (response.ok) {
        const data = await response.json()
        setSyncStatus(data)
      }
    } catch (error) {
      console.error('Error fetching sync status:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerManualSync = async () => {
    setIsManualSyncing(true)
    try {
      const response = await fetch('/api/sync/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'meta' })
      })
      
      if (response.ok) {
        // Immediately fetch new status
        await fetchSyncStatus()
      }
    } catch (error) {
      console.error('Error triggering sync:', error)
    } finally {
      setIsManualSyncing(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading sync status...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isRunning = syncStatus?.isRunning || isManualSyncing

  return (
    <TooltipProvider>
      <Card className={`transition-all duration-300 ${isRunning ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-muted'}`}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Current Sync Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isRunning ? (
                  <>
                    <div className="relative">
                      <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                      <div className="absolute inset-0 bg-blue-500 blur-md opacity-30 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Sync in Progress</p>
                      <p className="text-xs text-muted-foreground">
                        {syncStatus?.message || `Syncing ${syncStatus?.currentProvider || 'data'}...`}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Sync Complete</p>
                      <p className="text-xs text-muted-foreground">All data up to date</p>
                    </div>
                  </>
                )}
              </div>
              
              <Button
                size="sm"
                variant={isRunning ? "secondary" : "outline"}
                onClick={triggerManualSync}
                disabled={isRunning}
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>

            {/* Progress Bar */}
            {isRunning && syncStatus?.progress !== undefined && (
              <div className="space-y-1">
                <Progress value={syncStatus.progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {syncStatus.progress}% complete
                </p>
              </div>
            )}

            {/* Last Sync Info */}
            {syncStatus?.lastSync && (
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Last sync</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(syncStatus.lastSync.completedAt), { addSuffix: true })}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {format(new Date(syncStatus.lastSync.completedAt), 'PPpp')}
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                {/* Sync Stats */}
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="secondary" className="text-xs">
                        <Activity className="h-3 w-3 mr-1" />
                        {syncStatus.lastSync.campaignsSync} campaigns
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Campaigns synced</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="secondary" className="text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        {syncStatus.lastSync.adsSync} ads
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Ads synced</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="secondary" className="text-xs">
                        {syncStatus.lastSync.insightsSync} insights
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Insights collected</TooltipContent>
                  </Tooltip>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Duration: {Math.round(syncStatus.lastSync.duration)}s</span>
                  {syncStatus.lastSync.status === 'SUCCESS' ? (
                    <Badge className="text-xs" variant="outline">
                      <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                      Success
                    </Badge>
                  ) : (
                    <Badge className="text-xs" variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Next Sync */}
            {syncStatus?.nextSync && !isRunning && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Next auto-sync</span>
                  </div>
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(syncStatus.nextSync.scheduledAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            )}

            {/* Queue Status (if jobs are waiting) */}
            {syncStatus?.queueStatus && (syncStatus.queueStatus.waiting > 0 || syncStatus.queueStatus.active > 0) && (
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 text-xs">
                  <Activity className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Queue:</span>
                  {syncStatus.queueStatus.active > 0 && (
                    <Badge variant="default" className="text-xs">
                      {syncStatus.queueStatus.active} active
                    </Badge>
                  )}
                  {syncStatus.queueStatus.waiting > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {syncStatus.queueStatus.waiting} waiting
                    </Badge>
                  )}
                  {syncStatus.queueStatus.failed > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {syncStatus.queueStatus.failed} failed
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}