"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Target,
  Palette,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Clock as SnoozeIcon
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RecommendationCardProps {
  recommendation: any
  onAction: (action: string, recommendationId: string, extra?: any) => Promise<void>
}

export function RecommendationCard({ recommendation, onAction }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = async (action: string, extra?: any) => {
    setLoading(action)
    try {
      await onAction(action, recommendation.id, extra)
    } finally {
      setLoading(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'default'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance':
        return <TrendingUp className="h-4 w-4" />
      case 'budget':
        return <DollarSign className="h-4 w-4" />
      case 'creative':
        return <Palette className="h-4 w-4" />
      case 'targeting':
        return <Target className="h-4 w-4" />
      case 'growth':
        return <Zap className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pause':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'budget_increase':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'budget_change':
      case 'bid_adjustment':
        return <DollarSign className="h-4 w-4 text-blue-500" />
      case 'creative_refresh':
        return <Palette className="h-4 w-4 text-purple-500" />
      case 'schedule_adjustment':
        return <Calendar className="h-4 w-4 text-orange-500" />
      default:
        return <Zap className="h-4 w-4 text-yellow-500" />
    }
  }

  const formatMetric = (key: string, value: any) => {
    if (key.includes('spend') || key.includes('cpc') || key.includes('budget')) {
      return `$${parseFloat(value).toFixed(2)}`
    }
    if (key.includes('ctr') || key.includes('rate')) {
      return `${parseFloat(value).toFixed(2)}%`
    }
    if (key.includes('roas')) {
      return `${parseFloat(value).toFixed(2)}x`
    }
    return value.toLocaleString()
  }

  return (
    <Card className={cn(
      "transition-all duration-200",
      "hover:shadow-md",
      recommendation.priority === 'critical' && "border-red-500/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {getTypeIcon(recommendation.type)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base">{recommendation.title}</CardTitle>
                <Badge variant={getPriorityColor(recommendation.priority)}>
                  {recommendation.priority}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  {getCategoryIcon(recommendation.category)}
                  {recommendation.category}
                </Badge>
              </div>
              <CardDescription className="text-sm">
                {recommendation.campaign?.name || 'Unknown Campaign'} • {recommendation.provider}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAction('snooze', { days: 3 })}>
                  <Clock className="mr-2 h-4 w-4" />
                  Snooze for 3 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('snooze', { days: 7 })}>
                  <Clock className="mr-2 h-4 w-4" />
                  Snooze for 1 week
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleAction('dismiss')}
                  className="text-red-600"
                >
                  <EyeOff className="mr-2 h-4 w-4" />
                  Dismiss permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* AI Explanation */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              {recommendation.aiExplanation || recommendation.description}
            </p>
          </div>

          {/* Expanded Details */}
          {expanded && (
            <div className="space-y-3 pt-3 border-t">
              {/* Current Metrics */}
              {recommendation.metricsSnapshot && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Current Metrics</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(recommendation.metricsSnapshot).slice(0, 6).map(([key, value]) => (
                      <div key={key} className="bg-muted/30 rounded px-2 py-1">
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm font-medium">
                          {formatMetric(key, value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estimated Impact */}
              {recommendation.estimatedImpact && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Estimated Impact</h4>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2">
                    {Object.entries(recommendation.estimatedImpact).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-medium">
                          {typeof value === 'boolean' ? (value ? '✓' : '✗') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence Score */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${recommendation.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {(recommendation.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleAction('accept')}
              disabled={loading !== null}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Mark as Done
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction('snooze', { days: 7 })}
              disabled={loading !== null}
              className="gap-2"
            >
              <Clock className="h-4 w-4" />
              Snooze
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAction('dismiss')}
              disabled={loading !== null}
              className="gap-2 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
              Dismiss
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}