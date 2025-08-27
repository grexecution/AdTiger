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
  Info,
  SlidersHorizontal,
  AtSign,
  Building,
  MapPin,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Hash
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { GoogleAdPreview } from "@/components/ads/google-ad-preview"
import { SyncStatusPanel } from "@/components/dashboard/sync-status-panel"
import { getCreativeImageUrl, getCreativeFormat, isVideoCreative, isCarouselCreative, getAllCreativeImageUrls, getBestCreativeImageUrl } from "@/lib/utils/creative-utils"
import { getCurrencySymbol } from "@/lib/currency"
import { AdDetailDialogEnhanced } from "@/components/campaigns/ad-detail-dialog-enhanced"

// Helper functions for formatting metrics
const formatMetricNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '-'
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  } else {
    return value.toFixed(0)
  }
}

const formatCTR = (ctr: number | undefined, clicks: number | undefined, impressions: number | undefined): string => {
  // If CTR is provided, use it
  if (ctr !== undefined && ctr !== null && !isNaN(ctr)) {
    return `${ctr.toFixed(2)}%`
  }
  
  // Otherwise calculate it from clicks and impressions
  if (clicks !== undefined && impressions !== undefined && impressions > 0) {
    const calculatedCtr = (clicks / impressions) * 100
    return `${calculatedCtr.toFixed(2)}%`
  }
  
  return '-'
}

const formatCPC = (cpc: number | undefined, spend: number | undefined, clicks: number | undefined, currency: string = 'USD'): string => {
  const symbol = getCurrencySymbol(currency)
  
  // If CPC is provided and valid, use it (removed > 0 check as CPC can be 0)
  if (cpc !== undefined && cpc !== null && !isNaN(cpc)) {
    return `${symbol}${cpc.toFixed(2)}`
  }
  
  // Otherwise calculate it from spend and clicks
  if (spend !== undefined && spend !== null && !isNaN(spend) && 
      clicks !== undefined && clicks !== null && !isNaN(clicks) && clicks > 0) {
    const calculatedCpc = spend / clicks
    return `${symbol}${calculatedCpc.toFixed(2)}`
  }
  
  // If we have spend but no clicks, CPC is technically undefined (not 0)
  if (spend !== undefined && spend > 0 && (!clicks || clicks === 0)) {
    return '-'
  }
  
  // If no spend and no clicks, CPC is 0
  if ((spend === 0 || !spend) && (clicks === 0 || !clicks)) {
    return `${symbol}0.00`
  }
  
  return '-'
}

// Helper function to extract conversions from rawActions
const extractConversions = (adMetrics: any) => {
  let totalConversions = 0
  let conversionTypes: { [key: string]: number } = {}
  const seenValues = new Set<string>() // Track what we've already counted
  
  // Check for rawActions array
  if (adMetrics?.rawActions && Array.isArray(adMetrics.rawActions)) {
    adMetrics.rawActions.forEach((action: any) => {
      const actionType = action.action_type || ''
      const value = parseInt(action.value || '0')
      
      // Priority list - only count the highest priority conversion type to avoid double counting
      // For example, if we have both 'lead' and 'offsite_conversion.fb_pixel_lead', only count once
      const conversionPriority = [
        'lead', // This is the main conversion we want
        'purchase',
        'complete_registration',
        'submit_application',
        'schedule',
        'contact',
        'subscribe',
        'donate'
      ]
      
      // Check if this is a primary conversion type
      for (const convType of conversionPriority) {
        if (actionType === convType) {
          if (!seenValues.has(convType)) {
            totalConversions += value
            conversionTypes[actionType] = value
            seenValues.add(convType)
          }
          break
        }
      }
      
      // Only add pixel/offsite conversions if we haven't seen the main conversion
      if (actionType.includes('offsite_conversion') || actionType.includes('onsite_')) {
        const baseType = actionType.includes('lead') ? 'lead' : 
                         actionType.includes('purchase') ? 'purchase' : 
                         actionType.includes('complete_registration') ? 'complete_registration' : null
        
        if (baseType && !seenValues.has(baseType)) {
          totalConversions += value
          conversionTypes[actionType] = value
          seenValues.add(baseType)
        }
      }
    })
  }
  
  // Fallback to conversions field if no rawActions
  if (totalConversions === 0 && adMetrics?.conversions) {
    totalConversions = adMetrics.conversions
  }
  
  return { total: totalConversions, types: conversionTypes }
}

