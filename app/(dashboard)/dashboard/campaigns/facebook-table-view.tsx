"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Facebook,
  Instagram,
  Globe,
  Play,
  Image as ImageIcon,
  Layers,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointerClick,
  DollarSign,
  Target,
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
  MoreVertical,
  ChevronRight,
  Megaphone,
  FolderOpen,
  FileImage,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Platform icons component
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

// Status badge component
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
  
  const getIcon = () => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return <CheckCircle className="h-3 w-3" />
      case 'PAUSED':
        return <Pause className="h-3 w-3" />
      case 'DELETED':
      case 'ARCHIVED':
        return <XCircle className="h-3 w-3" />
      default:
        return <AlertCircle className="h-3 w-3" />
    }
  }
  
  return (
    <Badge variant={getVariant()} className="text-xs gap-1">
      {getIcon()}
      {status}
    </Badge>
  )
}

// Format metric with appropriate formatting
const formatMetric = (value: number, type: string) => {
  switch (type) {
    case 'currency':
      return `$${value.toFixed(2)}`
    case 'percentage':
      return `${value.toFixed(2)}%`
    case 'decimal':
      return value.toFixed(2)
    case 'integer':
      return Math.round(value).toLocaleString()
    default:
      return value.toString()
  }
}

// Sortable table header
const SortableHeader = ({ 
  children, 
  sortKey, 
  currentSort, 
  onSort,
  className 
}: {
  children: React.ReactNode
  sortKey: string
  currentSort: { key: string; direction: 'asc' | 'desc' } | null
  onSort: (key: string) => void
  className?: string
}) => {
  const isActive = currentSort?.key === sortKey
  const direction = isActive ? currentSort.direction : null
  
  return (
    <TableHead 
      className={cn("cursor-pointer hover:bg-muted/50 select-none", className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center justify-between">
        {children}
        <div className="ml-2 flex flex-col">
          {direction === null && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
          {direction === 'asc' && <ArrowUp className="h-3 w-3" />}
          {direction === 'desc' && <ArrowDown className="h-3 w-3" />}
        </div>
      </div>
    </TableHead>
  )
}

// Interface for the component props
interface FacebookTableViewProps {
  campaigns: any[]
  searchQuery: string
  statusFilter: string
  platformFilter: string
}

// Ad preview component for popup
const AdPreviewPopup = ({ ad, isOpen, onClose }: { 
  ad: any | null
  isOpen: boolean
  onClose: () => void 
}) => {
  if (!ad) return null
  
  // Generate mock preview data based on ad name/type
  const isVideo = ad.name?.toLowerCase().includes('video')
  const isCarousel = ad.name?.toLowerCase().includes('carousel')
  const platform = ad.metadata?.platform || ad.campaign?.provider || 'meta'
  
  // Use real engagement metrics from ad data
  const adMetrics = ad.metadata?.insights || ad.campaign?.metadata?.insights || {}
  const engagementMetrics = {
    likes: adMetrics.likes || 0,
    comments: adMetrics.comments || 0,
    shares: adMetrics.shares || 0,
    views: isVideo ? (adMetrics.video_views || 0) : undefined
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ad.name}</DialogTitle>
          <DialogDescription>
            {ad.campaignName} → {ad.adSetName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Ad Preview */}
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden relative">
                {isVideo ? (
                  <div className="relative w-full h-full">
                    <img 
                      src={`https://picsum.photos/800/450?random=${ad.id}`} 
                      alt={ad.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
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
                    src={`https://picsum.photos/800/450?random=${ad.id}`} 
                    alt={ad.name}
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Platform badge */}
                <div className="absolute top-3 left-3">
                  <div className="bg-white/90 backdrop-blur rounded px-2 py-1 flex items-center gap-1">
                    <PlatformIcon platform={platform} />
                    <span className="text-xs font-medium capitalize">{platform}</span>
                  </div>
                </div>
                
                {/* Status badge */}
                <div className="absolute top-3 right-3">
                  <StatusBadge status={ad.status} />
                </div>
              </div>
              
              {/* Engagement metrics */}
              <div className="flex items-center gap-4 text-sm bg-muted/50 rounded-lg p-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-2 hover:text-red-500 transition-colors">
                      <div className="p-1.5 rounded-full bg-red-50">
                        <Heart className="h-4 w-4 text-red-500" />
                      </div>
                      <span className="font-medium">{engagementMetrics.likes.toLocaleString()}</span>
                    </TooltipTrigger>
                    <TooltipContent>Likes</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                      <div className="p-1.5 rounded-full bg-blue-50">
                        <MessageCircle className="h-4 w-4 text-blue-500" />
                      </div>
                      <span className="font-medium">{engagementMetrics.comments.toLocaleString()}</span>
                    </TooltipTrigger>
                    <TooltipContent>Comments</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-2 hover:text-green-500 transition-colors">
                      <div className="p-1.5 rounded-full bg-green-50">
                        <Share2 className="h-4 w-4 text-green-500" />
                      </div>
                      <span className="font-medium">{engagementMetrics.shares.toLocaleString()}</span>
                    </TooltipTrigger>
                    <TooltipContent>Shares</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {isVideo && engagementMetrics.views && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-2 hover:text-purple-500 transition-colors">
                        <div className="p-1.5 rounded-full bg-purple-50">
                          <Play className="h-4 w-4 text-purple-500" />
                        </div>
                        <span className="font-medium">{engagementMetrics.views.toLocaleString()}</span>
                      </TooltipTrigger>
                      <TooltipContent>Video Views</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>
          
          {/* Detailed Metrics */}
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">Performance Overview</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 p-3 bg-muted/50 rounded">
                    <p className="text-sm text-muted-foreground">Format</p>
                    <div className="flex items-center gap-2">
                      {isVideo ? <Play className="h-4 w-4" /> : 
                       isCarousel ? <Layers className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                      <span className="font-medium">
                        {isVideo ? 'Video' : isCarousel ? 'Carousel' : 'Image'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 p-3 bg-muted/50 rounded">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <StatusBadge status={ad.status} />
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Delivery Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                    <span className="text-sm text-muted-foreground">Impressions</span>
                    <span className="font-bold">
                      {(ad.metadata?.insights?.impressions || ad.campaign?.metadata?.insights?.impressions || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                    <span className="text-sm text-muted-foreground">Reach</span>
                    <span className="font-bold">
                      {(ad.metadata?.insights?.reach || ad.campaign?.metadata?.insights?.reach || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                    <span className="text-sm text-muted-foreground">Frequency</span>
                    <span className="font-bold">
                      {(ad.metadata?.insights?.frequency || ad.campaign?.metadata?.insights?.frequency || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                    <span className="text-sm text-muted-foreground">Clicks</span>
                    <span className="font-bold">
                      {(ad.metadata?.insights?.clicks || ad.campaign?.metadata?.insights?.clicks || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Cost Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                    <span className="text-sm text-muted-foreground">CTR</span>
                    <span className="font-bold">
                      {(ad.metadata?.insights?.ctr || ad.campaign?.metadata?.insights?.ctr || 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                    <span className="text-sm text-muted-foreground">CPC</span>
                    <span className="font-bold">
                      ${(ad.metadata?.insights?.cpc || ad.campaign?.metadata?.insights?.cpc || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                    <span className="text-sm text-muted-foreground">ROAS</span>
                    <span className="font-bold">
                      {(ad.metadata?.insights?.roas || ad.campaign?.metadata?.insights?.roas || 0).toFixed(1)}x
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function FacebookTableView({ 
  campaigns, 
  searchQuery, 
  statusFilter, 
  platformFilter 
}: FacebookTableViewProps) {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'adsets' | 'ads'>('campaigns')
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [selectedAdSets, setSelectedAdSets] = useState<string[]>([])
  const [selectedAds, setSelectedAds] = useState<string[]>([])
  const [selectedAdForPreview, setSelectedAdForPreview] = useState<any>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null
      }
      return { key, direction: 'asc' }
    })
  }

  // Filter campaigns based on filters
  const filteredCampaigns = useMemo(() => {
    let filtered = [...campaigns]
    
    // Platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter(campaign => {
        const campaignPlatform = campaign.provider || 'meta'
        return campaignPlatform.toLowerCase() === platformFilter.toLowerCase()
      })
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => 
        campaign.status?.toUpperCase() === statusFilter
      )
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(campaign =>
        campaign.name?.toLowerCase().includes(query)
      )
    }
    
    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key] || a.metrics?.[sortConfig.key] || 0
        let bValue = b[sortConfig.key] || b.metrics?.[sortConfig.key] || 0
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase()
          bValue = bValue.toLowerCase()
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    
    return filtered
  }, [campaigns, platformFilter, statusFilter, searchQuery, sortConfig])

  // Get ad sets based on selected campaigns or all if none selected
  const availableAdSets = useMemo(() => {
    const targetCampaigns = selectedCampaigns.length > 0 
      ? filteredCampaigns.filter(c => selectedCampaigns.includes(c.id))
      : filteredCampaigns

    const adSets: any[] = []
    targetCampaigns.forEach(campaign => {
      campaign.adGroups?.forEach((adSet: any) => {
        adSets.push({
          ...adSet,
          campaign,
          campaignId: campaign.id,
          campaignName: campaign.name
        })
      })
    })

    // Apply search and status filters to ad sets
    let filtered = adSets
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(adSet => 
        adSet.status?.toUpperCase() === statusFilter
      )
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(adSet =>
        adSet.name?.toLowerCase().includes(query) ||
        adSet.campaignName?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key] || a.metrics?.[sortConfig.key] || 0
        let bValue = b[sortConfig.key] || b.metrics?.[sortConfig.key] || 0
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase()
          bValue = bValue.toLowerCase()
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    
    return filtered
  }, [filteredCampaigns, selectedCampaigns, statusFilter, searchQuery, sortConfig])

  // Get ads based on selected ad sets or all if none selected
  const availableAds = useMemo(() => {
    const targetAdSets = selectedAdSets.length > 0 
      ? availableAdSets.filter(as => selectedAdSets.includes(as.id))
      : availableAdSets

    const ads: any[] = []
    targetAdSets.forEach(adSet => {
      adSet.ads?.forEach((ad: any) => {
        ads.push({
          ...ad,
          adSet,
          campaign: adSet.campaign,
          campaignId: adSet.campaignId,
          campaignName: adSet.campaignName,
          adSetId: adSet.id,
          adSetName: adSet.name
        })
      })
    })

    // Apply search, status, and platform filters to ads
    let filtered = ads
    
    // Platform filter for ads
    if (platformFilter !== 'all') {
      filtered = filtered.filter(ad => {
        const adPlatform = ad.metadata?.platform || 'facebook' // Default to facebook if not specified
        return adPlatform.toLowerCase() === platformFilter.toLowerCase()
      })
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ad => 
        ad.status?.toUpperCase() === statusFilter
      )
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(ad =>
        ad.name?.toLowerCase().includes(query) ||
        ad.campaignName?.toLowerCase().includes(query) ||
        ad.adSetName?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key] || a.metrics?.[sortConfig.key] || 0
        let bValue = b[sortConfig.key] || b.metrics?.[sortConfig.key] || 0
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase()
          bValue = bValue.toLowerCase()
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    
    return filtered
  }, [availableAdSets, selectedAdSets, statusFilter, searchQuery, sortConfig])

  // Selection handlers
  const handleCampaignSelect = (campaignId: string, checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(prev => [...prev, campaignId])
    } else {
      setSelectedCampaigns(prev => prev.filter(id => id !== campaignId))
      // Clear dependent selections
      setSelectedAdSets([])
      setSelectedAds([])
    }
  }

  const handleAdSetSelect = (adSetId: string, checked: boolean) => {
    if (checked) {
      setSelectedAdSets(prev => [...prev, adSetId])
    } else {
      setSelectedAdSets(prev => prev.filter(id => id !== adSetId))
      // Clear dependent selections
      setSelectedAds([])
    }
  }

  const handleAdSelect = (adId: string, checked: boolean) => {
    if (checked) {
      setSelectedAds(prev => [...prev, adId])
    } else {
      setSelectedAds(prev => prev.filter(id => id !== adId))
    }
  }

  // Select all handlers
  const handleSelectAllCampaigns = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(filteredCampaigns.map(c => c.id))
    } else {
      setSelectedCampaigns([])
      setSelectedAdSets([])
      setSelectedAds([])
    }
  }

  const handleSelectAllAdSets = (checked: boolean) => {
    if (checked) {
      setSelectedAdSets(availableAdSets.map(as => as.id))
    } else {
      setSelectedAdSets([])
      setSelectedAds([])
    }
  }

  const handleSelectAllAds = (checked: boolean) => {
    if (checked) {
      setSelectedAds(availableAds.map(ad => ad.id))
    } else {
      setSelectedAds([])
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Ads Manager View
            </CardTitle>
            <CardDescription>
              Hierarchical view of campaigns, ad sets, and ads with Facebook-style navigation
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedCampaigns.length > 0 && (
              <Badge variant="secondary">
                {selectedCampaigns.length} campaigns selected
              </Badge>
            )}
            {selectedAdSets.length > 0 && (
              <Badge variant="secondary">
                {selectedAdSets.length} ad sets selected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Campaigns ({filteredCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="adsets" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Ad Sets ({availableAdSets.length})
            </TabsTrigger>
            <TabsTrigger value="ads" className="flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              Ads ({availableAds.length})
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          filteredCampaigns.length > 0 && 
                          selectedCampaigns.length === filteredCampaigns.length
                        }
                        onCheckedChange={handleSelectAllCampaigns}
                      />
                    </TableHead>
                    <SortableHeader 
                      sortKey="name" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                    >
                      Campaign
                    </SortableHeader>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <SortableHeader 
                      sortKey="spend" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Spend
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="impressions" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Impressions
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="clicks" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Clicks
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="ctr" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      CTR
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="cpc" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      CPC
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="roas" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      ROAS
                    </SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => (
                    <TableRow 
                      key={campaign.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selectedCampaigns.includes(campaign.id) && "bg-muted"
                      )}
                      onClick={() => handleCampaignSelect(campaign.id, !selectedCampaigns.includes(campaign.id))}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedCampaigns.includes(campaign.id)}
                          onCheckedChange={(checked) => handleCampaignSelect(campaign.id, !!checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        <PlatformIcon platform={campaign.provider || 'meta'} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={campaign.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.metrics?.spend || 0, 'currency')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.metrics?.impressions || 0, 'integer')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.metrics?.clicks || 0, 'integer')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.metrics?.ctr || 0, 'percentage')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.metrics?.cpc || 0, 'currency')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.metrics?.roas || 0, 'decimal')}x
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Ad Sets Tab */}
          <TabsContent value="adsets" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          availableAdSets.length > 0 && 
                          selectedAdSets.length === availableAdSets.length
                        }
                        onCheckedChange={handleSelectAllAdSets}
                      />
                    </TableHead>
                    <SortableHeader 
                      sortKey="name" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                    >
                      Ad Set
                    </SortableHeader>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <SortableHeader 
                      sortKey="spend" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Spend
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="impressions" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Impressions
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="clicks" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Clicks
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="ctr" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      CTR
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="cpc" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      CPC
                    </SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableAdSets.map((adSet) => (
                    <TableRow 
                      key={adSet.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selectedAdSets.includes(adSet.id) && "bg-muted"
                      )}
                      onClick={() => handleAdSetSelect(adSet.id, !selectedAdSets.includes(adSet.id))}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedAdSets.includes(adSet.id)}
                          onCheckedChange={(checked) => handleAdSetSelect(adSet.id, !!checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{adSet.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {adSet.campaignName}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={adSet.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(adSet.metadata?.insights?.spend || adSet.metrics?.spend || 0, 'currency')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(adSet.metadata?.insights?.impressions || adSet.metrics?.impressions || 0, 'integer')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(adSet.metadata?.insights?.clicks || adSet.metrics?.clicks || 0, 'integer')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(adSet.metadata?.insights?.ctr || adSet.metrics?.ctr || 0, 'percentage')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(adSet.metadata?.insights?.cpc || adSet.metrics?.cpc || 0, 'currency')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Ads Tab */}
          <TabsContent value="ads" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      Preview
                    </TableHead>
                    <SortableHeader 
                      sortKey="name" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                    >
                      Ad
                    </SortableHeader>
                    <TableHead>Ad Set</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Status</TableHead>
                    <SortableHeader 
                      sortKey="spend" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Spend
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="impressions" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Impressions
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="clicks" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Clicks
                    </SortableHeader>
                    <SortableHeader 
                      sortKey="ctr" 
                      currentSort={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      CTR
                    </SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableAds.map((ad) => {
                    const format = ad.name?.toLowerCase().includes('video') ? 'video' :
                                 ad.name?.toLowerCase().includes('carousel') ? 'carousel' : 'image'
                    
                    const FormatIcon = format === 'video' ? Play : 
                                     format === 'carousel' ? Layers : ImageIcon
                    
                    return (
                      <TableRow 
                        key={ad.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedAdForPreview(ad)}
                      >
                        <TableCell className="w-12">
                          <div className="flex items-center justify-center">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{ad.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {ad.adSetName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ad.campaignName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FormatIcon className="h-4 w-4" />
                            <span className="capitalize">{format}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ad.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMetric(ad.metadata?.insights?.spend || ad.metrics?.spend || 0, 'currency')}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMetric(ad.metadata?.insights?.impressions || ad.metrics?.impressions || 0, 'integer')}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMetric(ad.metadata?.insights?.clicks || ad.metrics?.clicks || 0, 'integer')}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMetric(ad.metadata?.insights?.ctr || ad.metrics?.ctr || 0, 'percentage')}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Ad Preview Popup */}
        <AdPreviewPopup 
          ad={selectedAdForPreview}
          isOpen={!!selectedAdForPreview}
          onClose={() => setSelectedAdForPreview(null)}
        />
      </CardContent>
    </Card>
  )
}