"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SyncStatusPanel } from "@/components/dashboard/sync-status-panel"
import { 
  ArrowRight, 
  PlusCircle, 
  Edit3, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Activity,
  History,
  LayoutGrid
} from "lucide-react"

interface Change {
  id: string
  entityType: string
  entityId: string
  entityName: string
  changeType: string
  fieldName: string
  oldValue: any
  newValue: any
  provider: string
  detectedAt: string
}

interface ChangeHistoryProps {
  entityType?: string
  entityId?: string
  limit?: number
  activeTab?: string
  setActiveTab?: (value: string) => void
}

export function ChangeHistory({ entityType, entityId, limit = 50, activeTab, setActiveTab }: ChangeHistoryProps) {
  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async (provider: string = "meta") => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/sync/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      })
      if (response.ok) {
        setTimeout(() => {
          fetchChanges()
          setIsSyncing(false)
        }, 5000)
      }
    } catch (error) {
      console.error('Sync error:', error)
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    fetchChanges()
  }, [entityType, entityId])

  const fetchChanges = async () => {
    try {
      const params = new URLSearchParams()
      if (entityType) params.append("entityType", entityType)
      if (entityId) params.append("entityId", entityId)
      params.append("limit", limit.toString())

      const response = await fetch(`/api/changes?${params}`)
      const data = await response.json()
      setChanges(data.changes || [])
    } catch (error) {
      console.error("Failed to fetch changes:", error)
    } finally {
      setLoading(false)
    }
  }

  const getChangeIcon = (changeType: string, fieldName: string) => {
    if (changeType === "created") return <PlusCircle className="h-4 w-4 text-green-500" />
    if (changeType === "status_change") return <Activity className="h-4 w-4 text-yellow-500" />
    if (fieldName === "budgetAmount") return <DollarSign className="h-4 w-4 text-blue-500" />
    if (fieldName === "name") return <FileText className="h-4 w-4 text-purple-500" />
    return <Edit3 className="h-4 w-4 text-gray-500" />
  }

  const getChangeTypeBadge = (changeType: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      created: "default",
      updated: "secondary",
      status_change: "outline",
      deleted: "destructive"
    }
    
    return (
      <Badge variant={variants[changeType] || "default"}>
        {changeType.replace("_", " ")}
      </Badge>
    )
  }

  const formatValue = (value: any, fieldName: string) => {
    if (value === null || value === undefined) return "-"
    
    if (fieldName === "budgetAmount") {
      return `$${parseFloat(value).toFixed(2)}`
    }
    
    if (fieldName === "status") {
      return <Badge variant="outline">{value}</Badge>
    }
    
    if (typeof value === "object") {
      return <code className="text-xs">{JSON.stringify(value, null, 2)}</code>
    }
    
    return value.toString()
  }

  const getFieldDisplayName = (fieldName: string) => {
    const fieldNames: Record<string, string> = {
      budgetAmount: "Budget",
      name: "Name",
      status: "Status",
      objective: "Objective",
      creative: "Creative",
      metadata: "Settings",
      _entity: "Entity"
    }
    return fieldNames[fieldName] || fieldName
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Change History</h2>
            <p className="text-muted-foreground">Loading changes...</p>
          </div>
          <div className="flex items-center space-x-2">
            <TabsList>
              <TabsTrigger value="campaigns" onClick={() => setActiveTab?.("campaigns")} className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="changes" onClick={() => setActiveTab?.("changes")} className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Change History
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <SyncStatusPanel onSync={handleSync} isSyncing={isSyncing} />
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!changes.length) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Change History</h2>
            <p className="text-muted-foreground">Track changes to campaigns, ad groups, and ads</p>
          </div>
          <div className="flex items-center space-x-2">
            <TabsList>
              <TabsTrigger value="campaigns" onClick={() => setActiveTab?.("campaigns")} className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="changes" onClick={() => setActiveTab?.("changes")} className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Change History
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <SyncStatusPanel onSync={handleSync} isSyncing={isSyncing} />
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No changes detected yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Changes will appear here after the next sync
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Change History</h2>
          <p className="text-muted-foreground">
            Recent changes detected during sync ({changes.length} changes)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Tab switcher */}
          <TabsList>
            <TabsTrigger value="campaigns" onClick={() => setActiveTab?.("campaigns")} className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="changes" onClick={() => setActiveTab?.("changes")} className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Change History
            </TabsTrigger>
          </TabsList>
          
          {/* Sync panel */}
          <div className="flex items-center gap-2">
            <SyncStatusPanel onSync={handleSync} isSyncing={isSyncing} />
          </div>
        </div>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Old Value</TableHead>
                <TableHead></TableHead>
                <TableHead>New Value</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change) => (
                <TableRow key={change.id}>
                  <TableCell>
                    {getChangeIcon(change.changeType, change.fieldName)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{change.entityName}</p>
                      <p className="text-xs text-muted-foreground">
                        {change.entityType.replace("_", " ")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getChangeTypeBadge(change.changeType)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {getFieldDisplayName(change.fieldName)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate">
                      {formatValue(change.oldValue, change.fieldName)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate">
                      {formatValue(change.newValue, change.fieldName)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(change.detectedAt), "MMM d, h:mm a")}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}