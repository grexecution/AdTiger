"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Facebook,
  Instagram,
  Globe,
  Play,
  ImageIcon,
  Layers,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  ThumbsUp,
  MapPin,
  Users,
  Calendar,
  DollarSign,
  Target,
  Smartphone,
  Monitor,
  Eye,
  MousePointerClick,
  TrendingUp,
  Clock,
  Building,
  Megaphone,
  Hash,
  Link2,
  FileText,
  Layout,
  Film,
  PlayCircle,
  Search,
  Video,
  ShoppingBag,
  Languages,
  UserCheck,
  Zap,
  ChevronRight,
} from "lucide-react"
import {
  getCreativeImageUrl,
  getCreativeFormat,
  isVideoCreative,
  isCarouselCreative,
  getAllCreativeImageUrls,
  getCreativeImagesWithDimensions,
  getBestCreativeImageUrl,
} from "@/lib/utils/creative-utils"
import { getCurrencySymbol } from "@/lib/currency"
import { format } from "date-fns"

// Platform logos as SVG components
const MetaLogo = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.441 7.559c1.168 0 2.115.947 2.115 2.115s-.947 2.115-2.115 2.115-2.115-.947-2.115-2.115.947-2.115 2.115-2.115zm-8.882 0c1.168 0 2.115.947 2.115 2.115s-.947 2.115-2.115 2.115-2.115-.947-2.115-2.115.947-2.115 2.115-2.115zM12 19.174c-3.954 0-7.174-3.22-7.174-7.174 0-.322.022-.639.064-.949.324.119.669.183 1.028.183 1.562 0 2.831-1.269 2.831-2.831 0-.085-.004-.169-.012-.252 1.011-.638 2.205-1.009 3.488-1.009 1.283 0 2.477.371 3.488 1.009-.008.083-.012.167-.012.252 0 1.562 1.269 2.831 2.831 2.831.359 0 .704-.064 1.028-.183.042.31.064.627.064.949 0 3.954-3.22 7.174-7.174 7.174z"/>
  </svg>
)

const GoogleLogo = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" fill="#4285F4"/>
    <path d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z" fill="#34A853"/>
    <path d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z" fill="#FBBC05"/>
    <path d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" fill="#EA4335"/>
  </svg>
)

// Platform/Channel icon mapping
const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform?.toLowerCase()) {
    case 'facebook':
      return <Facebook className="h-3.5 w-3.5" />
    case 'instagram':
      return <Instagram className="h-3.5 w-3.5" />
    default:
      return <Globe className="h-3.5 w-3.5" />
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
  
  return (
    <Badge variant={getVariant()} className="text-xs">
      {status}
    </Badge>
  )
}

// Get comments from ad data or show empty state
const getAdComments = (ad: any) => {
  // Check various possible locations for comments
  const comments = 
    ad?.metadata?.comments || 
    ad?.metadata?.rawData?.comments || 
    ad?.metadata?.insights?.comments_data ||
    ad?.comments ||
    []
  
  // If we have comment data, format it properly
  if (Array.isArray(comments) && comments.length > 0) {
    return comments.map((comment: any, idx: number) => ({
      id: comment.id || idx,
      user: comment.from?.name || comment.user_name || comment.author || 'Anonymous',
      text: comment.message || comment.text || comment.content || '',
      likes: comment.like_count || comment.likes || 0,
      time: comment.created_time || comment.timestamp || '',
      replies: comment.comments?.data || comment.replies || []
    }))
  }
  
  return []
}

// Helper function to get detailed placements for a platform
const getDetailedPlacements = (platform: string, targeting: any): string[] => {
  const placements = []
  
  // Check for specific placement settings in targeting
  if (platform === 'instagram') {
    const positions = targeting?.facebook_positions || []
    if (positions.includes('instagram_feed') || positions.includes('feed')) placements.push('Feed')
    if (positions.includes('instagram_stories') || positions.includes('story')) placements.push('Stories')
    if (positions.includes('instagram_reels') || positions.includes('reels')) placements.push('Reels')
    if (positions.includes('instagram_explore') || positions.includes('explore')) placements.push('Explore')
    if (positions.includes('instagram_shop') || positions.includes('shop')) placements.push('Shop')
    if (positions.includes('instagram_profile_feed')) placements.push('Profile Feed')
    if (positions.includes('instagram_search')) placements.push('Search')
    
    // If no specific positions, check for automatic placements
    if (placements.length === 0 && (!targeting?.facebook_positions || targeting?.facebook_positions?.length === 0)) {
      placements.push('Feed', 'Stories', 'Reels', 'Explore')
    }
  } else if (platform === 'facebook') {
    const positions = targeting?.facebook_positions || []
    if (positions.includes('facebook_feed') || positions.includes('feed')) placements.push('Feed')
    if (positions.includes('facebook_stories') || positions.includes('story')) placements.push('Stories')
    if (positions.includes('facebook_reels') || positions.includes('reels')) placements.push('Reels')
    if (positions.includes('facebook_right_hand_column')) placements.push('Right Column')
    if (positions.includes('facebook_instant_article')) placements.push('Instant Articles')
    if (positions.includes('facebook_instream_video')) placements.push('In-Stream Video')
    if (positions.includes('facebook_marketplace')) placements.push('Marketplace')
    if (positions.includes('facebook_video_feed')) placements.push('Video Feed')
    if (positions.includes('facebook_search')) placements.push('Search')
    
    // If no specific positions, check for automatic placements
    if (placements.length === 0 && (!targeting?.facebook_positions || targeting?.facebook_positions?.length === 0)) {
      placements.push('Feed', 'Stories', 'Reels', 'Video Feed')
    }
  } else if (platform === 'messenger') {
    placements.push('Inbox', 'Stories', 'Sponsored Messages')
  } else if (platform === 'audience_network') {
    placements.push('Native', 'Banner', 'Interstitial', 'Rewarded Video')
  }
  
  return placements
}