// Targeting info component
const TargetingInfo = ({ adSet }: { adSet: any }) => {
  // Extract targeting data from adSet metadata
  const targeting = adSet?.metadata?.rawData?.targeting || {}
  
  // Format age range
  const ageRange = targeting.age_min && targeting.age_max 
    ? `${targeting.age_min}-${targeting.age_max}` 
    : targeting.age_min 
      ? `${targeting.age_min}+` 
      : targeting.age_max 
        ? `Up to ${targeting.age_max}` 
        : null
  
  // Format genders - handle array properly
  const genders = targeting.genders && Array.isArray(targeting.genders) && targeting.genders.length > 0
    ? targeting.genders.map((g: number) => g === 1 ? 'M' : g === 2 ? 'F' : 'All').join('/')
    : null
  
  // Format locations - abbreviated
  const locations = targeting.geo_locations?.countries 
    ? targeting.geo_locations.countries.join(', ')
    : targeting.geo_locations?.cities 
      ? targeting.geo_locations.cities.map((c: any) => c.name || c).join(', ')
      : targeting.geo_locations?.regions
        ? targeting.geo_locations.regions.map((r: any) => r.name || r).join(', ')
        : null
  
  // Format languages - debug and fix the "5" issue
  let languages = null
  if (targeting.locales && Array.isArray(targeting.locales) && targeting.locales.length > 0) {
    const processedLanguages = targeting.locales
      .map((l: any) => {
        // Skip numeric values (like "5") which aren't locale codes
        if (typeof l === 'number' || (typeof l === 'string' && !isNaN(Number(l)))) {
          console.log('Skipping numeric locale value:', l)
          return null
        }
        
        // Map locale codes to language names
        const langMap: { [key: string]: string } = {
          'en_US': 'English',
          'en_GB': 'English',
          'de_DE': 'German',
          'de_AT': 'German',
          'de_CH': 'German',
          'fr_FR': 'French',
          'es_ES': 'Spanish',
          'it_IT': 'Italian',
          'pt_PT': 'Portuguese',
          'pt_BR': 'Portuguese',
          'nl_NL': 'Dutch',
          'pl_PL': 'Polish',
          'ru_RU': 'Russian',
          'ar_AR': 'Arabic',
          'zh_CN': 'Chinese',
          'ja_JP': 'Japanese',
          'ko_KR': 'Korean'
        }
        
        const langCode = typeof l === 'object' ? l.key || l.value || l : l
        return langMap[langCode] || (langCode?.length <= 3 ? langCode : null)
      })
      .filter(Boolean)
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
    
    if (processedLanguages.length > 0) {
      languages = processedLanguages.join('/')
    }
  }
  
  // Build display with compact layout
  if (!locations && !ageRange && !genders && !languages) {
    return (
      <p className="text-xs text-muted-foreground">
        No targeting data
      </p>
    )
  }
  
  // Compact single-line layout
  return (
    <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
      {locations && (
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate max-w-[100px]">{locations}</span>
        </span>
      )}
      {(ageRange || genders) && (
        <span className="flex items-center gap-1">
          <User className="h-3 w-3 flex-shrink-0" />
          <span>{[ageRange, genders].filter(Boolean).join(' ')}</span>
        </span>
      )}
      {languages && (
        <span className="flex items-center gap-1">
          <Globe className="h-3 w-3 flex-shrink-0" />
          <span>{languages}</span>
        </span>
      )}
    </div>
  )
}

