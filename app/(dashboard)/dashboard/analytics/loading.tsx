import { PageHeaderSkeleton, MetricCardsSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function AnalyticsLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <PageHeaderSkeleton />
      
      {/* Filters Bar Skeleton */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-9 w-36" />
          </div>
        </CardContent>
      </Card>
      
      <MetricCardsSkeleton />
      
      <div className="grid gap-4 md:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  )
}