// Helper function to get device details
const getDeviceDetails = (device: string, targeting: any): string | null => {
  if (device === 'mobile') {
    const os = targeting?.user_os || []
    const details = []
    if (os.includes('iOS')) details.push('iOS')
    if (os.includes('Android')) details.push('Android')
    if (targeting?.user_device) {
      const devices = Array.isArray(targeting.user_device) ? targeting.user_device : [targeting.user_device]
      if (devices.includes('iPhone')) details.push('iPhone')
      if (devices.includes('iPad')) details.push('iPad')
    }
    return details.length > 0 ? details.join(', ') : 'All mobile devices'
  } else if (device === 'desktop') {
    return 'Windows, Mac, Linux'
  }
  return null
}

// Helper function to format position strings
const formatPosition = (position: string): string => {
  return position
    .replace(/_/g, ' ')
    .replace(/facebook|instagram|messenger/gi, '')
    .trim()
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Get platform-specific icon
const getPlatformIcon = (platform: string) => {
  switch(platform.toLowerCase()) {
    case 'instagram':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
        </svg>
      )
    case 'facebook':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    case 'messenger':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.627 0-12 4.975-12 11.111 0 3.497 1.745 6.616 4.472 8.652v4.237l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259L10.733 8l3.13 3.259L19.752 8l-6.559 6.963z"/>
        </svg>
      )
    case 'audience_network':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-13h4v6h-4zm0 8h4v2h-4z"/>
        </svg>
      )
    default:
      return <Zap className="h-4 w-4" />
  }
}

// Get platform-specific colors
const getPlatformColor = (platform: string) => {
  switch(platform.toLowerCase()) {
    case 'instagram':
      return {
        bg: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10',
        badge: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200/50'
      }
    case 'facebook':
      return {
        bg: 'bg-blue-500/10',
        badge: 'bg-blue-100 text-blue-700 border border-blue-200/50'
      }
    case 'messenger':
      return {
        bg: 'bg-gradient-to-br from-blue-500/10 to-purple-500/10',
        badge: 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border border-blue-200/50'
      }
    case 'audience_network':
      return {
        bg: 'bg-orange-500/10',
        badge: 'bg-orange-100 text-orange-700 border border-orange-200/50'
      }
    default:
      return {
        bg: 'bg-gray-100',
        badge: 'bg-gray-100 text-gray-700 border border-gray-200/50'
      }
  }
}

// Get placement-specific icon
const getPlacementIcon = (placement: string) => {
  const lowerPlacement = placement.toLowerCase()
  if (lowerPlacement.includes('feed')) return <Layout className="h-3 w-3" />
  if (lowerPlacement.includes('stories') || lowerPlacement.includes('story')) return <Film className="h-3 w-3" />
  if (lowerPlacement.includes('reels')) return <PlayCircle className="h-3 w-3" />
  if (lowerPlacement.includes('explore')) return <Search className="h-3 w-3" />
  if (lowerPlacement.includes('video')) return <Video className="h-3 w-3" />
  if (lowerPlacement.includes('marketplace')) return <ShoppingBag className="h-3 w-3" />
  if (lowerPlacement.includes('message')) return <MessageCircle className="h-3 w-3" />
  return null
}

// Get OS-specific icon
const getOSIcon = (os: string) => {
  const lowerOS = os.toLowerCase()
  if (lowerOS === 'ios' || lowerOS === 'apple') {
    return (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    )
  }
  if (lowerOS === 'android') {
    return (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.6 11.48 19.44 8.3a.63.63 0 0 0-.47-.88.62.62 0 0 0-.67.15L15.9 10.1a10.45 10.45 0 0 0-7.76 0L5.71 7.57a.62.62 0 0 0-.67-.15.63.63 0 0 0-.47.88l1.84 3.18A11.07 11.07 0 0 0 .92 20h22.16a11.07 11.07 0 0 0-5.48-8.52ZM7 17.25A1.25 1.25 0 1 1 8.25 16 1.25 1.25 0 0 1 7 17.25Zm10 0A1.25 1.25 0 1 1 18.25 16 1.25 1.25 0 0 1 17 17.25Z"/>
      </svg>
    )
  }
  if (lowerOS === 'windows') {
    return (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
      </svg>
    )
  }
  return <Monitor className="h-3 w-3" />
}

