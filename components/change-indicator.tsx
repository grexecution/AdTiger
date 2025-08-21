"use client"

import { useState, useEffect } from "react"
import { History } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ChangeHistory } from "./change-history"
import { Badge } from "@/components/ui/badge"

interface ChangeIndicatorProps {
  entityType: string
  entityId: string
  entityName: string
  compact?: boolean
}

export function ChangeIndicator({ 
  entityType, 
  entityId, 
  entityName,
  compact = false 
}: ChangeIndicatorProps) {
  const [changeCount, setChangeCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch change count for this entity
    const fetchChangeCount = async () => {
      try {
        const params = new URLSearchParams()
        params.append("entityType", entityType)
        params.append("entityId", entityId)
        params.append("limit", "1")

        const response = await fetch(`/api/changes?${params}`)
        const data = await response.json()
        setChangeCount(data.changes?.length || 0)
      } catch (error) {
        console.error("Failed to fetch change count:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChangeCount()
  }, [entityType, entityId])

  if (loading || changeCount === 0) {
    return null
  }

  if (compact) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2">
            <History className="h-3 w-3 mr-1" />
            <span className="text-xs">{changeCount}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change History - {entityName}</DialogTitle>
            <DialogDescription>
              View all changes for this {entityType.replace("_", " ")}
            </DialogDescription>
          </DialogHeader>
          <ChangeHistory 
            entityType={entityType} 
            entityId={entityId}
            limit={100}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          View Changes
          {changeCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {changeCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change History - {entityName}</DialogTitle>
          <DialogDescription>
            View all changes for this {entityType.replace("_", " ")}
          </DialogDescription>
        </DialogHeader>
        <ChangeHistory 
          entityType={entityType} 
          entityId={entityId}
          limit={100}
        />
      </DialogContent>
    </Dialog>
  )
}