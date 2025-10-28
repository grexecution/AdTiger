"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Clock,
  ChevronDown,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"

interface SyncStatus {
  isActive: boolean
  progress?: number
  stage?: string
  lastSyncAt?: string
  status?: 'SUCCESS' | 'FAILED' | 'CANCELLED'
  healthStatus?: 'HEALTHY' | 'PARTIAL' | 'UNHEALTHY'
}

interface ManualSyncButtonProps {
  provider?: 'meta' | 'google'
  compact?: boolean
  showLastSync?: boolean
}

export function ManualSyncButton({ 
  provider = 'meta', 
  compact = false,
  showLastSync = true 
}: ManualSyncButtonProps) {
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isActive: false })
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch sync status periodically
  useEffect(() => {
    fetchSyncStatus()
    const interval = setInterval(fetchSyncStatus, 10000) // Every 10 seconds
    return () => clearInterval(interval)
  }, [provider])

  // Poll for sync progress when a job is active
  useEffect(() => {
    if (jobId && syncing) {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/sync/status/${jobId}`)
          if (response.ok) {
            const data = await response.json()
            
            setSyncStatus({
              isActive: data.status === 'pending' || data.progress < 100,
              progress: data.progress,
              stage: data.stage,
              status: data.status,
              healthStatus: data.healthStatus,
            })

            // If sync completed, stop polling
            if (data.progress >= 100 || data.completedAt) {
              setSyncing(false)
              setJobId(null)
              
              toast({
                title: data.status === 'SUCCESS' ? "Sync Completed" : "Sync Failed",
                description: `${data.recordsProcessed?.total || 0} records synced`,
                variant: data.status === 'SUCCESS' ? 'default' : 'destructive',
              })
            }
          }
        } catch (err) {
          console.error('Error polling sync status:', err)
        }
      }, 3000) // Poll every 3 seconds

      return () => clearInterval(pollInterval)
    }
  }, [jobId, syncing])

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch(`/api/sync/manual?provider=${provider}`)
      if (response.ok) {
        const data = await response.json()
        setSyncStatus({
          isActive: data.syncStatus?.isActive || false,
          lastSyncAt: data.recentSyncs?.[0]?.completedAt || data.connection?.lastSyncAt,
          status: data.recentSyncs?.[0]?.status,
          healthStatus: data.recentSyncs?.[0]?.healthStatus,
        })
      }
    } catch (err) {
      console.error('Error fetching sync status:', err)
    }
  }

  const triggerSync = async (selectedProvider: 'meta' | 'google' = provider) => {
    setSyncing(true)
    setError(null)

    try {
      const response = await fetch('/api/sync/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError(`Rate limit: ${data.minutesUntilReset || 60} minutes until reset`)
          toast({
            title: "Rate Limit Exceeded",
            description: data.message,
            variant: "destructive",
          })
        } else {
          setError(data.message || 'Sync failed')
          toast({
            title: "Sync Failed",
            description: data.message || 'An error occurred',
            variant: "destructive",
          })
        }
        setSyncing(false)
        return
      }

      // Set job ID for polling if available
      if (data.jobId || data.syncHistoryId) {
        setJobId(data.jobId || data.syncHistoryId)
      }

      toast({
        title: "Sync Started",
        description: `${selectedProvider} sync is now running`,
      })

      // Refresh sync status
      setTimeout(fetchSyncStatus, 2000)

    } catch (err) {
      console.error('Error triggering sync:', err)
      setError('Failed to start sync')
      toast({
        title: "Error",
        description: 'Failed to start sync. Please try again.',
        variant: "destructive",
      })
      setSyncing(false)
    }
  }

  const getStatusIcon = () => {
    if (syncing || syncStatus.isActive) {
      return <RefreshCw className="h-4 w-4 animate-spin" />
    }
    if (syncStatus.status === 'SUCCESS' && syncStatus.healthStatus === 'HEALTHY') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
    if (syncStatus.status === 'FAILED') {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    if (syncStatus.healthStatus === 'PARTIAL') {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
    return <RefreshCw className="h-4 w-4" />
  }

  const getHealthBadge = () => {
    if (!syncStatus.healthStatus) return null
    
    const variants = {
      HEALTHY: 'default' as const,
      PARTIAL: 'secondary' as const,
      UNHEALTHY: 'destructive' as const,
    }

    return (
      <Badge variant={variants[syncStatus.healthStatus]} className="text-xs">
        {syncStatus.healthStatus}
      </Badge>
    )
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => triggerSync()}
              disabled={syncing || syncStatus.isActive}
            >
              {getStatusIcon()}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {syncing || syncStatus.isActive
                ? `Syncing... ${syncStatus.progress || 0}%`
                : 'Trigger manual sync'}
            </p>
            {syncStatus.lastSyncAt && (
              <p className="text-xs text-muted-foreground">
                Last sync: {formatDistanceToNow(new Date(syncStatus.lastSyncAt), { addSuffix: true })}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            disabled={syncing || syncStatus.isActive}
            className="gap-2"
          >
            {getStatusIcon()}
            <span>
              {syncing || syncStatus.isActive ? 'Syncing...' : 'Sync Now'}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => triggerSync('meta')}>
            Sync Meta Ads
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => triggerSync('google')}>
            Sync Google Ads
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showLastSync && syncStatus.lastSyncAt && !syncing && !syncStatus.isActive && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {formatDistanceToNow(new Date(syncStatus.lastSyncAt), { addSuffix: true })}
          </span>
          {getHealthBadge()}
        </div>
      )}

      {(syncing || syncStatus.isActive) && syncStatus.progress !== undefined && (
        <div className="flex items-center gap-2 min-w-[200px]">
          <Progress value={syncStatus.progress} className="h-2" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {syncStatus.progress}%
          </span>
        </div>
      )}

      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  )
}


