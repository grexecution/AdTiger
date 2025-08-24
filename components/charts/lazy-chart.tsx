"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

// Create optimized lazy-loaded chart components
export const LazyAreaChart = dynamic(
  () => import("./area-chart").then(mod => mod.AreaChart),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[350px] flex items-center justify-center">
        <Skeleton className="h-full w-full animate-pulse" />
      </div>
    )
  }
)

export const LazyBarChart = dynamic(
  () => import("./bar-chart").then(mod => mod.BarChart),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[350px] flex items-center justify-center">
        <Skeleton className="h-full w-full animate-pulse" />
      </div>
    )
  }
)

export const LazyLineChart = dynamic(
  () => import("./line-chart").then(mod => mod.LineChart),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[350px] flex items-center justify-center">
        <Skeleton className="h-full w-full animate-pulse" />
      </div>
    )
  }
)

export const LazyPieChart = dynamic(
  () => import("./pie-chart").then(mod => mod.PieChart),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        <Skeleton className="h-full w-full animate-pulse" />
      </div>
    )
  }
)