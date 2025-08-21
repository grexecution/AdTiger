"use client"

import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"

// Dynamically import table view to avoid SSR issues
const FacebookTableView = dynamic(() => import('./facebook-table-view'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center">Loading table view...</div>
})
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { History, LayoutGrid } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Facebook,
  Instagram,
  Globe,
  Play,
  Image as ImageIcon,
  Layers,
  Grid3x3,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointerClick,
  Heart,
  MessageCircle,
  Share2,
  DollarSign,
  Users,
  Target,
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
  MoreVertical,
  Download,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  Package,
  ShoppingBag,
  Filter,
  Loader2,
  X,
  Check,
  ChevronsUpDown,
  Search,
  FolderOpen,
  Megaphone,
  CircleCheckBig,
  RefreshCw,
  Info
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { GoogleAdPreview } from "@/components/ads/google-ad-preview"
import { SyncStatusPanel } from "@/components/dashboard/sync-status-panel"

// Platform icons
const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform?.toLowerCase()) {
    case 'facebook':
      return <Facebook className="h-4 w-4 text-blue-600" />
    case 'instagram':
      return <Instagram className="h-4 w-4 text-pink-600" />
    case 'meta':
      return (
        <div className="flex gap-0.5">
          <Facebook className="h-3 w-3 text-blue-600" />
          <Instagram className="h-3 w-3 text-pink-600" />
        </div>
      )
    case 'google':
      return (
        <div className="flex items-center">
          <div className="h-4 w-4 rounded-full bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 p-0.5">
            <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
              <span className="text-[10px] font-bold">G</span>
            </div>
          </div>
        </div>
      )
    default:
      return <Globe className="h-4 w-4 text-gray-600" />
  }
}

// Format icon based on ad type/name
const FormatIcon = ({ format }: { format: string }) => {
  const formatLower = format?.toLowerCase() || ''
  if (formatLower.includes('video')) return <Play className="h-4 w-4" />
  if (formatLower.includes('carousel')) return <Layers className="h-4 w-4" />
  if (formatLower.includes('collection')) return <Grid3x3 className="h-4 w-4" />
  return <ImageIcon className="h-4 w-4" />
}

// Status badge with colors
const StatusBadge = ({ status }: { status: string }) => {
  const getVariant = () => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'default'
      case 'PAUSED':
        return 'secondary'
      case 'DELETED':
      case 'ARCHIVED':
        return 'destructive'
      default:
        return 'outline'
    }
  }
  
  return (
    <Badge variant={getVariant()} className="text-xs">
      {status}
    </Badge>
  )
}

