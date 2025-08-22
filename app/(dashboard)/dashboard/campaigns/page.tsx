"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { History, LayoutGrid } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamically import the enhanced view to avoid SSR issues
const EnhancedCampaignsView = dynamic(
  () => import('./campaigns-enhanced'),
  { 
    ssr: false,
    loading: () => <div className="p-8 text-center">Loading enhanced view...</div>
  }
)

// Dynamically import change history
const ChangeHistory = dynamic(
  () => import('@/components/change-history').then(mod => mod.ChangeHistory),
  { 
    ssr: false,
    loading: () => <div className="p-8 text-center">Loading change history...</div>
  }
)


export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState("campaigns")
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {activeTab === "campaigns" && (
        <EnhancedCampaignsView activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
      
      {activeTab === "changes" && (
        <ChangeHistory activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
    </div>
  )
}