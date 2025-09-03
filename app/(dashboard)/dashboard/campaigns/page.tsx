"use client"

import dynamic from "next/dynamic"

// Dynamically import the enhanced view to avoid SSR issues
const EnhancedCampaignsView = dynamic(
  () => import('./campaigns-enhanced'),
  { 
    ssr: false,
    loading: () => <div className="p-8 text-center">Loading campaigns...</div>
  }
)

export default function CampaignsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <EnhancedCampaignsView />
    </div>
  )
}