// Get country flag emoji
const getCountryFlag = (country: string) => {
  const countryFlags: { [key: string]: string } = {
    'United States': '🇺🇸',
    'USA': '🇺🇸',
    'US': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'UK': '🇬🇧',
    'Germany': '🇩🇪',
    'DE': '🇩🇪',
    'France': '🇫🇷',
    'FR': '🇫🇷',
    'Spain': '🇪🇸',
    'ES': '🇪🇸',
    'Italy': '🇮🇹',
    'IT': '🇮🇹',
    'Netherlands': '🇳🇱',
    'NL': '🇳🇱',
    'Belgium': '🇧🇪',
    'BE': '🇧🇪',
    'Austria': '🇦🇹',
    'AT': '🇦🇹',
    'Switzerland': '🇨🇭',
    'CH': '🇨🇭',
    'Canada': '🇨🇦',
    'CA': '🇨🇦',
    'Australia': '🇦🇺',
    'AU': '🇦🇺',
    'Japan': '🇯🇵',
    'JP': '🇯🇵',
    'China': '🇨🇳',
    'CN': '🇨🇳',
    'India': '🇮🇳',
    'IN': '🇮🇳',
    'Brazil': '🇧🇷',
    'BR': '🇧🇷',
    'Mexico': '🇲🇽',
    'MX': '🇲🇽',
    'Poland': '🇵🇱',
    'PL': '🇵🇱',
    'Sweden': '🇸🇪',
    'SE': '🇸🇪',
    'Norway': '🇳🇴',
    'NO': '🇳🇴',
    'Denmark': '🇩🇰',
    'DK': '🇩🇰',
    'Finland': '🇫🇮',
    'FI': '🇫🇮',
    'Portugal': '🇵🇹',
    'PT': '🇵🇹',
    'Greece': '🇬🇷',
    'GR': '🇬🇷',
    'Ireland': '🇮🇪',
    'IE': '🇮🇪',
    'Czech Republic': '🇨🇿',
    'CZ': '🇨🇿',
    'Hungary': '🇭🇺',
    'HU': '🇭🇺',
    'Romania': '🇷🇴',
    'RO': '🇷🇴',
    'Bulgaria': '🇧🇬',
    'BG': '🇧🇬',
    'Croatia': '🇭🇷',
    'HR': '🇭🇷',
    'Slovakia': '🇸🇰',
    'SK': '🇸🇰',
    'Slovenia': '🇸🇮',
    'SI': '🇸🇮',
    'Luxembourg': '🇱🇺',
    'LU': '🇱🇺',
    'New Zealand': '🇳🇿',
    'NZ': '🇳🇿',
    'South Korea': '🇰🇷',
    'KR': '🇰🇷',
    'Singapore': '🇸🇬',
    'SG': '🇸🇬',
    'Thailand': '🇹🇭',
    'TH': '🇹🇭',
    'Indonesia': '🇮🇩',
    'ID': '🇮🇩',
    'Malaysia': '🇲🇾',
    'MY': '🇲🇾',
    'Philippines': '🇵🇭',
    'PH': '🇵🇭',
    'Vietnam': '🇻🇳',
    'VN': '🇻🇳',
    'Turkey': '🇹🇷',
    'TR': '🇹🇷',
    'Russia': '🇷🇺',
    'RU': '🇷🇺',
    'South Africa': '🇿🇦',
    'ZA': '🇿🇦',
    'Argentina': '🇦🇷',
    'AR': '🇦🇷',
    'Chile': '🇨🇱',
    'CL': '🇨🇱',
    'Colombia': '🇨🇴',
    'CO': '🇨🇴',
    'Peru': '🇵🇪',
    'PE': '🇵🇪',
    'Venezuela': '🇻🇪',
    'VE': '🇻🇪',
    'Egypt': '🇪🇬',
    'EG': '🇪🇬',
    'Israel': '🇮🇱',
    'IL': '🇮🇱',
    'Saudi Arabia': '🇸🇦',
    'SA': '🇸🇦',
    'UAE': '🇦🇪',
    'AE': '🇦🇪',
    'United Arab Emirates': '🇦🇪'
  }
  
  return countryFlags[country] || '🌍'
}

interface AdDetailDialogEnhancedProps {
  ad: any
  campaign?: any
  adSet?: any
  open: boolean
  onClose: () => void
  adAccounts?: any[]
}