// Platform icons
const PlatformIcon = ({ platform, size = "h-4 w-4" }: { platform: string, size?: string }) => {
  switch (platform?.toLowerCase()) {
    case 'facebook':
      return <Facebook className={`${size} text-blue-600`} />
    case 'instagram':
      return <Instagram className={`${size} text-pink-600`} />
    case 'messenger':
      return <MessageCircle className={`${size} text-blue-500`} />
    case 'threads':
      return <AtSign className={`${size} text-gray-800`} />
    case 'whatsapp':
      return <MessageCircle className={`${size} text-green-600`} />
    case 'meta':
      // Official Meta infinity logo
      return (
        <svg viewBox="0 0 290 191" className={size} fill="none">
          <defs>
            <linearGradient id="meta-grad1" x1="61" y1="117" x2="259" y2="127" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0064e1" offset="0"/>
              <stop stopColor="#0064e1" offset="0.4"/>
              <stop stopColor="#0073ee" offset="0.83"/>
              <stop stopColor="#0082fb" offset="1"/>
            </linearGradient>
            <linearGradient id="meta-grad2" x1="45" y1="139" x2="45" y2="66" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0082fb" offset="0"/>
              <stop stopColor="#0064e0" offset="1"/>
            </linearGradient>
          </defs>
          <path fill="#0081fb" d="m31.06,125.96c0,10.98 2.41,19.41 5.56,24.51 4.13,6.68 10.29,9.51 16.57,9.51 8.1,0 15.51-2.01 29.79-21.76 11.44-15.83 24.92-38.05 33.99-51.98l15.36-23.6c10.67-16.39 23.02-34.61 37.18-46.96 11.56-10.08 24.03-15.68 36.58-15.68 21.07,0 41.14,12.21 56.5,35.11 16.81,25.08 24.97,56.67 24.97,89.27 0,19.38-3.82,33.62-10.32,44.87-6.28,10.88-18.52,21.75-39.11,21.75l0-31.02c17.63,0 22.03-16.2 22.03-34.74 0-26.42-6.16-55.74-19.73-76.69-9.63-14.86-22.11-23.94-35.84-23.94-14.85,0-26.8,11.2-40.23,31.17-7.14,10.61-14.47,23.54-22.7,38.13l-9.06,16.05c-18.2,32.27-22.81,39.62-31.91,51.75-15.95,21.24-29.57,29.29-47.5,29.29-21.27,0-34.72-9.21-43.05-23.09-6.8-11.31-10.14-26.15-10.14-43.06z"/>
          <path fill="url(#meta-grad1)" d="m24.49,37.3c14.24-21.95 34.79-37.3 58.36-37.3 13.65,0 27.22,4.04 41.39,15.61 15.5,12.65 32.02,33.48 52.63,67.81l7.39,12.32c17.84,29.72 27.99,45.01 33.93,52.22 7.64,9.26 12.99,12.02 19.94,12.02 17.63,0 22.03-16.2 22.03-34.74l27.4-.86c0,19.38-3.82,33.62-10.32,44.87-6.28,10.88-18.52,21.75-39.11,21.75-12.8,0-24.14-2.78-36.68-14.61-9.64-9.08-20.91-25.21-29.58-39.71l-25.79-43.08c-12.94-21.62-24.81-37.74-31.68-45.04-7.39-7.85-16.89-17.33-32.05-17.33-12.27,0-22.69,8.61-31.41,21.78z"/>
          <path fill="url(#meta-grad2)" d="m82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78-12.33,18.61-19.88,46.33-19.88,72.95 0,10.98 2.41,19.41 5.56,24.51l-26.48,17.44c-6.8-11.31-10.14-26.15-10.14-43.06 0-30.75 8.44-62.8 24.49-87.55 14.24-21.95 34.79-37.3 58.36-37.3z"/>
        </svg>
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

// Status badge with colors and green dot for active
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
  
  const isActive = status?.toUpperCase() === 'ACTIVE'
  
  return (
    <Badge variant={getVariant()} className="text-xs flex items-center gap-1">
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      )}
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
  // Get publisher platforms from metadata or creative
  const publisherPlatforms = ad.metadata?.publisherPlatforms || 
                            ad.creative?.object_story_spec?.link_data?.publisher_platforms || 
                            ad.creative?.asset_feed_spec?.publisher_platforms ||
                            ad.metadata?.rawData?.creative?.object_story_spec?.link_data?.publisher_platforms ||
                            ad.metadata?.rawData?.creative?.asset_feed_spec?.publisher_platforms ||
                            []
  
  // Get provider (Meta or Google)
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
  
  // Get real creative data
  const creative = ad.creative
  const creativeFormat = getCreativeFormat(creative)
  const isVideo = isVideoCreative(creative)
  const isCarousel = isCarouselCreative(creative)
  // For grid view, prefer 1:1 ratio images
  const mainImageUrl = getBestCreativeImageUrl(creative, 1) || getCreativeImageUrl(creative)
  const allImageUrls = getAllCreativeImageUrls(creative)
  
  // Use real engagement metrics from ad data
  const adMetrics = ad.metadata?.insights || {}
  const conversions = extractConversions(adMetrics)
  
  // Debug logging for CPC issues
  if (typeof window !== 'undefined') {
    if (ad.name && ad.name.includes('Zahnarzt')) {
      console.log('=== ZAHNARZT AD DEBUG ===')
      console.log('Ad Name:', ad.name)
      console.log('Full metadata:', ad.metadata)
      console.log('Insights:', adMetrics)
      console.log('Specific values:', {
        cpc: adMetrics.cpc,
        spend: adMetrics.spend,
        clicks: adMetrics.clicks,
        impressions: adMetrics.impressions
      })
      console.log('=========================')
    }
  }
  
  const engagementMetrics = {
    likes: adMetrics.likes || 0,
    comments: adMetrics.comments || 0,
    shares: adMetrics.shares || 0,
    views: isVideo ? (adMetrics.videoViews || 0) : undefined
  }
  
  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-200 group cursor-pointer"
      onClick={onExpand}
    >
      {/* Media Preview - Use square aspect for grid view */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
        {isVideo ? (
          <div className="relative w-full h-full">
            {mainImageUrl ? (
              <img 
                src={mainImageUrl} 
                alt={ad.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://picsum.photos/400/400?random=${ad.id}`
                }}
              />
            ) : (
              <img 
                src={`https://picsum.photos/400/400?random=${ad.id}`} 
                alt={ad.name}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="rounded-full bg-white/90 p-3 shadow-lg">
                <Play className="h-6 w-6 text-gray-900" fill="currentColor" />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              {engagementMetrics.views ? `${engagementMetrics.views.toLocaleString()} views` : '0:30'}
            </div>
          </div>
        ) : isCarousel ? (
          <div className="relative w-full h-full">
            {/* For carousel, show first image with indicator */}
            <img 
              src={mainImageUrl || `https://picsum.photos/400/400?random=${ad.id}`} 
              alt={ad.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://picsum.photos/400/400?random=${ad.id}`
              }}
            />
            {/* Carousel indicator - only show for actual carousels */}
            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {allImageUrls.length} cards
            </div>
          </div>
        ) : (
          mainImageUrl ? (
            <img 
              src={mainImageUrl} 
              alt={ad.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://picsum.photos/400/300?random=${ad.id}`
              }}
            />
          ) : (
            <img 
              src={`https://picsum.photos/400/300?random=${ad.id}`} 
              alt={ad.name}
              className="w-full h-full object-cover"
            />
          )
        )}
        
        {/* Provider icon - show Meta or Google */}
        <div className="absolute top-2 left-2">
          <div className="bg-white/90 backdrop-blur rounded-full p-1 border border-gray-200 shadow-sm">
            <PlatformIcon platform={provider} size="h-4 w-4" />
          </div>
        </div>
        
        {/* Channel icons - show actual publishing platforms bottom-left */}
        {publisherPlatforms && publisherPlatforms.length > 0 && (
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center">
              {publisherPlatforms.map((p: string, idx: number) => (
                <div 
                  key={`${p}-${idx}`} 
                  className="bg-black/70 backdrop-blur rounded-full p-0.5 hover:z-10 transition-all"
                  style={{ 
                    marginLeft: idx > 0 ? '-4px' : '0',
                    zIndex: publisherPlatforms.length - idx
                  }}
                >
                  <PlatformIcon platform={p} size="h-3 w-3" />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Status and Format badges */}
        <div className="absolute top-2 right-2 flex gap-2">
          <Badge className="bg-white backdrop-blur text-xs font-medium text-gray-800 border-gray-200">
            {isVideo ? 'Video' : isCarousel ? 'Carousel' : 'Image'}
          </Badge>
          <StatusBadge status={ad.status} />
        </div>
      </div>
      
      <CardContent className="p-4">
        {/* Ad info */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-start justify-between">
              <h4 className="font-semibold text-sm line-clamp-2">{ad.name}</h4>
              <FormatIcon format={creativeFormat} />
            </div>
            {/* Targeting info */}
            <TargetingInfo adSet={adSet} />
          </div>
          
          {/* Engagement metrics */}
          <div className="flex items-center gap-3 text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1 hover:text-red-500 transition-colors">
                  <Heart className="h-3 w-3" />
                  <span className="text-xs">{engagementMetrics.likes.toLocaleString()}</span>
                </TooltipTrigger>
                <TooltipContent>Likes</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                  <MessageCircle className="h-3 w-3" />
                  <span className="text-xs">{engagementMetrics.comments.toLocaleString()}</span>
                </TooltipTrigger>
                <TooltipContent>Comments</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1 hover:text-green-500 transition-colors">
                  <Share2 className="h-3 w-3" />
                  <span className="text-xs">{engagementMetrics.shares.toLocaleString()}</span>
                </TooltipTrigger>
                <TooltipContent>Shares</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {isVideo && engagementMetrics.views && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1 hover:text-purple-500 transition-colors">
                    <Play className="h-3 w-3" />
                    <span className="text-xs">{engagementMetrics.views.toLocaleString()}</span>
                  </TooltipTrigger>
                  <TooltipContent>Video Views</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <Separator />
          
          {/* Performance metrics from ad-level data */}
          <div className="grid grid-cols-5 gap-1 text-xs">
            <div>
              <p className="text-muted-foreground text-[10px]">Impr.</p>
              <p className="font-semibold">
                {formatMetricNumber(adMetrics.impressions)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">Clicks</p>
              <p className="font-semibold">
                {formatMetricNumber(adMetrics.clicks)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">CTR</p>
              <p className="font-semibold">
                {formatCTR(adMetrics.ctr, adMetrics.clicks, adMetrics.impressions)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">CPC</p>
              <p className="font-semibold">
                {formatCPC(adMetrics.cpc, adMetrics.spend, adMetrics.clicks, ad.currency)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">Conv.</p>
              <p className="font-semibold">
                {conversions.total > 0 ? (
                  <span className="text-green-600 font-bold">{conversions.total}</span>
                ) : (
                  formatMetricNumber(0)
                )}
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
  const [adAccounts, setAdAccounts] = useState<any[]>([])
  const [selectedAdAccounts, setSelectedAdAccounts] = useState<string[]>([])
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [selectedAdSets, setSelectedAdSets] = useState<string[]>([])
  const [selectedAd, setSelectedAd] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [adAccountSearchQuery, setAdAccountSearchQuery] = useState('')
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('')
  const [adSetSearchQuery, setAdSetSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [formatFilter, setFormatFilter] = useState<string>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false)
  const [sortBy, setSortBy] = useState<string>('performance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { toast } = useToast()
  
  useEffect(() => {
    fetchCampaigns()
    fetchAdAccounts()
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

  const fetchAdAccounts = async () => {
    try {
      const response = await fetch('/api/ad-accounts')
      if (response.ok) {
        const data = await response.json()
        setAdAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Error fetching ad accounts:', error)
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
      // Find the ad account for this campaign to get the currency
      const adAccount = adAccounts.find(acc => acc.id === campaign.adAccountId)
      const currency = adAccount?.currency || campaign.budgetCurrency || 'USD'
      
      campaign.adGroups?.forEach((adSet: any) => {
        adSet.ads?.forEach((ad: any) => {
          ads.push({
            ...ad,
            campaign,
            adSet,
            campaignId: campaign.id,
            adSetId: adSet.id,
            campaignName: campaign.name,
            adSetName: adSet.name,
            provider: campaign.provider,
            channel: campaign.channel,
            currency: currency
          })
        })
      })
    })
    return ads
  }, [campaigns, adAccounts])
  
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
    
    // Filter by selected ad accounts
    if (selectedAdAccounts.length > 0) {
      // First filter campaigns by ad account
      const filteredCampaignIds = campaigns
        .filter(campaign => selectedAdAccounts.includes(campaign.adAccountId))
        .map(campaign => campaign.id)
      
      // Then filter ads by those campaigns
      filtered = filtered.filter(ad => filteredCampaignIds.includes(ad.campaignId))
    }
    
    // Filter by platform (provider)
    if (platformFilter !== 'all') {
      filtered = filtered.filter(ad => {
        // Check both ad.provider and campaign.provider for compatibility
        const provider = ad.provider || ad.campaign?.provider
        return provider?.toLowerCase() === platformFilter.toLowerCase()
      })
    }
    
    // Filter by channel  
    if (channelFilter !== 'all') {
      filtered = filtered.filter(ad => {
        // Check both ad.channel and campaign.channel for compatibility
        const channel = ad.channel || ad.campaign?.channel
        return channel?.toLowerCase() === channelFilter.toLowerCase()
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
  }, [allAds, campaigns, selectedAdAccounts, selectedCampaigns, selectedAdSets, searchQuery, statusFilter, formatFilter, platformFilter, channelFilter])
  
  // Sort filtered ads based on selected criteria
  const sortedAds = useMemo(() => {
    const sorted = [...filteredAds]
    
    sorted.sort((a, b) => {
      const aMetrics = a.metadata?.insights || {}
      const bMetrics = b.metadata?.insights || {}
      
      // Calculate derived metrics
      const aCtr = aMetrics.impressions > 0 ? (aMetrics.clicks / aMetrics.impressions) * 100 : 0
      const bCtr = bMetrics.impressions > 0 ? (bMetrics.clicks / bMetrics.impressions) * 100 : 0
      
      const aCpc = aMetrics.clicks > 0 ? (aMetrics.spend / aMetrics.clicks) : Number.MAX_VALUE
      const bCpc = bMetrics.clicks > 0 ? (bMetrics.spend / bMetrics.clicks) : Number.MAX_VALUE
      
      // Get conversions using our extraction function
      const aConversions = extractConversions(aMetrics).total
      const bConversions = extractConversions(bMetrics).total
      const aCostPerConversion = aConversions > 0 ? (aMetrics.spend || 0) / aConversions : Number.MAX_VALUE
      const bCostPerConversion = bConversions > 0 ? (bMetrics.spend || 0) / bConversions : Number.MAX_VALUE
      
      let comparison = 0
      
      switch (sortBy) {
        case 'performance':
          // Multi-factor performance sorting - prioritizing conversions:
          // 1. Conversions (higher is better) - most important
          // 2. Cost per conversion (lower is better) - efficiency
          // 3. CTR (higher is better) - engagement rate
          // 4. CPC (lower is better) - cost efficiency
          // 5. Clicks then Impressions as fallback
          
          if (aConversions !== bConversions) {
            comparison = bConversions - aConversions // Higher conversions is better
          } else if (aConversions > 0 && bConversions > 0 && aCostPerConversion !== bCostPerConversion) {
            comparison = aCostPerConversion - bCostPerConversion // Lower cost per conversion is better
          } else if (aCtr !== bCtr) {
            comparison = bCtr - aCtr // Higher CTR is better
          } else if (aCpc !== bCpc) {
            comparison = aCpc - bCpc // Lower CPC is better
          } else if (aMetrics.clicks !== bMetrics.clicks) {
            comparison = (bMetrics.clicks || 0) - (aMetrics.clicks || 0) // Higher clicks is better
          } else {
            comparison = (bMetrics.impressions || 0) - (aMetrics.impressions || 0) // Higher impressions is better
          }
          break
          
        case 'spend':
          comparison = (bMetrics.spend || 0) - (aMetrics.spend || 0)
          break
          
        case 'impressions':
          comparison = (bMetrics.impressions || 0) - (aMetrics.impressions || 0)
          break
          
        case 'clicks':
          comparison = (bMetrics.clicks || 0) - (aMetrics.clicks || 0)
          break
          
        case 'ctr':
          comparison = bCtr - aCtr
          break
          
        case 'cpc':
          comparison = aCpc - bCpc // Lower is better for CPC
          break
          
        case 'conversions':
          comparison = bConversions - aConversions
          break
          
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
          
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '')
          break
          
        case 'recent':
          // Sort by updatedAt if available, otherwise by id
          const aDate = a.updatedAt || a.createdAt || a.id
          const bDate = b.updatedAt || b.createdAt || b.id
          comparison = bDate.localeCompare(aDate)
          break
          
        default:
          comparison = 0
      }
      
      // Apply sort order (desc by default)
      return sortOrder === 'asc' ? -comparison : comparison
    })
    
    return sorted
  }, [filteredAds, sortBy, sortOrder])
  
  // Calculate metrics for filtered ads - aggregate from ad-level data
  const filteredMetrics = useMemo(() => {
    return filteredAds.reduce((acc, ad) => {
      const adMetrics = ad.metadata?.insights || {}
      const conversions = extractConversions(adMetrics)
      return {
        spend: acc.spend + (adMetrics.spend || 0),
        impressions: acc.impressions + (adMetrics.impressions || 0),
        clicks: acc.clicks + (adMetrics.clicks || 0),
        conversions: acc.conversions + conversions.total,
        ctr: 0, // Will calculate after
        cpc: 0  // Will calculate after
      }
    }, { spend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0 })
  }, [filteredAds])
  
  // Calculate aggregate CTR and CPC for filtered ads
  const aggregateMetrics = useMemo(() => {
    const ctr = filteredMetrics.impressions > 0 
      ? (filteredMetrics.clicks / filteredMetrics.impressions) * 100 
      : 0
    
    const cpc = filteredMetrics.clicks > 0 
      ? filteredMetrics.spend / filteredMetrics.clicks 
      : 0
    
    return { ctr, cpc }
  }, [filteredMetrics])
  
  const clearFilters = () => {
    setSelectedAdAccounts([])
    setSelectedCampaigns([])
    setSelectedAdSets([])
    setSearchQuery('')
    setStatusFilter('all')
    setFormatFilter('all')
    setPlatformFilter('all')
    setChannelFilter('all')
  }
  
  const hasActiveFilters = selectedAdAccounts.length > 0 ||
                          selectedCampaigns.length > 0 || 
                          selectedAdSets.length > 0 || 
                          searchQuery || 
                          statusFilter !== 'all' || 
                          formatFilter !== 'all' ||
                          platformFilter !== 'all' ||
                          channelFilter !== 'all'
  
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
            Viewing {sortedAds.length} of {allAds.length} ads across all campaigns
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Tab switcher */}
          <Tabs defaultValue="campaigns">
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
          </Tabs>
          
          {/* Sync panel */}
          <div className="flex items-center gap-2">
            <SyncStatusPanel onSync={handleSync} isSyncing={isSyncing} />
          </div>
        </div>
      </div>
      
      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Filtering Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filters</span>
              </div>
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
            
            {/* Ad Accounts Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[160px] justify-between">
                  <span className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Ad Accounts
                    {selectedAdAccounts.length > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1 min-w-[20px]">
                        {selectedAdAccounts.length}
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
                      placeholder="Search ad accounts..."
                      value={adAccountSearchQuery}
                      onChange={(e) => setAdAccountSearchQuery(e.target.value)}
                      className="flex h-9 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {adAccounts
                        .filter(account => 
                          !adAccountSearchQuery || 
                          account.name?.toLowerCase().includes(adAccountSearchQuery.toLowerCase()) ||
                          account.externalId?.toLowerCase().includes(adAccountSearchQuery.toLowerCase())
                        )
                        .map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center space-x-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
                          onClick={() => {
                            setSelectedAdAccounts(prev =>
                              prev.includes(account.id)
                                ? prev.filter(id => id !== account.id)
                                : [...prev, account.id]
                            )
                          }}
                        >
                          <Checkbox
                            checked={selectedAdAccounts.includes(account.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAdAccounts(prev => [...prev, account.id])
                              } else {
                                setSelectedAdAccounts(prev => prev.filter(id => id !== account.id))
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{account.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {account.provider} • {account.currency}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
            
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
            
            {/* Platform Filter */}
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="meta">
                  <span className="flex items-center gap-2">
                    Meta
                  </span>
                </SelectItem>
                <SelectItem value="google">
                  <span className="flex items-center gap-2">
                    Google
                  </span>
                </SelectItem>
                <SelectItem value="tiktok">
                  <span className="flex items-center gap-2">
                    TikTok
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Channel Filter */}
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
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
                <SelectItem value="messenger">
                  <span className="flex items-center gap-2">
                    <PlatformIcon platform="messenger" />
                    Messenger
                  </span>
                </SelectItem>
                <SelectItem value="threads">
                  <span className="flex items-center gap-2">
                    <PlatformIcon platform="threads" />
                    Threads
                  </span>
                </SelectItem>
                <SelectItem value="whatsapp">
                  <span className="flex items-center gap-2">
                    <PlatformIcon platform="whatsapp" />
                    WhatsApp
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
            
            {/* Advanced Filters Toggle */}
            <Button
              variant={showAdvancedFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Advanced
            </Button>
            
            {/* Advanced Filters (Status and Format) */}
            {showAdvancedFilters && (
              <>
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
              </>
            )}
            
              </div>
            </div>
            
            {/* Divider */}
            <Separator className="my-2" />
            
            {/* Sorting & View Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Sort & View</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Sorting Dropdown */}
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] h-9 bg-muted/50 border-muted">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Best Performance
                    </span>
                  </SelectItem>
                  <SelectItem value="spend">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Highest Spend
                    </span>
                  </SelectItem>
                  <SelectItem value="impressions">
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Most Impressions
                    </span>
                  </SelectItem>
                  <SelectItem value="clicks">
                    <span className="flex items-center gap-2">
                      <MousePointerClick className="h-4 w-4" />
                      Most Clicks
                    </span>
                  </SelectItem>
                  <SelectItem value="ctr">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Highest CTR
                    </span>
                  </SelectItem>
                  <SelectItem value="cpc">
                    <span className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Lowest CPC
                    </span>
                  </SelectItem>
                  <SelectItem value="conversions">
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Most Conversions
                    </span>
                  </SelectItem>
                  <SelectItem value="recent">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Most Recent
                    </span>
                  </SelectItem>
                  <SelectItem value="name">
                    <span className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Alphabetical
                    </span>
                  </SelectItem>
                  <SelectItem value="status">
                    <span className="flex items-center gap-2">
                      <CircleCheckBig className="h-4 w-4" />
                      Status
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              
                  {/* Sort Order Toggle */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 bg-muted/50 border-muted"
                          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        >
                          {sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {sortOrder === 'desc' ? 'Sort Descending' : 'Sort Ascending'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
            
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/50 border-muted">
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
                    className="text-muted-foreground ml-auto"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedAdAccounts.map(accountId => {
                const account = adAccounts.find(a => a.id === accountId)
                return account ? (
                  <Badge key={accountId} variant="secondary" className="gap-1">
                    <Building className="h-3 w-3" />
                    {account.name}
                    <button
                      onClick={() => setSelectedAdAccounts(prev => prev.filter(id => id !== accountId))}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null
              })}
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
                  Platform: {platformFilter.charAt(0).toUpperCase() + platformFilter.slice(1)}
                  <button
                    onClick={() => setPlatformFilter('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {channelFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Channel: {channelFilter.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  <button
                    onClick={() => setChannelFilter('all')}
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
              label="Impressions"
              value={formatMetricNumber(filteredMetrics.impressions)}
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
              value={formatMetricNumber(filteredMetrics.clicks)}
              change={15}
              trend="up"
              icon={MousePointerClick}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <MetricCard
              label="CTR"
              value={aggregateMetrics.ctr.toFixed(2)}
              suffix="%"
              change={5}
              trend="up"
              icon={TrendingUp}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <MetricCard
              label="Avg CPC"
              value={aggregateMetrics.cpc.toFixed(2)}
              prefix="$"
              change={-3}
              trend="down"
              icon={DollarSign}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <MetricCard
              label="Conversions"
              value={formatMetricNumber(filteredMetrics.conversions)}
              change={23}
              trend="up"
              icon={Target}
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
      ) : sortedAds.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedAds.map((ad) => (
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
      <AdDetailDialogEnhanced 
        ad={selectedAd}
        campaign={selectedAd?.campaign}
        adSet={selectedAd?.adSet}
        adAccounts={adAccounts}
        open={!!selectedAd} 
        onClose={() => setSelectedAd(null)} 
      />
    </div>
  )
}