// Metric card component
const MetricCard = ({ 
  label, 
  value, 
  change, 
  icon: Icon,
  trend,
  prefix = '',
  suffix = ''
}: { 
  label: string
  value: string | number
  change?: number
  icon: any
  trend?: 'up' | 'down'
  prefix?: string
  suffix?: string
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="flex items-end justify-between">
      <span className="text-2xl font-bold">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </span>
      {change !== undefined && (
        <span className={`text-sm flex items-center ${
          trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
        }`}>
          {trend === 'up' ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : trend === 'down' ? (
            <ArrowDownRight className="h-3 w-3" />
          ) : null}
          {Math.abs(change)}%
        </span>
      )}
    </div>
  </div>
)

// Ad preview component
const AdPreview = ({ ad, campaign, adSet, onExpand }: { 
  ad: any
  campaign: any
  adSet: any
  onExpand: () => void 
}) => {
  const platform = ad.metadata?.platform || (campaign.provider === 'google' ? 'google_search' : 'facebook')
  const provider = campaign.provider || 'meta'
  
  // Use Google Ad Preview for Google ads
  if (provider === 'google') {
    return (
      <GoogleAdPreview 
        ad={ad}
        campaign={campaign}
        adSet={adSet}
        onExpand={onExpand}
      />
    )
  }
  
  // Meta/Facebook ad preview (original logic)
  const isVideo = ad.name?.toLowerCase().includes('video')
  const isCarousel = ad.name?.toLowerCase().includes('carousel')
  
  // Mock engagement metrics (in real app, these would come from the API)
  const mockMetrics = {
    likes: Math.floor(Math.random() * 5000) + 500,
    comments: Math.floor(Math.random() * 500) + 50,
    shares: Math.floor(Math.random() * 1000) + 100,
    views: isVideo ? Math.floor(Math.random() * 50000) + 5000 : undefined
  }
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 group">
      {/* Media Preview */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200">
        {isVideo ? (
          <div className="relative w-full h-full">
            <img 
              src={`https://picsum.photos/400/300?random=${ad.id}`} 
              alt={ad.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="rounded-full bg-white/90 p-3 shadow-lg">
                <Play className="h-6 w-6 text-gray-900" fill="currentColor" />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              0:30
            </div>
          </div>
        ) : isCarousel ? (
          <div className="relative w-full h-full p-4">
            <div className="flex gap-2 h-full">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="flex-1 rounded overflow-hidden">
                  <img 
                    src={`https://picsum.photos/200/200?random=${ad.id}_${idx}`} 
                    alt={`${ad.name} ${idx}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="w-1.5 h-1.5 rounded-full bg-white/70" />
              ))}
            </div>
          </div>
        ) : (
          <img 
            src={`https://picsum.photos/400/300?random=${ad.id}`} 
            alt={ad.name}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Platform badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur">
            <PlatformIcon platform={platform} />
            <span className="ml-1 capitalize text-xs">{platform}</span>
          </Badge>
        </div>
        
        {/* Status badge */}
        <div className="absolute top-2 right-2 flex gap-2">
          <StatusBadge status={ad.status} />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onExpand()
            }}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4">
        {/* Ad info */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-start justify-between">
              <h4 className="font-semibold text-sm line-clamp-1">{ad.name}</h4>
              <FormatIcon format={ad.name} />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-primary">
                {campaign.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {adSet.name}
              </p>
            </div>
          </div>
          
          {/* Engagement metrics */}
          <div className="flex items-center gap-3 text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1 hover:text-red-500 transition-colors">
                  <Heart className="h-3 w-3" />
                  <span className="text-xs">{mockMetrics.likes.toLocaleString()}</span>
                </TooltipTrigger>
                <TooltipContent>Likes</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                  <MessageCircle className="h-3 w-3" />
                  <span className="text-xs">{mockMetrics.comments.toLocaleString()}</span>
                </TooltipTrigger>
                <TooltipContent>Comments</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1 hover:text-green-500 transition-colors">
                  <Share2 className="h-3 w-3" />
                  <span className="text-xs">{mockMetrics.shares.toLocaleString()}</span>
                </TooltipTrigger>
                <TooltipContent>Shares</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {isVideo && mockMetrics.views && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1 hover:text-purple-500 transition-colors">
                    <Play className="h-3 w-3" />
                    <span className="text-xs">{mockMetrics.views.toLocaleString()}</span>
                  </TooltipTrigger>
                  <TooltipContent>Video Views</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <Separator />
          
          {/* Performance metrics from actual data */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">CTR</p>
              <p className="font-semibold">
                {((campaign.metrics?.ctr || Math.random() * 3 + 0.5).toFixed(2))}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">CPC</p>
              <p className="font-semibold">
                ${((campaign.metrics?.cpc || Math.random() * 2 + 0.3).toFixed(2))}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">ROAS</p>
              <p className="font-semibold">
                {((campaign.metrics?.roas || Math.random() * 5 + 1).toFixed(1))}x
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main enhanced campaigns component
export default function EnhancedCampaignsView({ activeTab, setActiveTab }: { activeTab?: string, setActiveTab?: (value: string) => void }) {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [selectedAdSets, setSelectedAdSets] = useState<string[]>([])
  const [selectedAd, setSelectedAd] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('')
  const [adSetSearchQuery, setAdSetSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [formatFilter, setFormatFilter] = useState<string>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const { toast } = useToast()
  
  useEffect(() => {
    fetchCampaigns()
  }, [])
  
  const fetchCampaigns = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/campaigns')
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async (provider: string = "meta") => {
    try {
      setIsSyncing(true)
      
      const response = await fetch('/api/sync/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to trigger sync')
      }

      toast({
        title: "Sync started",
        description: "Your sync has been added to the queue and will process shortly",
      })

      // Refresh campaigns after a delay
      setTimeout(() => {
        fetchCampaigns()
        setIsSyncing(false)
      }, 5000)
      
    } catch (error) {
      console.error('Error triggering sync:', error)
      toast({
        title: "Sync failed",
        description: "Failed to start sync. Please try again.",
        variant: "destructive"
      })
      setIsSyncing(false)
    }
  }
  
  // Flatten all ads from all campaigns and ad sets
  const allAds = useMemo(() => {
    const ads: any[] = []
    campaigns.forEach(campaign => {
      campaign.adGroups?.forEach((adSet: any) => {
        adSet.ads?.forEach((ad: any) => {
          ads.push({
            ...ad,
            campaign,
            adSet,
            campaignId: campaign.id,
            adSetId: adSet.id,
            campaignName: campaign.name,
            adSetName: adSet.name
          })
        })
      })
    })
    return ads
  }, [campaigns])
  
  // Get unique ad sets for filter options
  const allAdSets = useMemo(() => {
    const adSets: any[] = []
    campaigns.forEach(campaign => {
      campaign.adGroups?.forEach((adSet: any) => {
        adSets.push({
          ...adSet,
          campaignId: campaign.id,
          campaignName: campaign.name
        })
      })
    })
    return adSets
  }, [campaigns])
  
  // Filter ads based on selected campaigns, ad sets, search, and other filters
  const filteredAds = useMemo(() => {
    let filtered = [...allAds]
    
    // Filter by platform
    if (platformFilter !== 'all') {
      filtered = filtered.filter(ad => {
        const adPlatform = ad.metadata?.platform || 'facebook' // Default to facebook if not specified
        return adPlatform.toLowerCase() === platformFilter.toLowerCase()
      })
    }
    
    // Filter by selected campaigns
    if (selectedCampaigns.length > 0) {
      filtered = filtered.filter(ad => selectedCampaigns.includes(ad.campaignId))
    }
    
    // Filter by selected ad sets
    if (selectedAdSets.length > 0) {
      filtered = filtered.filter(ad => selectedAdSets.includes(ad.adSetId))
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(ad => 
        ad.name?.toLowerCase().includes(query) ||
        ad.campaignName?.toLowerCase().includes(query) ||
        ad.adSetName?.toLowerCase().includes(query)
      )
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ad => ad.status?.toUpperCase() === statusFilter)
    }
    
    // Filter by format
    if (formatFilter !== 'all') {
      filtered = filtered.filter(ad => {
        const name = ad.name?.toLowerCase() || ''
        switch (formatFilter) {
          case 'video':
            return name.includes('video')
          case 'carousel':
            return name.includes('carousel')
          case 'image':
            return !name.includes('video') && !name.includes('carousel')
          default:
            return true
        }
      })
    }
    
    return filtered
  }, [allAds, selectedCampaigns, selectedAdSets, searchQuery, statusFilter, formatFilter, platformFilter])
  
  // Calculate metrics for filtered ads
  const filteredMetrics = useMemo(() => {
    const uniqueCampaigns = new Set(filteredAds.map(ad => ad.campaignId))
    const relevantCampaigns = campaigns.filter(c => uniqueCampaigns.has(c.id))
    
    return relevantCampaigns.reduce((acc, campaign) => {
      return {
        spend: acc.spend + (campaign.metrics?.spend || 0),
        impressions: acc.impressions + (campaign.metrics?.impressions || 0),
        clicks: acc.clicks + (campaign.metrics?.clicks || 0),
        conversions: acc.conversions + (campaign.metrics?.conversions || 0),
      }
    }, { spend: 0, impressions: 0, clicks: 0, conversions: 0 })
  }, [filteredAds, campaigns])
  
  // Calculate average ROAS for filtered campaigns
  const avgRoas = useMemo(() => {
    const uniqueCampaigns = new Set(filteredAds.map(ad => ad.campaignId))
    const relevantCampaigns = campaigns.filter(c => uniqueCampaigns.has(c.id))
    
    if (relevantCampaigns.length === 0) return 0
    return relevantCampaigns.reduce((sum, c) => sum + (c.metrics?.roas || 0), 0) / relevantCampaigns.length
  }, [filteredAds, campaigns])
  
  const clearFilters = () => {
    setSelectedCampaigns([])
    setSelectedAdSets([])
    setSearchQuery('')
    setStatusFilter('all')
    setFormatFilter('all')
    setPlatformFilter('all')
  }
  
  const hasActiveFilters = selectedCampaigns.length > 0 || 
                          selectedAdSets.length > 0 || 
                          searchQuery || 
                          statusFilter !== 'all' || 
                          formatFilter !== 'all' ||
                          platformFilter !== 'all'
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">All Ads Overview</h2>
          <p className="text-muted-foreground">
            Viewing {filteredAds.length} of {allAds.length} ads across all campaigns
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
      
      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ads, campaigns, or ad sets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            {/* Campaign Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[160px] justify-between">
                  <span className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    Campaigns
                    {selectedCampaigns.length > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1 min-w-[20px]">
                        {selectedCampaigns.length}
                      </Badge>
                    )}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-2">
                <div className="space-y-2">
                  <div className="flex items-center px-2 pb-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                      placeholder="Search campaigns..."
                      value={campaignSearchQuery}
                      onChange={(e) => setCampaignSearchQuery(e.target.value)}
                      className="flex h-9 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {campaigns
                        .filter(campaign => 
                          !campaignSearchQuery || 
                          campaign.name?.toLowerCase().includes(campaignSearchQuery.toLowerCase())
                        )
                        .map((campaign) => (
                        <div
                          key={campaign.id}
                          className="flex items-center space-x-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
                          onClick={() => {
                            setSelectedCampaigns(prev =>
                              prev.includes(campaign.id)
                                ? prev.filter(id => id !== campaign.id)
                                : [...prev, campaign.id]
                            )
                          }}
                        >
                          <Checkbox
                            checked={selectedCampaigns.includes(campaign.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCampaigns(prev => [...prev, campaign.id])
                              } else {
                                setSelectedCampaigns(prev => prev.filter(id => id !== campaign.id))
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {campaign.adGroups?.length || 0} ad sets
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Ad Set Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[160px] justify-between">
                  <span className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Ad Sets
                    {selectedAdSets.length > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1 min-w-[20px]">
                        {selectedAdSets.length}
                      </Badge>
                    )}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-2">
                <div className="space-y-2">
                  <div className="flex items-center px-2 pb-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                      placeholder="Search ad sets..."
                      value={adSetSearchQuery}
                      onChange={(e) => setAdSetSearchQuery(e.target.value)}
                      className="flex h-9 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-1">
                      {allAdSets
                        .filter(adSet => 
                          !adSetSearchQuery || 
                          adSet.name?.toLowerCase().includes(adSetSearchQuery.toLowerCase()) ||
                          adSet.campaignName?.toLowerCase().includes(adSetSearchQuery.toLowerCase())
                        )
                        .map((adSet) => (
                        <div
                          key={adSet.id}
                          className="flex items-center space-x-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
                          onClick={() => {
                            setSelectedAdSets(prev =>
                              prev.includes(adSet.id)
                                ? prev.filter(id => id !== adSet.id)
                                : [...prev, adSet.id]
                            )
                          }}
                        >
                          <Checkbox
                            checked={selectedAdSets.includes(adSet.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAdSets(prev => [...prev, adSet.id])
                              } else {
                                setSelectedAdSets(prev => prev.filter(id => id !== adSet.id))
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{adSet.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {adSet.campaignName} • {adSet.ads?.length || 0} ads
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="DELETED">Deleted</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Format Filter */}
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="carousel">Carousel</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Platform Filter */}
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="facebook">
                  <span className="flex items-center gap-2">
                    <PlatformIcon platform="facebook" />
                    Facebook
                  </span>
                </SelectItem>
                <SelectItem value="instagram">
                  <span className="flex items-center gap-2">
                    <PlatformIcon platform="instagram" />
                    Instagram
                  </span>
                </SelectItem>
                <SelectItem value="google_search">
                  <span className="flex items-center gap-2">
                    <PlatformIcon platform="google" />
                    Google Search
                  </span>
                </SelectItem>
                <SelectItem value="youtube">
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-red-600 flex items-center justify-center">
                      <Play className="h-2.5 w-2.5 text-white" fill="currentColor" />
                    </div>
                    YouTube
                  </span>
                </SelectItem>
                <SelectItem value="google_display">
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 text-blue-600">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <rect x="6" y="6" width="12" height="8" fill="currentColor"/>
                      </svg>
                    </div>
                    Google Display
                  </span>
                </SelectItem>
                <SelectItem value="google_shopping">
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-green-600" />
                    Google Shopping
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="h-7 px-2"
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grid View</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="h-7 px-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Table View</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          
          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedCampaigns.map(campaignId => {
                const campaign = campaigns.find(c => c.id === campaignId)
                return campaign ? (
                  <Badge key={campaignId} variant="secondary" className="gap-1">
                    <Megaphone className="h-3 w-3" />
                    {campaign.name}
                    <button
                      onClick={() => setSelectedCampaigns(prev => prev.filter(id => id !== campaignId))}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null
              })}
              {selectedAdSets.map(adSetId => {
                const adSet = allAdSets.find(a => a.id === adSetId)
                return adSet ? (
                  <Badge key={adSetId} variant="secondary" className="gap-1">
                    <FolderOpen className="h-3 w-3" />
                    {adSet.name}
                    <button
                      onClick={() => setSelectedAdSets(prev => prev.filter(id => id !== adSetId))}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null
              })}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  <Search className="h-3 w-3" />
                  "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Status: {statusFilter}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {formatFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Format: {formatFilter}
                  <button
                    onClick={() => setFormatFilter('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {platformFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  <PlatformIcon platform={platformFilter} />
                  {platformFilter.charAt(0).toUpperCase() + platformFilter.slice(1)}
                  <button
                    onClick={() => setPlatformFilter('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Metrics for filtered ads */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <MetricCard
              label="Total Spend"
              value={filteredMetrics.spend.toFixed(2)}
              prefix="$"
              change={12}
              trend="up"
              icon={DollarSign}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <MetricCard
              label="Impressions"
              value={filteredMetrics.impressions}
              change={8}
              trend="up"
              icon={Eye}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <MetricCard
              label="Clicks"
              value={filteredMetrics.clicks}
              change={15}
              trend="up"
              icon={MousePointerClick}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <MetricCard
              label="Conversions"
              value={filteredMetrics.conversions}
              change={23}
              trend="up"
              icon={Target}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <MetricCard
              label="Avg ROAS"
              value={avgRoas.toFixed(2)}
              suffix="x"
              change={5}
              trend="up"
              icon={TrendingUp}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Ads Grid/List/Table */}
      {viewMode === 'table' ? (
        <FacebookTableView 
          campaigns={campaigns}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          platformFilter={platformFilter}
        />
      ) : filteredAds.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAds.map((ad) => (
            <AdPreview 
              key={ad.id} 
              ad={ad}
              campaign={ad.campaign}
              adSet={ad.adSet}
              onExpand={() => setSelectedAd(ad)}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold">No ads found</h3>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters 
                ? "Try adjusting your filters to see more ads" 
                : "No ads available to display"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear all filters
              </Button>
            )}
          </div>
        </Card>
      )}
      
      {/* Ad Detail Dialog */}
      <Dialog open={!!selectedAd} onOpenChange={() => setSelectedAd(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedAd && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle>{selectedAd.name}</DialogTitle>
                <DialogDescription>
                  {selectedAd.campaignName} → {selectedAd.adSetName}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Ad Preview */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Ad Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          <img 
                            src={`https://picsum.photos/800/450?random=${selectedAd.id}`} 
                            alt={selectedAd.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold">{selectedAd.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            This is a preview of how your ad appears to users. 
                            Actual appearance may vary based on placement and device.
                          </p>
                          <Button className="w-full">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Live Ad
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Detailed Metrics */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Status</p>
                          <StatusBadge status={selectedAd.status} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Format</p>
                          <div className="flex items-center gap-2">
                            <FormatIcon format={selectedAd.name} />
                            <span className="text-sm font-medium">
                              {selectedAd.name?.includes('Video') ? 'Video' : 
                               selectedAd.name?.includes('Carousel') ? 'Carousel' : 'Image'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <h5 className="font-medium text-sm">Delivery Metrics</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Impressions</p>
                            <p className="text-lg font-bold">
                              {Math.floor(Math.random() * 100000 + 10000).toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Reach</p>
                            <p className="text-lg font-bold">
                              {Math.floor(Math.random() * 80000 + 8000).toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Frequency</p>
                            <p className="text-lg font-bold">
                              {(Math.random() * 2 + 1).toFixed(2)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Clicks</p>
                            <p className="text-lg font-bold">
                              {Math.floor(Math.random() * 5000 + 500).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <h5 className="font-medium text-sm">Engagement</h5>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-2">
                              <Heart className="h-4 w-4" /> Reactions
                            </span>
                            <span className="font-medium">
                              {Math.floor(Math.random() * 5000 + 500).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-2">
                              <MessageCircle className="h-4 w-4" /> Comments
                            </span>
                            <span className="font-medium">
                              {Math.floor(Math.random() * 500 + 50).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-2">
                              <Share2 className="h-4 w-4" /> Shares
                            </span>
                            <span className="font-medium">
                              {Math.floor(Math.random() * 1000 + 100).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}