export function AdDetailDialogEnhanced({ 
  ad, 
  campaign,
  adSet,
  open, 
  onClose,
  adAccounts = []
}: AdDetailDialogEnhancedProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>('auto')
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [showComments, setShowComments] = useState(false)
  
  // Get real comments from ad data
  const comments = getAdComments(ad)
  
  if (!ad) return null
  
  // Get campaign and adset from props or ad object
  const adCampaign = campaign || ad.campaign
  const adAdSet = adSet || ad.adSet || ad.adGroup
  
  // Get ad account info
  const adAccount = adAccounts.find(acc => acc.id === adCampaign?.adAccountId)
  const currency = adAccount?.currency || adCampaign?.budgetCurrency || 'USD'
  const currencySymbol = getCurrencySymbol(currency)
  
  // Get creative data
  const creative = ad.creative || {}
  const creativeFormat = getCreativeFormat(creative)
  const isVideo = isVideoCreative(creative)
  const isCarousel = isCarouselCreative(creative)
  const allImageUrls = getAllCreativeImageUrls(creative)
  const imagesWithDimensions = getCreativeImagesWithDimensions(creative)
  
  // Get the best image based on selected format
  const getImageForFormat = () => {
    if (selectedFormat === 'square') return getBestCreativeImageUrl(creative, 1)
    if (selectedFormat === 'vertical') return getBestCreativeImageUrl(creative, 0.5625) // 9:16
    if (selectedFormat === 'horizontal') return getBestCreativeImageUrl(creative, 1.91) // 1.91:1
    return getCreativeImageUrl(creative) // auto
  }
  
  const displayImageUrl = isCarousel ? allImageUrls[selectedImageIndex] : getImageForFormat()
  
  // Get text content - safely handle objects
  const getTitleText = () => {
    const title = creative?.asset_feed_spec?.titles?.[0]
    if (typeof title === 'string') return title
    if (title?.text) return title.text
    if (creative?.title) return typeof creative.title === 'string' ? creative.title : creative.title?.text || ''
    return ad.name
  }
  
  const getBodyText = () => {
    const body = creative?.asset_feed_spec?.bodies?.[0]
    if (typeof body === 'string') return body
    if (body?.text) return body.text
    if (creative?.body) return typeof creative.body === 'string' ? creative.body : creative.body?.text || ''
    return ''
  }
  
  const getLinkUrl = () => {
    const link = creative?.asset_feed_spec?.link_urls?.[0]
    if (typeof link === 'string') return link
    if (link?.website_url) return link.website_url
    if (link?.display_url) return link.display_url
    if (creative?.link_url) return typeof creative.link_url === 'string' ? creative.link_url : creative.link_url?.website_url || '#'
    return '#'
  }
  
  const adTitle = getTitleText()
  const adBody = getBodyText()
  const ctaText = creative?.asset_feed_spec?.call_to_action_types?.[0] || creative?.call_to_action?.type || 'LEARN_MORE'
  const linkUrl = getLinkUrl()
  
  // Get publisher platforms - safely handle arrays that might contain objects
  const getPublisherPlatforms = () => {
    const platforms = creative?.asset_feed_spec?.publisher_platforms || 
                     creative?.publisher_platforms || 
                     ['facebook', 'instagram']
    return platforms.filter((p: any) => typeof p === 'string')
  }
  const publisherPlatforms = getPublisherPlatforms()
  
  // Get metrics from ad data
  const adMetrics = ad.metadata?.insights || {}
  const engagementMetrics = {
    impressions: adMetrics.impressions || 0,
    clicks: adMetrics.clicks || 0,
    spend: adMetrics.spend || 0,
    cpc: adMetrics.cpc || 0,
    cpm: adMetrics.cpm || 0,
    ctr: adMetrics.ctr || 0,
    likes: adMetrics.likes || adMetrics.post_reactions || 0,
    comments: adMetrics.comments || 0,
    shares: adMetrics.shares || 0,
    saves: adMetrics.saves || 0,
    videoViews: adMetrics.video_views || 0,
  }
  
  // Get targeting info from adSet - check rawData path first
  const targeting = adAdSet?.metadata?.rawData?.targeting || adAdSet?.metadata?.targeting || adAdSet?.targeting || {}
  const geoLocations = targeting.geo_locations || {}
  const ageMin = targeting.age_min || 18
  const ageMax = targeting.age_max || 65
  const genders = targeting.genders || [1, 2] // 1 = male, 2 = female
  const interests = targeting.flexible_spec?.[0]?.interests || []
  const behaviors = targeting.flexible_spec?.[0]?.behaviors || []
  const customAudiences = targeting.custom_audiences || []
  const excludedCustomAudiences = targeting.excluded_custom_audiences || []
  const languages = targeting.locales || []
  const devicePlatforms = targeting.device_platforms || ['mobile', 'desktop']
  const publisherPlatformsTargeting = targeting.publisher_platforms || publisherPlatforms
  
  // Format CTA text
  const formatCTAText = (cta: string) => {
    return cta.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }
  
  // Handle CTA click
  const handleCTAClick = () => {
    if (linkUrl && linkUrl !== '#') {
      window.open(linkUrl, '_blank')
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 overflow-hidden">
        {/* Beautiful redesigned header */}
        <DialogHeader className="border-b bg-gradient-to-r from-slate-50/50 via-white to-slate-50/50">
          <div className="px-6 pt-4 pb-3 space-y-3">
            {/* Top row: Platform, Channel, and Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Platform with proper logo */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border shadow-sm">
                  {adCampaign?.provider?.toLowerCase() === 'google' ? (
                    <GoogleLogo className="h-4 w-4" />
                  ) : (
                    <MetaLogo className="h-4 w-4" />
                  )}
                  <span className="text-xs font-medium">
                    {adCampaign?.provider?.charAt(0).toUpperCase() + adCampaign?.provider?.slice(1) || 'Meta'}
                  </span>
                </div>
                
                {/* Channel */}
                <Badge variant="secondary" className="h-7">
                  <Zap className="h-3 w-3 mr-1" />
                  {adCampaign?.channel || 'Social'}
                </Badge>
                
                {/* Publisher Platforms */}
                {publisherPlatforms.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">on</span>
                    {publisherPlatforms.map((platform: string) => (
                      <div key={platform} className="flex items-center">
                        <PlatformIcon platform={platform} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Status */}
              <StatusBadge status={ad.status} />
            </div>
            
            {/* Beautiful hierarchy with better spacing */}
            <div className="space-y-2">
              {/* Campaign → Ad Set flow */}
              <div className="flex items-center text-xs">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-l-lg border-l-2 border-primary/20">
                  <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Campaign</span>
                  <span className="font-medium text-foreground truncate max-w-[250px]" title={adCampaign?.name}>
                    {adCampaign?.name || 'Untitled Campaign'}
                  </span>
                </div>
                <div className="h-7 w-px bg-border" />
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/20 rounded-r-lg">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Ad Set</span>
                  <span className="font-medium text-foreground truncate max-w-[250px]" title={adAdSet?.name}>
                    {adAdSet?.name || 'Untitled Ad Set'}
                  </span>
                </div>
              </div>
              
              {/* Ad name - the star of the show */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <div className="p-1.5 bg-primary/10 rounded">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Advertisement</p>
                  <p className="font-semibold text-sm text-foreground truncate" title={ad.name}>
                    {ad.name}
                  </p>
                </div>
                {ad.externalId && (
                  <code className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded font-mono">
                    ID: {ad.externalId.slice(-8)}
                  </code>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>
        
        {/* Tab Navigation */}
        <Tabs defaultValue="preview" className="flex-1 flex flex-col h-[calc(90vh-180px)]">
          <TabsList className="mx-6 mt-4 grid grid-cols-3">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 mt-0 overflow-hidden">
            <div className="flex h-full">
              {/* Left side - Ad Preview */}
              <div className="w-1/2 border-r bg-gray-50 overflow-hidden">
                <ScrollArea className="h-full p-6">
                  <div className="space-y-4">
              {/* Format selector */}
              {imagesWithDimensions.length > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Preview Format</span>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Best Fit)</SelectItem>
                      <SelectItem value="square">Square (1:1)</SelectItem>
                      <SelectItem value="vertical">Vertical (9:16)</SelectItem>
                      <SelectItem value="horizontal">Landscape (1.91:1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Mock Facebook/Instagram Post */}
              <Card className="overflow-hidden">
                <div className="bg-white">
                  {/* Post Header */}
                  <div className="flex items-center gap-3 p-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                    <div className="flex-1">
                      <div className="font-medium">{adAccount?.name || 'Business Page'}</div>
                      <div className="text-xs text-muted-foreground">Sponsored • Just now</div>
                    </div>
                  </div>
                  
                  {/* Post Text */}
                  {(adTitle || adBody) && (
                    <div className="px-4 pb-3 space-y-2">
                      {adTitle && <div className="font-medium">{adTitle}</div>}
                      {adBody && <div className="text-sm whitespace-pre-wrap">{adBody}</div>}
                    </div>
                  )}
                  
                  {/* Creative Image/Video */}
                  <div className="relative bg-black">
                    {isCarousel && allImageUrls.length > 0 ? (
                      <div className="relative">
                        <div className="aspect-square">
                          <img 
                            src={displayImageUrl || `https://picsum.photos/800/800?random=${ad.id}`}
                            alt={ad.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://picsum.photos/800/800?random=${ad.id}_${selectedImageIndex}`
                            }}
                          />
                        </div>
                        {/* Carousel navigation */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {allImageUrls.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedImageIndex(idx)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                idx === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : displayImageUrl ? (
                      <div className="relative">
                        <img 
                          src={displayImageUrl}
                          alt={ad.name}
                          className="w-full object-cover"
                          style={{
                            aspectRatio: selectedFormat === 'square' ? '1/1' : 
                                       selectedFormat === 'vertical' ? '9/16' :
                                       selectedFormat === 'horizontal' ? '1.91/1' : 'auto'
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://picsum.photos/800/800?random=${ad.id}`
                          }}
                        />
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="rounded-full bg-white/90 p-4 shadow-lg">
                              <Play className="h-8 w-8 text-gray-900" fill="currentColor" />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-square flex items-center justify-center bg-gray-100">
                        <ImageIcon className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* CTA Section */}
                  {ctaText && (
                    <div className="p-4">
                      <Button 
                        className="w-full" 
                        variant="default"
                        onClick={handleCTAClick}
                      >
                        {formatCTAText(ctaText)}
                      </Button>
                    </div>
                  )}
                  
                  {/* Engagement Stats */}
                  <div className="border-t px-4 py-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4 text-blue-500" />
                          {engagementMetrics.likes.toLocaleString()}
                        </span>
                        <button 
                          onClick={() => setShowComments(!showComments)}
                          className="hover:underline"
                        >
                          {comments.length > 0 
                            ? `${comments.length} comments` 
                            : `${engagementMetrics.comments.toLocaleString()} comments`}
                        </button>
                        <span>{engagementMetrics.shares.toLocaleString()} shares</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="border-t grid grid-cols-3">
                    <button className="flex items-center justify-center gap-2 py-3 hover:bg-gray-50 text-sm font-medium">
                      <ThumbsUp className="h-4 w-4" />
                      Like
                    </button>
                    <button className="flex items-center justify-center gap-2 py-3 hover:bg-gray-50 text-sm font-medium">
                      <MessageCircle className="h-4 w-4" />
                      Comment
                    </button>
                    <button className="flex items-center justify-center gap-2 py-3 hover:bg-gray-50 text-sm font-medium">
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  </div>
                  
                  {/* Comments Section */}
                  {showComments && (
                    <div className="border-t p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Comments</div>
                        {comments.length === 0 && (
                          <span className="text-xs text-muted-foreground">No comments data available</span>
                        )}
                      </div>
                      
                      {comments.length > 0 ? (
                        <ScrollArea className="h-48">
                          <div className="space-y-3">
                            {comments.map(comment => (
                              <div key={comment.id} className="flex gap-3">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                                  {comment.user.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="bg-gray-100 rounded-2xl px-3 py-2">
                                    <div className="font-medium text-sm">{comment.user}</div>
                                    <div className="text-sm">{comment.text}</div>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <button className="hover:underline">Like</button>
                                    <button className="hover:underline">Reply</button>
                                    {comment.time && (
                                      <span>{new Date(comment.time).toLocaleString()}</span>
                                    )}
                                    {comment.likes > 0 && (
                                      <span className="flex items-center gap-1">
                                        <ThumbsUp className="h-3 w-3" />
                                        {comment.likes}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Show replies if any */}
                                  {comment.replies && comment.replies.length > 0 && (
                                    <div className="ml-8 space-y-2 mt-2">
                                      {comment.replies.slice(0, 2).map((reply: any, idx: number) => (
                                        <div key={idx} className="flex gap-2">
                                          <div className="h-6 w-6 rounded-full bg-gray-300 flex-shrink-0" />
                                          <div className="bg-gray-50 rounded-xl px-2 py-1">
                                            <span className="text-xs font-medium">{reply.from?.name || 'User'}: </span>
                                            <span className="text-xs">{reply.message || reply.text}</span>
                                          </div>
                                        </div>
                                      ))}
                                      {comment.replies.length > 2 && (
                                        <button className="text-xs text-blue-500 hover:underline ml-8">
                                          View {comment.replies.length - 2} more replies
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-8 text-center">
                          <MessageCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Comments are not synced for this ad.
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            To view comments, visit the ad directly on {adCampaign?.provider === 'google' ? 'Google' : 'Facebook'}.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
              
                  {/* Removed - moved to right column */}
                  </div>
                </ScrollArea>
              </div>
              
              {/* Right side - Targeting Information */}
              <div className="w-1/2 overflow-hidden">
                <ScrollArea className="h-full p-6">
                  <div className="space-y-6">
                    {/* Targeting Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Targeting Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                    {/* Demographics - Professional Design */}
                    <div>
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-600" />
                        Audience Demographics
                      </h4>
                      
                      {/* Age & Gender Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {/* Age Range Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200/50">
                          <div className="flex items-start gap-2">
                            <div className="p-1.5 bg-white rounded-md shadow-sm">
                              <Calendar className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="text-[11px] font-medium text-muted-foreground mb-1">
                                Age Range
                              </div>
                              <div className="text-lg font-semibold text-blue-900">
                                {ageMin} - {ageMax}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                years old
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Gender Card */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200/50">
                          <div className="flex items-start gap-2">
                            <div className="p-1.5 bg-white rounded-md shadow-sm">
                              <Users className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <div className="text-[11px] font-medium text-muted-foreground mb-1">
                                Gender
                              </div>
                              <div className="text-lg font-semibold text-purple-900">
                                {genders.length === 2 ? 'All Genders' : 
                                 genders.includes(1) ? 'Male' : 
                                 genders.includes(2) ? 'Female' : 'Custom'}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {genders.length === 2 ? 'No restrictions' : 'Targeted'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Languages if specified */}
                      {languages.length > 0 && (
                        <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-3 border">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
                              <Languages className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="text-xs font-medium mb-1.5">
                                Languages
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {languages.map((lang: any, idx: number) => {
                                  const langName = typeof lang === 'string' ? lang : lang?.name
                                  return (
                                    <div
                                      key={langName || `lang-${idx}`}
                                      className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-green-100 text-green-700 border border-green-200/50"
                                    >
                                      <Globe className="h-3 w-3 mr-1" />
                                      {langName || 'Unknown'}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    {/* Locations - Professional Design */}
                    <div>
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-red-600" />
                        Geographic Targeting
                      </h4>
                      
                      <div className="space-y-3">
                        {/* Countries */}
                        {geoLocations.countries && geoLocations.countries.length > 0 && (
                          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-3 border border-red-200/50">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-white shadow-sm">
                                <Globe className="h-4 w-4 text-red-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-xs font-medium">Countries</span>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {geoLocations.countries.length} selected
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {geoLocations.countries.map((country: string) => (
                                    <div
                                      key={country}
                                      className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-red-200"
                                    >
                                      {getCountryFlag(country)}
                                      <span className="ml-1.5">{country}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Regions */}
                        {geoLocations.regions && geoLocations.regions.length > 0 && (
                          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200/50">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-white shadow-sm">
                                <MapPin className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-xs font-medium">Regions</span>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {geoLocations.regions.length} selected
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {geoLocations.regions.map((region: any, idx: number) => {
                                    const regionName = typeof region === 'string' ? region : region?.name
                                    return (
                                      <div
                                        key={regionName || `region-${idx}`}
                                        className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-blue-200"
                                      >
                                        <div className="h-2 w-2 rounded-full bg-blue-500 mr-1.5" />
                                        {regionName || 'Unknown'}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Cities */}
                        {geoLocations.cities && geoLocations.cities.length > 0 && (
                          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200/50">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-white shadow-sm">
                                <Building className="h-4 w-4 text-purple-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-xs font-medium">Cities</span>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {geoLocations.cities.length} selected
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {geoLocations.cities.map((city: any, idx: number) => {
                                    const cityName = typeof city === 'string' ? city : city?.name
                                    return (
                                      <div
                                        key={cityName || `city-${idx}`}
                                        className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-purple-200"
                                      >
                                        <div className="h-2 w-2 rounded-full bg-purple-500 mr-1.5" />
                                        {cityName || 'Unknown'}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Location Type */}
                        {geoLocations.location_types && Array.isArray(geoLocations.location_types) && geoLocations.location_types.length > 0 && (
                          <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-2.5 border">
                            <div className="flex items-center gap-2">
                              <Target className="h-3.5 w-3.5 text-gray-600" />
                              <span className="text-[11px] font-medium text-gray-600">Location Type:</span>
                              <div className="flex gap-1">
                                {geoLocations.location_types.filter((t: any) => typeof t === 'string').map((type: string) => (
                                  <Badge key={type} variant="secondary" className="text-[10px] px-2 py-0.5">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Interests & Behaviors */}
                    {(interests.length > 0 || behaviors.length > 0) && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Interests & Behaviors
                          </h4>
                          <div className="space-y-2 text-sm">
                            {interests.length > 0 && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">Interests:</span>
                                <div className="flex flex-wrap gap-1">
                                  {interests.map((interest: any, idx: number) => (
                                    <Badge key={interest?.id || `interest-${idx}`} variant="outline" className="text-xs">
                                      {typeof interest === 'string' ? interest : interest?.name || JSON.stringify(interest)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {behaviors.length > 0 && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">Behaviors:</span>
                                <div className="flex flex-wrap gap-1">
                                  {behaviors.map((behavior: any, idx: number) => (
                                    <Badge key={behavior?.id || `behavior-${idx}`} variant="outline" className="text-xs">
                                      {typeof behavior === 'string' ? behavior : behavior?.name || JSON.stringify(behavior)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Custom Audiences */}
                    {(customAudiences.length > 0 || excludedCustomAudiences.length > 0) && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />
                            Custom Audiences
                          </h4>
                          <div className="space-y-2 text-sm">
                            {customAudiences.length > 0 && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">Included:</span>
                                <div className="flex flex-wrap gap-1">
                                  {customAudiences.map((audience: any, idx: number) => (
                                    <Badge key={audience?.id || `audience-${idx}`} variant="outline" className="text-xs">
                                      {typeof audience === 'string' ? audience : audience?.name || audience?.id || JSON.stringify(audience)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {excludedCustomAudiences.length > 0 && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">Excluded:</span>
                                <div className="flex flex-wrap gap-1">
                                  {excludedCustomAudiences.map((audience: any, idx: number) => (
                                    <Badge key={audience?.id || `excluded-${idx}`} variant="destructive" className="text-xs">
                                      {typeof audience === 'string' ? audience : audience?.name || audience?.id || JSON.stringify(audience)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Placements & Devices - Professional Design */}
                    <Separator />
                    <div>
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                        Ad Placements & Distribution
                      </h4>
                      
                      {/* Platform Placements Grid */}
                      <div className="space-y-3">
                        {publisherPlatformsTargeting.map((platform: string) => {
                          const placements = getDetailedPlacements(platform, targeting)
                          const platformIcon = getPlatformIcon(platform)
                          const platformColor = getPlatformColor(platform)
                          
                          return (
                            <div key={platform} className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-3 border">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${platformColor.bg}`}>
                                  {platformIcon}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="font-medium text-sm capitalize">
                                      {platform === 'audience_network' ? 'Audience Network' : platform}
                                    </span>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                      {placements.length} placements
                                    </Badge>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {placements.map((placement: string) => (
                                      <div
                                        key={placement}
                                        className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium ${platformColor.badge}`}
                                      >
                                        {getPlacementIcon(placement)}
                                        <span className="ml-1">{placement}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Device Distribution */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {devicePlatforms.map((device: string) => {
                          const deviceDetails = getDeviceDetails(device, targeting)
                          const deviceIcon = device === 'mobile' ? 
                            <Smartphone className="h-4 w-4" /> : 
                            <Monitor className="h-4 w-4" />
                          const deviceColor = device === 'mobile' ? 
                            'from-blue-50 to-blue-100/50 border-blue-200' : 
                            'from-gray-50 to-gray-100/50 border-gray-200'
                          
                          return (
                            <div
                              key={device}
                              className={`bg-gradient-to-br ${deviceColor} rounded-lg p-3 border`}
                            >
                              <div className="flex items-start gap-2">
                                <div className="p-1.5 bg-white rounded-md shadow-sm">
                                  {deviceIcon}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-xs capitalize mb-0.5">
                                    {device}
                                  </div>
                                  {deviceDetails && (
                                    <div className="text-[10px] text-muted-foreground">
                                      {deviceDetails}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Operating Systems if specified */}
                      {targeting.user_os && targeting.user_os.length > 0 && (
                        <div className="mt-3 p-2.5 bg-muted/30 rounded-lg">
                          <div className="text-[11px] font-medium text-muted-foreground mb-1.5">
                            Operating Systems
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {targeting.user_os.map((os: string) => {
                              const osIcon = getOSIcon(os)
                              return (
                                <div
                                  key={os}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md border text-[11px] font-medium"
                                >
                                  {osIcon}
                                  <span>{os === 'ios' ? 'iOS' : os.charAt(0).toUpperCase() + os.slice(1)}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Advanced Positions if available */}
                      {targeting.facebook_positions && targeting.facebook_positions.length > 0 && (
                        <div className="mt-3 p-2.5 bg-muted/30 rounded-lg">
                          <div className="text-[11px] font-medium text-muted-foreground mb-1.5">
                            Specific Positions
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {targeting.facebook_positions.map((position: string) => (
                              <Badge key={position} variant="outline" className="text-[10px] py-0.5">
                                {formatPosition(position)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                      </CardContent>
                    </Card>
                    
                    {/* View Live Ad Button - Moved to bottom */}
                    <Button 
                      className="w-full" 
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        const adId = ad.externalId
                        if (!adId) return
                        
                        if (adCampaign?.provider?.toLowerCase() === 'google') {
                          // For Google Ads - use Google Ads Transparency Center
                          window.open(`https://adstransparency.google.com/`, '_blank')
                        } else {
                          // For Meta/Facebook Ads - use correct format
                          window.open(`https://www.facebook.com/ads/library/?id=${adId}`, '_blank')
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Live Ad in {adCampaign?.provider?.toLowerCase() === 'google' ? 'Google' : 'Meta'} Ads Library
                    </Button>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
          
          {/* Performance Tab */}
          <TabsContent value="performance" className="flex-1 mt-4 overflow-hidden">
            <ScrollArea className="h-full px-6">
              <div className="space-y-6 pb-6">
                {/* Performance Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{engagementMetrics.impressions.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground mt-1">Impressions</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-green-600">+12%</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{engagementMetrics.clicks.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground mt-1">Clicks</p>
                      <div className="flex items-center gap-1 mt-2">
                        <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-green-600">+8%</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{currencySymbol}{engagementMetrics.spend.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground mt-1">Total Spend</p>
                      <div className="flex items-center gap-1 mt-2">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-orange-600">Budget: {currencySymbol}{adAdSet?.budgetAmount || 0}/day</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{engagementMetrics.ctr.toFixed(2)}%</div>
                      <p className="text-xs text-muted-foreground mt-1">Click-Through Rate</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-green-600">Above average</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{currencySymbol}{engagementMetrics.cpc.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground mt-1">Cost Per Click</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-green-600">-5%</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{currencySymbol}{engagementMetrics.cpm.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground mt-1">Cost Per 1000 Impressions</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-green-600">Optimized</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Engagement Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Engagement Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-red-500" />
                          <span className="text-sm">Reactions</span>
                        </div>
                        <span className="font-medium">{engagementMetrics.likes.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Comments</span>
                        </div>
                        <span className="font-medium">{engagementMetrics.comments.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Share2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Shares</span>
                        </div>
                        <span className="font-medium">{engagementMetrics.shares.toLocaleString()}</span>
                      </div>
                      {engagementMetrics.saves > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-purple-500" />
                            <span className="text-sm">Saves</span>
                          </div>
                          <span className="font-medium">{engagementMetrics.saves.toLocaleString()}</span>
                        </div>
                      )}
                      {engagementMetrics.videoViews > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Play className="h-4 w-4 text-orange-500" />
                            <span className="text-sm">Video Views</span>
                          </div>
                          <span className="font-medium">{engagementMetrics.videoViews.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 mt-4 overflow-hidden">
            <ScrollArea className="h-full px-6">
              <div className="space-y-6 pb-6">
                {/* Ad Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Ad Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Ad ID:</span>
                        <p className="font-mono text-xs mt-1">{ad.id}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">External ID:</span>
                        <p className="font-mono text-xs mt-1">{ad.externalId}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <p className="text-xs mt-1">
                          {ad.createdAt ? format(new Date(ad.createdAt), 'PPP') : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Updated:</span>
                        <p className="text-xs mt-1">
                          {ad.updatedAt ? format(new Date(ad.updatedAt), 'PPP') : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Budget:</span>
                        <p className="font-medium mt-1">
                          {currencySymbol}{adAdSet?.budgetAmount || 0} / day
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Objective:</span>
                        <p className="font-medium mt-1">
                          {adCampaign?.objective || 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Creative Details */}
                    {creative && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Creative Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground min-w-[80px]">Format:</span>
                              <span className="capitalize">{creativeFormat}</span>
                            </div>
                            {creative.image_hash && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">Image Hash:</span>
                                <span className="font-mono text-xs">{creative.image_hash}</span>
                              </div>
                            )}
                            {creative.video_id && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">Video ID:</span>
                                <span className="font-mono text-xs">{creative.video_id}</span>
                              </div>
                            )}
                            {linkUrl && linkUrl !== '#' && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">Link URL:</span>
                                <a 
                                  href={linkUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline truncate max-w-xs"
                                >
                                  {typeof linkUrl === 'string' ? linkUrl : 'View Link'}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}