"use client"

import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
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
  ChevronDown,
  ChevronLeft,
  BarChart3,
  Info,
  MessageSquare,
  Square,
  X,
  Bookmark,
  MoreHorizontal,
  Camera,
  Music,
  Send,
  PauseCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"

// Helper to check if URL needs authentication
const isAuthRequiredUrl = (url: string): boolean => {
  if (!url) return false
  // Facebook Ads API URLs require authentication
  if (url.includes('facebook.com/ads/image')) return true
  // Graph API URLs without /picture endpoint need auth
  if (url.includes('graph.facebook.com') && !url.includes('/picture')) return true
  return false
}

// Helper to improve Facebook CDN image quality
const improveImageQuality = (url: string): string => {
  if (!url || !url.includes('fbcdn.net')) return url
  
  // Remove size restrictions from Facebook CDN URLs
  let improvedUrl = url
  
  // Remove stp parameter that limits size (e.g., stp=dst-jpg_s160x160_tt6)
  improvedUrl = improvedUrl.replace(/[?&]stp=dst-jpg_s\d+x\d+[^&]*/g, '')
  
  // Remove any s160x160 or similar size specifications in the URL
  improvedUrl = improvedUrl.replace(/_s\d+x\d+/, '')
  
  // Clean up any double ampersands or question marks
  improvedUrl = improvedUrl.replace(/\?&/, '?').replace(/&&/, '&')
  
  return improvedUrl
}

// Creative helper functions
const getCreativeImageUrl = (creative: any): string => {
  if (!creative) return ''
  
  // For video creatives, prioritize video thumbnails
  if (creative.video_id || creative.asset_feed_spec?.videos?.length > 0 || creative.object_story_spec?.video_data) {
    // Check for video thumbnail in various locations (skip auth-required URLs)
    if (creative.thumbnail_url && !isAuthRequiredUrl(creative.thumbnail_url)) {
      return improveImageQuality(creative.thumbnail_url)
    }
    if (creative.asset_feed_spec?.videos?.[0]?.thumbnail_url && !isAuthRequiredUrl(creative.asset_feed_spec.videos[0].thumbnail_url)) {
      return improveImageQuality(creative.asset_feed_spec.videos[0].thumbnail_url)
    }
    if (creative.object_story_spec?.video_data?.thumbnail_url && !isAuthRequiredUrl(creative.object_story_spec.video_data.thumbnail_url)) {
      return improveImageQuality(creative.object_story_spec.video_data.thumbnail_url)
    }
    
    // Check if video_data has an image_hash we can use (request large size for better quality)
    if (creative.object_story_spec?.video_data?.image_hash) {
      return `https://graph.facebook.com/v18.0/${creative.object_story_spec.video_data.image_hash}/picture?width=1200&height=1200`
    }
    
    // Skip video_data.image_url as it's often an Ads API URL
    // Instead, look for fallback images
    if (creative.image_url && !isAuthRequiredUrl(creative.image_url)) {
      return improveImageQuality(creative.image_url)
    }
    if (creative.asset_feed_spec?.images?.[0]?.url && !isAuthRequiredUrl(creative.asset_feed_spec.images[0].url)) {
      return improveImageQuality(creative.asset_feed_spec.images[0].url)
    }
    
    // Try to use hash with Graph API /picture endpoint (request large size for better quality)
    if (creative.asset_feed_spec?.images?.[0]?.hash) {
      return `https://graph.facebook.com/v18.0/${creative.asset_feed_spec.images[0].hash}/picture?width=1200&height=1200`
    }
  }
  
  // Check regular image locations (skip auth-required URLs)
  if (creative.image_url && !isAuthRequiredUrl(creative.image_url)) {
    return improveImageQuality(creative.image_url)
  }
  if (creative.thumbnail_url && !isAuthRequiredUrl(creative.thumbnail_url)) {
    return improveImageQuality(creative.thumbnail_url)
  }
  if (creative.asset_feed_spec?.images?.[0]?.url && !isAuthRequiredUrl(creative.asset_feed_spec.images[0].url)) {
    return improveImageQuality(creative.asset_feed_spec.images[0].url)
  }
  if (creative.asset_feed_spec?.images?.[0]?.hash) {
    return `https://graph.facebook.com/v18.0/${creative.asset_feed_spec.images[0].hash}/picture?width=1200&height=1200`
  }
  if (creative.object_story_spec?.link_data?.picture && !isAuthRequiredUrl(creative.object_story_spec.link_data.picture)) {
    return improveImageQuality(creative.object_story_spec.link_data.picture)
  }
  
  return ''
}

const getCreativeFormat = (creative: any): string => {
  if (!creative) return 'single_image'
  
  // Check for video first
  if (creative.asset_feed_spec?.videos?.length > 0) return 'video'
  if (creative.object_story_spec?.video_data) return 'video'
  if (creative.video_id) return 'video'
  
  // Check for carousel - carousel ads have specific indicators
  // 1. Check if it's explicitly marked as carousel
  if (creative.format === 'carousel') return 'carousel'
  if (creative.object_story_spec?.link_data?.child_attachments?.length > 0) return 'carousel'
  
  // 2. IMPORTANT: For asset_feed_spec, carousel MUST have multiple titles/bodies
  // If there's only 1 title and 1 body but multiple images, it's placement variations NOT carousel
  const hasMultipleImages = (creative.asset_feed_spec?.images?.length || 0) > 1
  const hasMultipleTitles = (creative.asset_feed_spec?.titles?.length || 0) > 1
  const hasMultipleBodies = (creative.asset_feed_spec?.bodies?.length || 0) > 1
  const hasMultipleLinks = (creative.asset_feed_spec?.link_urls?.length || 0) > 1
  
  // True carousel has multiple content cards
  if (hasMultipleImages && (hasMultipleTitles || hasMultipleBodies || hasMultipleLinks)) {
    // Double check it's not just duplicate content
    if (hasMultipleTitles) {
      const titles = creative.asset_feed_spec.titles
      const allSame = titles.every((t: any) => t === titles[0])
      if (!allSame) return 'carousel'
    }
    if (hasMultipleBodies) {
      const bodies = creative.asset_feed_spec.bodies
      const allSame = bodies.every((b: any) => b === bodies[0])
      if (!allSame) return 'carousel'
    }
    if (hasMultipleLinks) {
      const links = creative.asset_feed_spec.link_urls
      const allSame = links.every((l: any) => l === links[0])
      if (!allSame) return 'carousel'
    }
  }
  
  // Multiple images with single title/body = placement variations, not carousel
  return 'single_image'
}

const isVideoCreative = (creative: any): boolean => {
  return getCreativeFormat(creative) === 'video'
}

const isCarouselCreative = (creative: any): boolean => {
  return getCreativeFormat(creative) === 'carousel'
}

const getVideoIdForExternalView = (creative: any): string | null => {
  if (!creative) return null
  
  const videoId = creative.video_id || 
                  creative.asset_feed_spec?.videos?.[0]?.video_id || 
                  creative.object_story_spec?.video_data?.video_id
  
  return videoId
}

// Get carousel images (multiple cards to swipe through)
const getCarouselImages = (creative: any): any[] => {
  if (!creative) return []
  
  // Check for carousel child attachments
  if (creative.object_story_spec?.link_data?.child_attachments?.length > 0) {
    return creative.object_story_spec.link_data.child_attachments.map((attachment: any) => ({
      url: attachment.picture || attachment.image_url,
      title: attachment.name,
      description: attachment.description,
      link: attachment.link
    }))
  }
  
  // Check for asset_feed_spec carousel structure
  // Must have multiple unique titles/bodies/links, not just multiple images
  const images = creative.asset_feed_spec?.images || []
  const titles = creative.asset_feed_spec?.titles || []
  const bodies = creative.asset_feed_spec?.bodies || []
  const links = creative.asset_feed_spec?.link_urls || []
  
  // Check if we have actual carousel content (not just placement variations)
  const hasUniqueContent = 
    (titles.length > 1 && !titles.every((t: any) => t === titles[0])) ||
    (bodies.length > 1 && !bodies.every((b: any) => b === bodies[0])) ||
    (links.length > 1 && !links.every((l: any) => l === links[0]))
  
  if (images.length > 1 && hasUniqueContent) {
    return images.map((img: any, index: number) => ({
      url: img.url || `https://graph.facebook.com/v18.0/${img.hash}/picture`,
      title: titles[index] || titles[0],
      description: bodies[index] || bodies[0],
      link: links[index] || links[0]
    }))
  }
  
  return []
}

// Get all placement variation images (different images for feed, stories, etc)
const getPlacementImages = (creative: any): string[] => {
  if (!creative) return []
  
  const images = creative.asset_feed_spec?.images || []
  // If it's a carousel, don't return placement images
  if (isCarouselCreative(creative)) return []
  
  return images.map((img: any) => img.url || `https://graph.facebook.com/v18.0/${img.hash}/picture`)
}

// Helper to get image URL from carousel array or string
const getImageUrl = (imageItem: any): string => {
  if (typeof imageItem === 'string') return imageItem
  return imageItem?.url || `https://graph.facebook.com/v18.0/${imageItem?.hash}/picture` || ''
}

// Get the main thumbnail for the ad (for preview)
const getAdThumbnail = (creative: any): string => {
  // For video, get thumbnail
  if (isVideoCreative(creative)) {
    if (creative.thumbnail_url) return creative.thumbnail_url
    if (creative.asset_feed_spec?.videos?.[0]?.thumbnail_url) {
      return creative.asset_feed_spec.videos[0].thumbnail_url
    }
  }
  
  // For carousel, get first card image
  if (isCarouselCreative(creative)) {
    const carouselImages = getCarouselImages(creative)
    if (carouselImages.length > 0) {
      return getImageUrl(carouselImages[0].url)
    }
  }
  
  // For single image or placement variations, get the main image
  return getCreativeImageUrl(creative)
}

const getBestCreativeImageUrl = (creative: any, targetRatio: number): string => {
  const images = creative.asset_feed_spec?.images || []
  if (images.length === 0) return getCreativeImageUrl(creative)
  
  // If only one image, return it
  if (images.length === 1) {
    return images[0].url || `https://graph.facebook.com/v18.0/${images[0].hash}/picture`
  }
  
  // For 3 images, assume they are [square, vertical, horizontal] in order
  if (images.length === 3) {
    if (targetRatio === 1) return images[0].url || `https://graph.facebook.com/v18.0/${images[0].hash}/picture` // Square
    if (targetRatio === 0.5625) return images[1].url || `https://graph.facebook.com/v18.0/${images[1].hash}/picture` // Vertical 9:16
    if (targetRatio === 1.78) return images[2].url || `https://graph.facebook.com/v18.0/${images[2].hash}/picture` // Horizontal 16:9
  }
  
  // Find image with closest aspect ratio if we have dimensions
  let bestImage = images[0]
  let bestDiff = Infinity
  let foundMatch = false
  
  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    if (img.width && img.height) {
      const ratio = img.width / img.height
      const diff = Math.abs(ratio - targetRatio)
      if (diff < bestDiff) {
        bestDiff = diff
        bestImage = img
        foundMatch = true
      }
    }
  }
  
  // If we found a match with dimensions, return it
  if (foundMatch) {
    return bestImage.url || `https://graph.facebook.com/v18.0/${bestImage.hash}/picture`
  }
  
  // Try different images based on index to ensure variety
  if (images.length >= 2) {
    // Map target ratio to likely index position
    if (targetRatio < 0.7) return images[1] ? (images[1].url || `https://graph.facebook.com/v18.0/${images[1].hash}/picture`) : images[0].url // Vertical
    if (targetRatio > 1.5) return images[images.length - 1].url || `https://graph.facebook.com/v18.0/${images[images.length - 1].hash}/picture` // Horizontal
    return images[0].url || `https://graph.facebook.com/v18.0/${images[0].hash}/picture` // Square
  }
  
  // Default to first image
  return images[0].url || `https://graph.facebook.com/v18.0/${images[0].hash}/picture`
}

const getCreativeImagesWithDimensions = (creative: any): any[] => {
  const images = creative.asset_feed_spec?.images || []
  return images.map((img: any) => ({
    url: img.url || `https://graph.facebook.com/v18.0/${img.hash}/picture`,
    width: img.width || 0,
    height: img.height || 0
  }))
}

// Platform Icons as SVG components
const MetaLogo = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12c1.422 0 2.79-.245 4.057-.688l.108-.037c4.711-1.611 8.098-6.075 8.098-11.275 0-6.627-5.373-12-12-12zm7.862 11.014c-.411.006-.818-.019-1.21-.074a6.82 6.82 0 0 0-.319-.055c-.196-.035-.39-.075-.583-.119-.157-.036-.313-.074-.468-.115-.168-.044-.335-.091-.5-.141-.183-.055-.363-.114-.543-.175a15.357 15.357 0 0 0-.481-.167c-2.353-.845-4.399-2.269-5.746-4.007a14.638 14.638 0 0 1-.305-.41 8.55 8.55 0 0 1-.278-.402c-.086-.131-.169-.263-.249-.396a8.14 8.14 0 0 1-.216-.389c-.073-.142-.143-.285-.209-.429a7.563 7.563 0 0 1-.348-.901 6.74 6.74 0 0 1-.231-.882 6.148 6.148 0 0 1-.076-.883c.003-.263.024-.524.064-.783.044-.282.11-.56.197-.832.078-.244.173-.482.283-.713.118-.247.253-.485.404-.712.138-.208.29-.406.454-.593.18-.204.375-.394.582-.57.188-.16.387-.307.595-.441a5.208 5.208 0 0 1 1.376-.615c.242-.072.489-.126.739-.162.272-.039.547-.057.823-.055.276.003.551.027.824.072.249.041.495.099.737.173a5.205 5.205 0 0 1 1.348.598c.199.126.39.265.571.416.199.166.386.346.559.538.158.176.304.362.438.557.146.213.276.436.391.668.104.211.194.428.27.651.081.238.146.481.194.728.043.221.072.444.085.669.015.245.011.491-.011.735a6.147 6.147 0 0 1-.148.843c-.074.315-.175.624-.301.923a7.567 7.567 0 0 1-.427.919c-.072.131-.148.26-.227.388a8.145 8.145 0 0 1-.254.389c-.088.125-.179.248-.273.37-.097.126-.197.249-.301.37-.844 1.006-1.935 1.823-3.188 2.365-.173.075-.348.145-.525.211-.162.061-.326.119-.491.173-.15.049-.301.096-.454.14-.167.048-.336.093-.505.134-.153.038-.307.073-.462.106a9.03 9.03 0 0 1-.509.094c-.398.065-.804.106-1.215.112z"/>
  </svg>
)

const GoogleLogo = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

// Platform-specific icon component
const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return <Instagram className="h-4 w-4 text-pink-600" />
    case 'facebook':
      return <Facebook className="h-4 w-4 text-blue-600" />
    case 'messenger':
      return <MessageCircle className="h-4 w-4 text-blue-500" />
    case 'audience_network':
      return <Globe className="h-4 w-4 text-orange-500" />
    default:
      return <Globe className="h-4 w-4 text-gray-500" />
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
    return comments.map((comment: any, idx: number) => {
      // Format replies properly
      const rawReplies = comment.comments?.data || comment.replies || []
      const formattedReplies = Array.isArray(rawReplies) ? rawReplies.map((reply: any, replyIdx: number) => ({
        id: reply.id || `reply-${idx}-${replyIdx}`,
        from: reply.from || {},
        user_name: reply.from?.name || reply.user_name || 'Reply',
        message: reply.message || reply.text || '',
        like_count: reply.like_count || 0,
        created_time: reply.created_time || null
      })) : []
      
      return {
        id: comment.id || idx,
        user: comment.from?.name || comment.user_name || comment.author || 'Anonymous',
        text: comment.message || comment.text || comment.content || '',
        likes: comment.like_count || comment.likes || 0,
        time: comment.created_time || comment.timestamp || '',
        replies: formattedReplies
      }
    })
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
  const [selectedPlacement, setSelectedPlacement] = useState<string>('') // Will be set based on available placements
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [showSafeZones, setShowSafeZones] = useState(true) // Show safe zones by default
  const [carouselIndex, setCarouselIndex] = useState(0) // For carousel navigation
  
  if (!ad) return null
  
  // Get real comments from ad data
  const comments = getAdComments(ad)
  
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
  const carouselItems = getCarouselImages(creative) // For actual carousel ads
  const placementImages = getPlacementImages(creative) // For placement variations
  const imagesWithDimensions = getCreativeImagesWithDimensions(creative)
  
  // Get publisher platforms - safely handle arrays that might contain objects
  const getPublisherPlatforms = () => {
    const platforms = creative?.asset_feed_spec?.publisher_platforms || 
                     creative?.publisher_platforms || 
                     ['facebook', 'instagram']
    return platforms.filter((p: any) => typeof p === 'string')
  }
  const publisherPlatforms = getPublisherPlatforms()
  
  // Get targeting info from adSet to find actual placements
  const targeting = adAdSet?.metadata?.rawData?.targeting || adAdSet?.metadata?.targeting || adAdSet?.targeting || {}
  const facebookPositions = targeting.facebook_positions || []
  
  // Get available placements from actual ad targeting
  const getAvailablePlacements = () => {
    const allPlacements = []
    const placementSet = new Set()
    
    // Get detailed placements for each platform
    publisherPlatforms.forEach((platform: string) => {
      const platformPlacements = getDetailedPlacements(platform, targeting)
      platformPlacements.forEach((placement: string) => {
        const normalizedPlacement = placement.toLowerCase().replace(/\s+/g, '_')
        if (!placementSet.has(normalizedPlacement)) {
          allPlacements.push({ 
            value: normalizedPlacement, 
            label: placement,
            platform: platform 
          })
          placementSet.add(normalizedPlacement)
        }
      })
    })
    
    // If no placements found, add default ones
    if (allPlacements.length === 0) {
      const hasInstagram = publisherPlatforms.includes('instagram')
      const hasFacebook = publisherPlatforms.includes('facebook')
      
      if (hasFacebook || hasInstagram) {
        allPlacements.push(
          { value: 'feed', label: 'Feed', platform: 'all' },
          { value: 'stories', label: 'Stories', platform: 'all' },
          { value: 'reels', label: 'Reels', platform: 'all' }
        )
      }
    }
    
    return allPlacements
  }
  
  const availablePlacements = getAvailablePlacements()
  
  // Use the selected placement or default to first available
  const currentPlacement = selectedPlacement || (availablePlacements[0]?.value || 'feed')
  
  // Get the best image/video based on selected placement
  const getMediaForPlacement = () => {
    // Check if we have specific assets for different placements
    const assetFeedSpec = creative?.asset_feed_spec
    const images = assetFeedSpec?.images || []
    const videos = assetFeedSpec?.videos || []
    
    
    // For Stories/Reels - Need 9:16 vertical format
    if (currentPlacement === 'stories' || currentPlacement === 'reels' || currentPlacement.includes('stories') || currentPlacement.includes('reels')) {
      // Check for videos first (Stories/Reels often use video)
      if (videos.length > 0) {
        const video = videos[0]
        if (video.thumbnail_url) return video.thumbnail_url
        // Don't use Graph API for thumbnails as it requires auth
      }
      
      // Look for 9:16 vertical images
      for (const img of images) {
        if (img.width && img.height) {
          const ratio = img.width / img.height
          // 9:16 = 0.5625, allow some tolerance
          if (ratio >= 0.5 && ratio <= 0.65) {
            return img.url || `https://graph.facebook.com/v18.0/${img.hash}/picture`
          }
        }
      }
      
      // If we have 3 images, assume [square, vertical, horizontal] pattern
      if (images.length === 3) {
        // Return the vertical one (index 1)
        return images[1].url || `https://graph.facebook.com/v18.0/${images[1].hash}/picture`
      }
      
      // Last resort - try to find any portrait image
      for (const img of images) {
        if (img.width && img.height && img.width < img.height) {
          return img.url || `https://graph.facebook.com/v18.0/${img.hash}/picture`
        }
      }
    }
    
    // For Feed/Video Feed - Prefer 1:1 square or 4:5 portrait
    if (currentPlacement === 'feed' || currentPlacement === 'video_feed' || currentPlacement.includes('feed')) {
      // First try to find 1:1 square image
      for (const img of images) {
        if (img.width && img.height) {
          const ratio = img.width / img.height
          // 1:1 square, allow tolerance
          if (ratio >= 0.9 && ratio <= 1.1) {
            return img.url || `https://graph.facebook.com/v18.0/${img.hash}/picture`
          }
        }
      }
      
      // Then try 4:5 portrait (common for mobile feed)
      for (const img of images) {
        if (img.width && img.height) {
          const ratio = img.width / img.height
          // 4:5 = 0.8
          if (ratio >= 0.75 && ratio <= 0.85) {
            return img.url || `https://graph.facebook.com/v18.0/${img.hash}/picture`
          }
        }
      }
      
      // If we have 3 images, assume [square, vertical, horizontal] pattern
      if (images.length === 3) {
        // Return the square one (index 0)
        return images[0].url || `https://graph.facebook.com/v18.0/${images[0].hash}/picture`
      }
    }
    
    // For Explore - Use square 1:1
    if (currentPlacement === 'explore' || currentPlacement.includes('explore')) {
      // Find 1:1 square image
      for (const img of images) {
        if (img.width && img.height) {
          const ratio = img.width / img.height
          if (ratio >= 0.9 && ratio <= 1.1) {
            return img.url || `https://graph.facebook.com/v18.0/${img.hash}/picture`
          }
        }
      }
      
      // Default to first image for explore
      if (images.length > 0) {
        return images[0].url || `https://graph.facebook.com/v18.0/${images[0].hash}/picture`
      }
    }
    
    // Fallback - return first available image
    if (images.length > 0) {
      return images[0].url || `https://graph.facebook.com/v18.0/${images[0].hash}/picture`
    }
    
    // Last resort - try the old method
    return getBestCreativeImageUrl(creative, currentPlacement === 'stories' || currentPlacement === 'reels' ? 0.5625 : 1)
  }
  
  const displayImageUrl = getMediaForPlacement()
  
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
  
  // Helper function to extract conversions from rawActions
  const extractConversionsDetailed = (adMetrics: any) => {
    const conversionData: {
      total: number
      types: { [key: string]: number }
      cost_per_conversion: number
      formatted_types: Array<{ type: string, count: number, formatted_name: string }>
    } = {
      total: 0,
      types: {},
      cost_per_conversion: 0,
      formatted_types: []
    }
    
    // Check for rawActions array
    if (adMetrics?.rawActions && Array.isArray(adMetrics.rawActions)) {
      // First, identify all conversion actions and group them
      const conversionGroups: { [key: string]: { value: number, types: string[] } } = {}
      
      adMetrics.rawActions.forEach((action: any) => {
        const actionType = action.action_type || ''
        const value = parseInt(action.value || '0')
        
        // Determine base type for grouping
        let baseType = ''
        if (actionType === 'lead' || actionType.includes('lead')) {
          baseType = 'lead'
        } else if (actionType === 'purchase' || actionType.includes('purchase')) {
          baseType = 'purchase'
        } else if (actionType.includes('complete_registration')) {
          baseType = 'complete_registration'
        } else if (actionType === 'submit_application') {
          baseType = 'submit_application'
        } else if (actionType === 'schedule') {
          baseType = 'schedule'
        } else if (actionType === 'contact') {
          baseType = 'contact'
        } else if (actionType === 'subscribe') {
          baseType = 'subscribe'
        } else if (actionType === 'donate') {
          baseType = 'donate'
        }
        
        // Only process if it's a conversion type
        if (baseType) {
          if (!conversionGroups[baseType]) {
            conversionGroups[baseType] = { value: 0, types: [] }
          }
          // Use the maximum value for this base type (they should all be the same)
          conversionGroups[baseType].value = Math.max(conversionGroups[baseType].value, value)
          conversionGroups[baseType].types.push(actionType)
        }
      })
      
      // Now add each unique conversion type once
      Object.entries(conversionGroups).forEach(([baseType, data]) => {
        conversionData.total += data.value
        
        // Define display names
        const displayNames: { [key: string]: string } = {
          'lead': 'Leads',
          'purchase': 'Purchases',
          'complete_registration': 'Registrations',
          'submit_application': 'Applications',
          'schedule': 'Appointments',
          'contact': 'Contacts',
          'subscribe': 'Subscriptions',
          'donate': 'Donations'
        }
        
        // Add the main conversion type
        conversionData.formatted_types.push({
          type: baseType,
          count: data.value,
          formatted_name: displayNames[baseType] || baseType.replace(/_/g, ' ')
        })
        
        // Store all action types for this conversion
        data.types.forEach(actionType => {
          conversionData.types[actionType] = data.value
        })
      })
    }
    
    // Calculate cost per conversion
    if (conversionData.total > 0 && adMetrics?.spend) {
      conversionData.cost_per_conversion = adMetrics.spend / conversionData.total
    }
    
    // Sort by count descending
    conversionData.formatted_types.sort((a, b) => b.count - a.count)
    
    return conversionData
  }
  
  // Get metrics from ad data
  const adMetrics = ad.metadata?.insights || {}
  const conversionsData = extractConversionsDetailed(adMetrics)
  const engagementMetrics = {
    impressions: adMetrics.impressions || 0,
    clicks: adMetrics.clicks || 0,
    spend: adMetrics.spend || 0,
    originalSpend: adMetrics.originalSpend || 0,
    originalCurrency: adMetrics.originalCurrency || currency,
    cpc: adMetrics.cpc || 0,
    cpm: adMetrics.cpm || 0,
    ctr: adMetrics.ctr || 0,
    likes: adMetrics.likes || adMetrics.post_reactions || 0,
    comments: adMetrics.comments || 0,
    shares: adMetrics.shares || 0,
    saves: adMetrics.saves || 0,
    videoViews: adMetrics.video_views || adMetrics.videoViews || 0,
    // New inline metrics
    inlineLinkClicks: adMetrics.inlineLinkClicks || 0,
    inlinePostEngagement: adMetrics.inlinePostEngagement || 0,
    // Video metrics
    video30SecWatched: adMetrics.video_30_sec_watched_actions || 0,
    videoP25Watched: adMetrics.video_p25_watched_actions || 0,
    videoP50Watched: adMetrics.video_p50_watched_actions || 0,
    videoP75Watched: adMetrics.video_p75_watched_actions || 0,
    videoP95Watched: adMetrics.video_p95_watched_actions || 0,
    videoP100Watched: adMetrics.video_p100_watched_actions || 0,
    videoAvgTimeWatched: adMetrics.video_avg_time_watched_actions || 0,
    costPerThruplay: adMetrics.cost_per_thruplay || 0,
    videoPlayActions: adMetrics.video_play_actions || 0,
    video3SecWatched: adMetrics.video_continuous_2_sec_watched_actions || adMetrics.video_3_sec_watched_actions || 0,
    videoThruplays: adMetrics.video_thruplay_watched_actions || 0,
    videoContinuous2SecWatched: adMetrics.video_continuous_2_sec_watched_actions || 0,
    // Quality rankings
    qualityRanking: adMetrics.quality_ranking || null,
    engagementRateRanking: adMetrics.engagement_rate_ranking || null,
    conversionRateRanking: adMetrics.conversion_rate_ranking || null,
    // Advanced metrics
    outboundClicks: adMetrics.outbound_clicks || adMetrics.outboundClicks || 0,
    landingPageViews: adMetrics.landing_page_views || adMetrics.landingPageViews || 0,
  }
  
  // Targeting already defined above, no need to redefine
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
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Compact Beautiful Header */}
        <DialogHeader className="px-4 pt-4 pb-2 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {adCampaign?.provider?.toLowerCase() === 'google' ? (
                <GoogleLogo className="h-5 w-5" />
              ) : (
                <MetaLogo className="h-5 w-5" />
              )}
              <div className="flex items-center gap-2">
                {publisherPlatforms.map((platform: string) => (
                  <Badge key={platform} variant="secondary" className="text-[10px] py-0.5">
                    {platform}
                  </Badge>
                ))}
              </div>
            </div>
            <StatusBadge status={ad.status} />
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-muted-foreground">Campaign:</span>
            <span className="font-medium truncate max-w-[150px]">{adCampaign?.name}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Ad Set:</span>
            <span className="font-medium truncate max-w-[150px]">{adAdSet?.name}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Ad:</span>
            <span className="font-medium truncate max-w-[150px]">{ad.name}</span>
          </div>
        </DialogHeader>
        
        {/* Main Content with Side-by-side Layout */}
        <div className="flex h-[calc(90vh-100px)]">
          {/* Left Side - Full Height Ad Preview with Comments */}
          <div className="w-[45%] border-r bg-gradient-to-b from-gray-50/50 to-white overflow-y-auto">
            <Card className="rounded-none border-0">
              <div className="bg-white flex flex-col">
                {/* Placement Selector */}
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">Ad Preview</div>
                      {/* Safe Zone Toggle for Stories/Reels */}
                      {(currentPlacement.includes('stories') || currentPlacement.includes('reels')) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => setShowSafeZones(!showSafeZones)}
                        >
                          {showSafeZones ? (
                            <><Eye className="w-3 h-3 mr-1" /> Hide Zones</>
                          ) : (
                            <><Eye className="w-3 h-3 mr-1" /> Show Zones</>
                          )}
                        </Button>
                      )}
                    </div>
                    {/* Placement Switcher - Show available placements */}
                    {availablePlacements.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Select value={currentPlacement} onValueChange={setSelectedPlacement}>
                          <SelectTrigger className="w-32 h-7 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              {(() => {
                                const selectedPlacement = availablePlacements.find(p => p.value === currentPlacement)
                                const label = selectedPlacement?.label || currentPlacement
                                
                                // Determine icon based on placement name
                                let icon = <Layout className="w-3 h-3" />
                                if (currentPlacement.includes('stories') || currentPlacement.includes('story')) {
                                  icon = <Smartphone className="w-3 h-3" />
                                } else if (currentPlacement.includes('reels')) {
                                  icon = <PlayCircle className="w-3 h-3" />
                                } else if (currentPlacement.includes('explore')) {
                                  icon = <Search className="w-3 h-3" />
                                } else if (currentPlacement.includes('video')) {
                                  icon = <Video className="w-3 h-3" />
                                } else if (currentPlacement.includes('feed')) {
                                  icon = <Layout className="w-3 h-3" />
                                }
                                
                                return (
                                  <>
                                    {icon}
                                    <span className="truncate">{label}</span>
                                  </>
                                )
                              })()}
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {availablePlacements.map(placement => (
                              <SelectItem key={placement.value} value={placement.value}>
                                <div className="flex items-center gap-1.5">
                                  {(() => {
                                    // Determine icon based on placement name
                                    if (placement.value.includes('stories') || placement.value.includes('story')) {
                                      return <Smartphone className="w-3 h-3" />
                                    } else if (placement.value.includes('reels')) {
                                      return <PlayCircle className="w-3 h-3" />
                                    } else if (placement.value.includes('explore')) {
                                      return <Search className="w-3 h-3" />
                                    } else if (placement.value.includes('video')) {
                                      return <Video className="w-3 h-3" />
                                    } else if (placement.value.includes('feed')) {
                                      return <Layout className="w-3 h-3" />
                                    } else {
                                      return <Layout className="w-3 h-3" />
                                    }
                                  })()}
                                  <span>{placement.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Placement-based Mockup Container */}
                <div className={cn(
                  "flex items-center justify-center p-4 pb-16 mb-8",
                  currentPlacement === 'stories' || currentPlacement === 'reels' || currentPlacement.includes('stories') || currentPlacement.includes('reels')
                    ? "bg-gradient-to-br from-purple-50 to-pink-50" 
                    : "bg-gray-100"
                )}>
                  {/* Stories/Reels Mockup - Phone Frame with 9:16 ratio */}
                  {(currentPlacement === 'stories' || currentPlacement === 'reels' || currentPlacement.includes('stories') || currentPlacement.includes('reels')) && (
                    <div className="relative w-[280px] h-[497px] bg-black rounded-[40px] p-3 shadow-2xl">
                      <div className="relative w-full h-full bg-black rounded-[35px] overflow-hidden">
                        {/* Background Image/Video/Carousel or Placeholder */}
                        {/* Pause Indicator for Paused Ads */}
                        {ad.status === 'paused' && (
                          <div className="absolute top-16 right-4 z-40">
                            <PauseCircle className="h-10 w-10 text-red-500 drop-shadow-lg" fill="white" />
                          </div>
                        )}
                        
                        {displayImageUrl || (isCarousel && carouselItems.length > 0) ? (
                          <>
                            {isCarousel && carouselItems.length > 1 ? (
                              // Stories Carousel Display
                              <div className="relative w-full h-full">
                                <img
                                  src={getImageUrl(carouselItems[carouselIndex]?.url)}
                                  alt={`Carousel ${carouselIndex + 1} of ${carouselItems.length}`}
                                  className="w-full h-full object-cover"
                                />
                                
                                {/* Stories-style progress indicators at top */}
                                <div className="absolute top-3 left-3 right-3 flex gap-1 z-30">
                                  {carouselItems.map((_, idx) => (
                                    <div
                                      key={idx}
                                      className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
                                    >
                                      <div 
                                        className={cn(
                                          "h-full bg-white transition-all",
                                          idx < carouselIndex ? "w-full" : idx === carouselIndex ? "w-full" : "w-0"
                                        )}
                                      />
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Tap areas for navigation (left/right halves) */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCarouselIndex((prev) => Math.max(0, prev - 1))
                                  }}
                                  className="absolute left-0 top-0 w-1/3 h-full z-20"
                                  disabled={carouselIndex === 0}
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCarouselIndex((prev) => Math.min(carouselItems.length - 1, prev + 1))
                                  }}
                                  className="absolute right-0 top-0 w-1/3 h-full z-20"
                                  disabled={carouselIndex === carouselItems.length - 1}
                                />
                              </div>
                            ) : (
                              // Single Image/Video Display
                              <img
                                src={displayImageUrl}
                                alt="Ad preview"
                                className="w-full h-full object-cover"
                              />
                            )}
                            {isVideo && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const videoId = getVideoIdForExternalView(creative)
                                  if (videoId) {
                                    window.open(`https://www.facebook.com/video.php?v=${videoId}`, '_blank')
                                  } else {
                                    alert('Video preview not available. Video ID not found.')
                                  }
                                }}
                                className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors cursor-pointer group z-30"
                                title="View video on Facebook"
                              >
                                <div className="bg-white/90 group-hover:bg-white rounded-full p-4 shadow-lg transition-all group-hover:scale-110">
                                  <Play className="h-8 w-8 text-gray-800 fill-current" />
                                </div>
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                            <div className="text-center">
                              <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">No creative available</p>
                              <p className="text-gray-600 text-xs mt-1">for this placement</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Dark gradient overlays for text readability */}
                        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/60 via-black/20 to-transparent z-10" />
                        <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
                        
                        {/* Stories-specific UI */}
                        {currentPlacement.includes('stories') && (
                          <>
                            {/* Safe Zone Overlay - Toggle with button */}
                            {showSafeZones && (
                            <div className="absolute inset-0 pointer-events-none z-40">
                              {/* Top safe zone (64px - progress bar + profile area) */}
                              <div className="absolute top-0 left-0 right-0 h-16 border-b-2 border-dashed border-red-500/40">
                                <div className="absolute top-1 left-2 bg-red-600 text-white text-[7px] px-1 py-0.5 rounded font-medium">
                                  Profile Zone (64px)
                                </div>
                              </div>
                              {/* Bottom safe zone (88px - CTA button area) */}
                              <div className="absolute bottom-0 left-0 right-0 h-[88px] border-t-2 border-dashed border-red-500/40">
                                <div className="absolute bottom-1 left-2 bg-red-600 text-white text-[7px] px-1 py-0.5 rounded font-medium">
                                  CTA Zone (88px)
                                </div>
                              </div>
                              {/* Right side engagement zone (60px wide) */}
                              <div className="absolute top-0 right-0 w-[60px] h-full border-l-2 border-dashed border-blue-500/40">
                                <div className="absolute top-1/2 -translate-y-1/2 -left-8 rotate-90 bg-blue-600 text-white text-[7px] px-1 py-0.5 rounded font-medium">
                                  Actions (60px)
                                </div>
                              </div>
                              {/* Safe content area indicator */}
                              <div className="absolute top-16 bottom-[88px] left-4 right-[60px] border-2 border-dashed border-green-500/30">
                                <div className="absolute top-1 left-1 bg-green-600 text-white text-[7px] px-1 py-0.5 rounded font-medium">
                                  Safe Area
                                </div>
                              </div>
                            </div>
                            )}

                            {/* Story Progress Bar - At the very top */}
                            <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
                              <div className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
                                <div className="w-2/3 h-full bg-white rounded-full animate-[progress_5s_linear]" />
                              </div>
                              <div className="flex-1 h-[2px] bg-white/30 rounded-full" />
                              <div className="flex-1 h-[2px] bg-white/30 rounded-full" />
                            </div>
                            
                            {/* Profile Row - Under progress bar */}
                            <div className="absolute top-7 left-3 right-3 z-20 flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                {/* Instagram gradient ring profile pic */}
                                <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-full p-[2px]">
                                  <div className="w-full h-full bg-black rounded-full p-[2px]">
                                    <div className="w-full h-full bg-gray-400 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                                      B
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-white text-[13px] font-semibold drop-shadow">Business</span>
                                  <span className="text-white/60 text-[11px] drop-shadow">•</span>
                                  <span className="text-white/60 text-[11px] drop-shadow">Sponsored</span>
                                </div>
                              </div>
                              <X className="w-5 h-5 text-white/80 drop-shadow" />
                            </div>
                            
                            {/* Right Side Engagement Buttons - VERTICAL LAYOUT */}
                            <div className="absolute right-2 bottom-[100px] z-20 flex flex-col items-center gap-3">
                              <div className="flex flex-col items-center">
                                <div className="w-10 h-10 flex items-center justify-center">
                                  <Heart className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                                </div>
                                <span className="text-white text-[10px] font-semibold drop-shadow">
                                  {engagementMetrics.likes > 999 ? `${(engagementMetrics.likes/1000).toFixed(1)}K` : engagementMetrics.likes}
                                </span>
                              </div>
                              <div className="flex flex-col items-center">
                                <div className="w-10 h-10 flex items-center justify-center">
                                  <MessageCircle className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                                </div>
                                <span className="text-white text-[10px] font-semibold drop-shadow">
                                  {engagementMetrics.comments}
                                </span>
                              </div>
                              <div className="flex flex-col items-center">
                                <div className="w-10 h-10 flex items-center justify-center">
                                  <Send className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                                </div>
                                <span className="text-white text-[10px] font-semibold drop-shadow">
                                  {engagementMetrics.shares}
                                </span>
                              </div>
                              <div className="w-10 h-10 flex items-center justify-center">
                                <Bookmark className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                              </div>
                              <div className="w-10 h-10 flex items-center justify-center">
                                <MoreHorizontal className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                              </div>
                            </div>
                            
                            {/* Ad Text Content - Positioned in safe area avoiding right buttons */}
                            {adBody && (
                              <div className="absolute bottom-24 left-4 right-[70px] z-20">
                                <p className="text-white text-[12px] leading-[1.3] font-normal drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] line-clamp-3">
                                  {adBody}
                                </p>
                              </div>
                            )}
                            
                            {/* CTA Button at bottom */}
                            <div className="absolute bottom-4 left-4 right-4 z-20">
                              <Button 
                                size="sm" 
                                className="w-full h-11 text-[13px] font-semibold bg-white text-black hover:bg-gray-100 rounded-md shadow-lg"
                                onClick={handleCTAClick}
                              >
                                {formatCTAText(ctaText)}
                              </Button>
                              {/* Swipe Up hint */}
                              <div className="flex items-center justify-center mt-2 gap-1">
                                <ChevronRight className="w-3 h-3 text-white/60 rotate-[-90deg]" />
                                <span className="text-white/60 text-[10px]">Learn More</span>
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Reels-specific UI */}
                        {currentPlacement.includes('reels') && (
                          <>
                            {/* Safe Zone Overlay for Reels */}
                            {showSafeZones && (
                            <div className="absolute inset-0 pointer-events-none z-40">
                              {/* Top safe zone (48px - Reels header) */}
                              <div className="absolute top-0 left-0 right-0 h-12 border-b-2 border-dashed border-red-500/40">
                                <div className="absolute top-1 left-2 bg-red-600 text-white text-[7px] px-1 py-0.5 rounded font-medium">
                                  Header (48px)
                                </div>
                              </div>
                              {/* Bottom safe zone (variable - profile + caption + CTA) */}
                              <div className="absolute bottom-0 left-0 right-0 h-[180px] border-t-2 border-dashed border-red-500/40">
                                <div className="absolute bottom-1 left-2 bg-red-600 text-white text-[7px] px-1 py-0.5 rounded font-medium">
                                  Content Zone (180px)
                                </div>
                              </div>
                              {/* Right side engagement zone (56px wide) */}
                              <div className="absolute top-12 bottom-0 right-0 w-14 border-l-2 border-dashed border-blue-500/40">
                                <div className="absolute top-1/3 -translate-y-1/2 -left-8 rotate-90 bg-blue-600 text-white text-[7px] px-1 py-0.5 rounded font-medium">
                                  Actions (56px)
                                </div>
                              </div>
                              {/* Safe content area */}
                              <div className="absolute top-12 bottom-[180px] left-4 right-14 border-2 border-dashed border-green-500/30">
                                <div className="absolute top-1 left-1 bg-green-600 text-white text-[7px] px-1 py-0.5 rounded font-medium">
                                  Safe Area
                                </div>
                              </div>
                            </div>
                            )}

                            {/* Top Section - Profile */}
                            <div className="absolute top-4 left-3 right-3 z-20 flex items-center justify-between">
                              <span className="text-white text-sm font-semibold drop-shadow">Reels</span>
                              <div className="flex items-center gap-3">
                                <Camera className="w-5 h-5 text-white drop-shadow" />
                                <Search className="w-5 h-5 text-white drop-shadow" />
                              </div>
                            </div>
                            
                            {/* Bottom Content Area */}
                            <div className="absolute bottom-0 left-0 right-0 z-20">
                              <div className="flex items-end">
                                {/* Left side - Content info */}
                                <div className="flex-1 p-4 pb-6">
                                  {/* Profile info */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-full p-[2px]">
                                      <div className="w-full h-full bg-black rounded-full p-[2px]">
                                        <div className="w-full h-full bg-gray-400 rounded-full" />
                                      </div>
                                    </div>
                                    <span className="text-white text-[12px] font-semibold drop-shadow">business_name</span>
                                    <span className="text-white/60 text-[11px] drop-shadow">•</span>
                                    <span className="text-white/60 text-[11px] drop-shadow">Sponsored</span>
                                    <button className="ml-2 px-2 py-0.5 border border-white/80 rounded text-white text-[10px] font-medium">
                                      Follow
                                    </button>
                                  </div>
                                  
                                  {/* Caption */}
                                  {adBody && (
                                    <p className="text-white text-[11px] leading-relaxed mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">
                                      {adBody}
                                    </p>
                                  )}
                                  
                                  {/* Audio info */}
                                  <div className="flex items-center gap-1.5">
                                    <Music className="w-3 h-3 text-white" />
                                    <span className="text-white text-[11px]">Original audio</span>
                                  </div>
                                  
                                  {/* CTA Button */}
                                  <Button 
                                    size="sm" 
                                    className="mt-3 h-8 px-4 text-[11px] font-semibold bg-white/90 text-black hover:bg-white rounded"
                                    onClick={handleCTAClick}
                                  >
                                    {formatCTAText(ctaText)}
                                  </Button>
                                </div>
                                
                                {/* Right side - Engagement buttons */}
                                <div className="flex flex-col items-center gap-4 p-3 pb-6">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="w-10 h-10 flex items-center justify-center">
                                      <Heart className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                                    </div>
                                    <span className="text-white text-[11px] font-semibold drop-shadow">
                                      {engagementMetrics.likes > 999 ? `${(engagementMetrics.likes/1000).toFixed(1)}K` : engagementMetrics.likes}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="w-10 h-10 flex items-center justify-center">
                                      <MessageCircle className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                                    </div>
                                    <span className="text-white text-[11px] font-semibold drop-shadow">
                                      {engagementMetrics.comments > 999 ? `${(engagementMetrics.comments/1000).toFixed(1)}K` : engagementMetrics.comments}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="w-10 h-10 flex items-center justify-center">
                                      <Send className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] -rotate-12" />
                                    </div>
                                    <span className="text-white text-[11px] font-semibold drop-shadow">
                                      {engagementMetrics.shares}
                                    </span>
                                  </div>
                                  <div className="w-10 h-10 flex items-center justify-center">
                                    <Bookmark className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                                  </div>
                                  <div className="w-10 h-10 flex items-center justify-center">
                                    <MoreHorizontal className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                                  </div>
                                  <div className="w-8 h-8 bg-gray-400 rounded border-2 border-white shadow-lg" />
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Video Play Button Overlay */}
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                            <div className="w-16 h-16 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                              <Play className="h-9 w-9 text-white ml-1" fill="white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Feed/Video Feed Mockup - Complete Facebook Post */}
                  {(currentPlacement === 'feed' || currentPlacement === 'video_feed' || currentPlacement.includes('feed')) && (
                    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border">
                      {/* Post Header */}
                      <div className="p-3 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full" />
                            <div>
                              <div className="text-sm font-semibold">Your Business</div>
                              <div className="text-xs text-muted-foreground">Sponsored • Just now</div>
                            </div>
                          </div>
                          <button className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Post Text */}
                      {adBody && (
                        <div className="p-3">
                          <p className="text-sm text-gray-900">{adBody}</p>
                        </div>
                      )}
                      
                      {/* Image/Video/Carousel */}
                      <div className="relative">
                        {/* Pause Indicator for Paused Ads */}
                        {ad.status === 'paused' && (
                          <div className="absolute top-3 right-3 z-30">
                            <PauseCircle className="h-8 w-8 text-red-500 drop-shadow-lg" fill="white" />
                          </div>
                        )}
                        
                        {displayImageUrl || (isCarousel && carouselItems.length > 0) ? (
                          <>
                            {isCarousel && carouselItems.length > 1 ? (
                              // Carousel Display
                              <div className="relative">
                                <img
                                  src={getImageUrl(carouselItems[carouselIndex]?.url)}
                                  alt={carouselItems[carouselIndex]?.title || `Carousel ${carouselIndex + 1}`}
                                  className="w-full h-auto object-cover"
                                />
                                
                                {/* Carousel Card Text Overlay */}
                                {carouselItems[carouselIndex]?.title && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                    <h4 className="text-white font-semibold text-sm">{carouselItems[carouselIndex].title}</h4>
                                    {carouselItems[carouselIndex]?.description && (
                                      <p className="text-white/80 text-xs mt-1">{carouselItems[carouselIndex].description}</p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Carousel Navigation */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCarouselIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length)
                                  }}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all z-20"
                                  disabled={carouselItems.length <= 1}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCarouselIndex((prev) => (prev + 1) % carouselItems.length)
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all z-20"
                                  disabled={carouselItems.length <= 1}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                                
                                {/* Carousel Indicators */}
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                                  {carouselItems.map((_, idx) => (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setCarouselIndex(idx)
                                      }}
                                      className={cn(
                                        "w-2 h-2 rounded-full transition-all",
                                        idx === carouselIndex 
                                          ? "bg-white w-6" 
                                          : "bg-white/60 hover:bg-white/80"
                                      )}
                                    />
                                  ))}
                                </div>
                                
                                {/* Carousel Counter */}
                                <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-20">
                                  {carouselIndex + 1} / {carouselItems.length}
                                </div>
                              </div>
                            ) : (
                              // Single Image/Video Display
                              <img
                                src={displayImageUrl}
                                alt="Ad preview"
                                className="w-full h-auto object-cover"
                              />
                            )}
                            
                            {/* Video Play Button Overlay */}
                            {isVideo && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation() // Prevent dialog from closing
                                  // Facebook videos can only be viewed on Facebook
                                  const videoId = getVideoIdForExternalView(creative)
                                  if (videoId) {
                                    window.open(`https://www.facebook.com/video.php?v=${videoId}`, '_blank')
                                  } else {
                                    alert('Video preview not available. Video ID not found.')
                                  }
                                }}
                                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer group z-10"
                                title="View video on Facebook"
                              >
                                <div className="bg-white/90 group-hover:bg-white rounded-full p-4 shadow-lg transition-all group-hover:scale-110">
                                  <Play className="h-8 w-8 text-gray-800 fill-current" />
                                </div>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  View on Facebook <ExternalLink className="inline h-3 w-3 ml-1" />
                                </div>
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
                            <div className="text-center">
                              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">No image available</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Link Preview Card */}
                      <div className="m-3 border rounded-lg overflow-hidden">
                        <div className="p-3 bg-gray-50">
                          <div className="text-xs text-gray-500 uppercase">
                            {(() => {
                              try {
                                const url = linkUrl && linkUrl !== '#' ? linkUrl : 'https://example.com'
                                return new URL(url).hostname
                              } catch {
                                return 'example.com'
                              }
                            })()}
                          </div>
                          <h4 className="text-sm font-semibold mt-1">{adTitle}</h4>
                          <Button
                            size="sm"
                            className="w-full mt-2 h-8 text-xs font-medium"
                            onClick={handleCTAClick}
                          >
                            {formatCTAText(ctaText)}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Engagement Bar */}
                      <div className="px-3 py-2 border-t border-b flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <div className="flex -space-x-1">
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <ThumbsUp className="h-2.5 w-2.5 text-white" />
                            </div>
                            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                              <Heart className="h-2.5 w-2.5 text-white" />
                            </div>
                          </div>
                          <span>{engagementMetrics.likes.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span>{engagementMetrics.comments} comments</span>
                          <span>{engagementMetrics.shares} shares</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="px-3 py-1 flex items-center justify-around">
                        <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded">
                          <ThumbsUp className="h-4 w-4" />
                          <span className="text-sm font-medium">Like</span>
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded">
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Comment</span>
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded">
                          <Share2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Share</span>
                        </button>
                      </div>
                      
                      {/* Comments */}
                      {comments.length > 0 ? (
                        <div className="border-t-2 border-blue-200 bg-blue-50">
                          <div className="p-3 space-y-3">
                            <div className="text-sm font-semibold text-blue-900">Comments ({comments.length})</div>
                            {comments.map((comment: any, index: number) => (
                              <div key={comment.id || index} className="space-y-2">
                                <div className="flex gap-2">
                                  <div className="w-8 h-8 bg-blue-400 rounded-full flex-shrink-0" />
                                  <div className="flex-1 bg-white rounded-xl px-3 py-2 border border-blue-200">
                                    <div className="text-sm font-semibold text-gray-900">{comment.user}</div>
                                    <div className="text-sm text-gray-700 mt-1">{comment.text}</div>
                                    {/* Like count and replies count */}
                                    {(comment.likes > 0 || comment.replies?.length > 0) && (
                                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                                        {comment.likes > 0 && (
                                          <span className="flex items-center gap-1">
                                            <ThumbsUp className="h-2.5 w-2.5" />
                                            {comment.likes}
                                          </span>
                                        )}
                                        {comment.replies?.length > 0 && (
                                          <span>{comment.replies.length} replies</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Show first reply if exists */}
                                {comment.replies?.length > 0 && (
                                  <div className="ml-10 flex gap-2 mt-2">
                                    <div className="w-6 h-6 bg-gray-300 rounded-full flex-shrink-0" />
                                    <div className="flex-1 bg-gray-100 rounded-xl px-3 py-2 border border-gray-200">
                                      <div className="text-xs font-semibold text-gray-800">{comment.replies[0].from?.name || comment.replies[0].user_name || 'Reply'}</div>
                                      <div className="text-xs text-gray-600 mt-0.5">{comment.replies[0].message || comment.replies[0].text}</div>
                                      {comment.replies[0].like_count > 0 && (
                                        <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400">
                                          <ThumbsUp className="h-2 w-2" />
                                          {comment.replies[0].like_count}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="border-t-2 border-gray-200 bg-gray-50 p-4 text-center text-gray-500 text-sm">
                          No comments available
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Explore Grid Mockup */}
                  {(currentPlacement === 'explore' || currentPlacement.includes('explore')) && (
                    <div className="grid grid-cols-3 gap-0.5 w-full max-w-[380px] bg-white p-2 rounded-lg shadow-sm">
                      <div className="col-span-2 row-span-2 relative">
                        {displayImageUrl ? (
                          <img
                            src={displayImageUrl}
                            alt="Ad preview"
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center min-h-[250px]">
                            <div className="text-center">
                              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">No image</p>
                            </div>
                          </div>
                        )}
                        <div className="absolute top-1 left-1 bg-white/90 px-1.5 py-0.5 rounded text-[8px] font-medium">
                          Sponsored
                        </div>
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none rounded">
                            <Play className="h-8 w-8 text-white drop-shadow-lg" />
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-200 rounded aspect-square" />
                      <div className="bg-gray-200 rounded aspect-square" />
                      <div className="bg-gray-200 rounded aspect-square" />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
          
          {/* Right Side - Performance & Targeting Information */}
          <div className="flex-1 p-4 overflow-y-auto">
            <Tabs defaultValue="performance" className="h-full">
              <TabsList className="grid w-full grid-cols-5 h-8 mb-3">
                <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
                <TabsTrigger value="trends" className="text-xs">Performance</TabsTrigger>
                <TabsTrigger value="targeting" className="text-xs">Targeting</TabsTrigger>
                <TabsTrigger value="placement" className="text-xs">Placement</TabsTrigger>
                <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
              </TabsList>
              
              {/* Performance Tab */}
              <TabsContent value="performance" className="space-y-3 mt-3">
                {/* Primary Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <Card className="p-3 bg-gradient-to-br from-blue-50 to-white border-blue-200/50">
                    <div className="flex items-center justify-between mb-1">
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-[10px] text-muted-foreground">Reach</span>
                    </div>
                    <div className="text-xl font-bold text-blue-900">
                      {engagementMetrics.impressions.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Impressions</div>
                  </Card>
                  
                  <Card className="p-3 bg-gradient-to-br from-green-50 to-white border-green-200/50">
                    <div className="flex items-center justify-between mb-1">
                      <MousePointerClick className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-[10px] text-muted-foreground">Clicks</span>
                    </div>
                    <div className="text-xl font-bold text-green-900">
                      {engagementMetrics.clicks.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {engagementMetrics.inlineLinkClicks > 0 && (
                        <span className="text-green-600">{engagementMetrics.inlineLinkClicks} in-app</span>
                      )}
                    </div>
                  </Card>
                  
                  <Card className="p-3 bg-gradient-to-br from-purple-50 to-white border-purple-200/50">
                    <div className="flex items-center justify-between mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
                      <span className="text-[10px] text-muted-foreground">Performance</span>
                    </div>
                    <div className="text-xl font-bold text-purple-900">
                      {engagementMetrics.ctr.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">Click-through Rate</div>
                  </Card>
                  
                  <Card className="p-3 bg-gradient-to-br from-orange-50 to-white border-orange-200/50">
                    <div className="flex items-center justify-between mb-1">
                      <DollarSign className="h-3.5 w-3.5 text-orange-600" />
                      <span className="text-[10px] text-muted-foreground">Investment</span>
                    </div>
                    <div className="text-xl font-bold text-orange-900">
                      {currencySymbol}{engagementMetrics.spend.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {engagementMetrics.originalCurrency !== currency && (
                        <span className="text-orange-600">
                          {engagementMetrics.originalCurrency} {engagementMetrics.originalSpend.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </Card>
                </div>

                
                {/* Enhanced Engagement Metrics */}
                <Card className="p-3">
                  <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    Social Engagement
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <ThumbsUp className="h-3.5 w-3.5 mx-auto mb-1 text-blue-600" />
                      <div className="text-sm font-semibold">{engagementMetrics.likes}</div>
                      <div className="text-[9px] text-muted-foreground">Likes</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <MessageCircle className="h-3.5 w-3.5 mx-auto mb-1 text-green-600" />
                      <div className="text-sm font-semibold">{engagementMetrics.comments}</div>
                      <div className="text-[9px] text-muted-foreground">Comments</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <Share2 className="h-3.5 w-3.5 mx-auto mb-1 text-purple-600" />
                      <div className="text-sm font-semibold">{engagementMetrics.shares}</div>
                      <div className="text-[9px] text-muted-foreground">Shares</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <Bookmark className="h-3.5 w-3.5 mx-auto mb-1 text-amber-600" />
                      <div className="text-sm font-semibold">{engagementMetrics.saves}</div>
                      <div className="text-[9px] text-muted-foreground">Saves</div>
                    </div>
                  </div>
                  {engagementMetrics.inlinePostEngagement > 0 && (
                    <div className="mt-2 pt-2 border-t text-center">
                      <span className="text-xs text-muted-foreground">
                        Total In-App Engagement: <span className="font-semibold text-foreground">{engagementMetrics.inlinePostEngagement}</span>
                      </span>
                    </div>
                  )}
                </Card>

                {/* Video Performance - Only show for video ads */}
                {isVideo && (engagementMetrics.videoViews > 0 || engagementMetrics.videoPlayActions > 0 || engagementMetrics.impressions > 0) && (
                  <Card className="p-3">
                    <h4 className="text-xs font-medium mb-3 flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      Video Performance
                    </h4>
                    
                    {/* Key Video Quality Metrics */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {/* Scroll Stop Rate (Hook Rate) */}
                      {engagementMetrics.impressions > 0 && (
                        <div className="p-2 bg-purple-50 rounded">
                          <div className="text-lg font-bold text-purple-700">
                            {((engagementMetrics.video3SecWatched || engagementMetrics.videoViews || 0) / engagementMetrics.impressions * 100).toFixed(1)}%
                          </div>
                          <div className="text-[9px] text-muted-foreground">Scroll Stop Rate</div>
                          <div className="text-[8px] text-purple-600 mt-0.5">
                            Hook Rate • 3s Views/Impressions
                          </div>
                        </div>
                      )}
                      
                      {/* Average Watch Time */}
                      {engagementMetrics.videoAvgTimeWatched > 0 && (
                        <div className="p-2 bg-indigo-50 rounded">
                          <div className="text-lg font-bold text-indigo-700">
                            {engagementMetrics.videoAvgTimeWatched}s
                          </div>
                          <div className="text-[9px] text-muted-foreground">Avg. Watch Time</div>
                          <div className="text-[8px] text-indigo-600 mt-0.5">
                            Hold Rate Indicator
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Video Views & Cost Summary */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="p-2 bg-blue-50 rounded text-center">
                        <div className="text-base font-bold text-blue-700">
                          {engagementMetrics.videoViews.toLocaleString()}
                        </div>
                        <div className="text-[8px] text-muted-foreground">Video Views</div>
                      </div>
                      
                      {engagementMetrics.video30SecWatched > 0 && (
                        <div className="p-2 bg-cyan-50 rounded text-center">
                          <div className="text-base font-bold text-cyan-700">
                            {engagementMetrics.video30SecWatched.toLocaleString()}
                          </div>
                          <div className="text-[8px] text-muted-foreground">30s Views</div>
                        </div>
                      )}
                      
                      {engagementMetrics.costPerThruplay > 0 && (
                        <div className="p-2 bg-green-50 rounded text-center">
                          <div className="text-base font-bold text-green-700">
                            {currencySymbol}{engagementMetrics.costPerThruplay.toFixed(2)}
                          </div>
                          <div className="text-[8px] text-muted-foreground">Cost/ThruPlay</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Video Retention Funnel */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center justify-between">
                        <span>Viewer Retention Funnel</span>
                        {engagementMetrics.videoViews > 0 && engagementMetrics.videoP100Watched > 0 && (
                          <span className="text-[9px] text-purple-600 font-semibold">
                            {((engagementMetrics.videoP100Watched / engagementMetrics.videoViews) * 100).toFixed(1)}% completion rate
                          </span>
                        )}
                      </div>
                      
                      {/* Start (Video Views) */}
                      {engagementMetrics.videoViews > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Started</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full" style={{width: '100%'}}></div>
                            </div>
                            <span className="text-xs font-semibold min-w-[40px] text-right">{engagementMetrics.videoViews.toLocaleString()}</span>
                            <span className="text-[9px] text-muted-foreground min-w-[35px] text-right">100%</span>
                          </div>
                        </div>
                      )}
                      
                      {/* 25% Watched */}
                      {engagementMetrics.videoP25Watched > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">25%</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{width: engagementMetrics.videoViews > 0 ? `${(engagementMetrics.videoP25Watched / engagementMetrics.videoViews * 100)}%` : '0%'}}
                              ></div>
                            </div>
                            <span className="text-xs font-semibold min-w-[40px] text-right">{engagementMetrics.videoP25Watched.toLocaleString()}</span>
                            <span className="text-[9px] text-muted-foreground min-w-[35px] text-right">
                              {engagementMetrics.videoViews > 0 ? `${((engagementMetrics.videoP25Watched / engagementMetrics.videoViews) * 100).toFixed(0)}%` : '0%'}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* 50% Watched */}
                      {engagementMetrics.videoP50Watched > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">50%</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300" 
                                style={{width: engagementMetrics.videoViews > 0 ? `${(engagementMetrics.videoP50Watched / engagementMetrics.videoViews * 100)}%` : '0%'}}
                              ></div>
                            </div>
                            <span className="text-xs font-semibold min-w-[40px] text-right">{engagementMetrics.videoP50Watched.toLocaleString()}</span>
                            <span className="text-[9px] text-muted-foreground min-w-[35px] text-right">
                              {engagementMetrics.videoViews > 0 ? `${((engagementMetrics.videoP50Watched / engagementMetrics.videoViews) * 100).toFixed(0)}%` : '0%'}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* 75% Watched */}
                      {engagementMetrics.videoP75Watched > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">75%</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-amber-400 to-amber-600 h-2 rounded-full transition-all duration-300" 
                                style={{width: engagementMetrics.videoViews > 0 ? `${(engagementMetrics.videoP75Watched / engagementMetrics.videoViews * 100)}%` : '0%'}}
                              ></div>
                            </div>
                            <span className="text-xs font-semibold min-w-[40px] text-right">{engagementMetrics.videoP75Watched.toLocaleString()}</span>
                            <span className="text-[9px] text-muted-foreground min-w-[35px] text-right">
                              {engagementMetrics.videoViews > 0 ? `${((engagementMetrics.videoP75Watched / engagementMetrics.videoViews) * 100).toFixed(0)}%` : '0%'}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* 95% Watched (if available) */}
                      {engagementMetrics.videoP95Watched > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">95%</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full transition-all duration-300" 
                                style={{width: engagementMetrics.videoViews > 0 ? `${(engagementMetrics.videoP95Watched / engagementMetrics.videoViews * 100)}%` : '0%'}}
                              ></div>
                            </div>
                            <span className="text-xs font-semibold min-w-[40px] text-right">{engagementMetrics.videoP95Watched.toLocaleString()}</span>
                            <span className="text-[9px] text-muted-foreground min-w-[35px] text-right">
                              {engagementMetrics.videoViews > 0 ? `${((engagementMetrics.videoP95Watched / engagementMetrics.videoViews) * 100).toFixed(0)}%` : '0%'}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Completed */}
                      {engagementMetrics.videoP100Watched > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Completed</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-purple-500 to-purple-700 h-2 rounded-full transition-all duration-300" 
                                style={{width: engagementMetrics.videoViews > 0 ? `${(engagementMetrics.videoP100Watched / engagementMetrics.videoViews * 100)}%` : '0%'}}
                              ></div>
                            </div>
                            <span className="text-xs font-bold min-w-[40px] text-right text-purple-700">{engagementMetrics.videoP100Watched.toLocaleString()}</span>
                            <span className="text-[9px] font-semibold text-purple-600 min-w-[35px] text-right">
                              {engagementMetrics.videoViews > 0 ? `${((engagementMetrics.videoP100Watched / engagementMetrics.videoViews) * 100).toFixed(0)}%` : '0%'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Additional Video Metrics */}
                    {(engagementMetrics.videoThruplays > 0 || engagementMetrics.videoContinuous2SecWatched > 0) && (
                      <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                        {engagementMetrics.videoThruplays > 0 && (
                          <div className="p-2 bg-gray-50 rounded text-center">
                            <div className="text-sm font-semibold">{engagementMetrics.videoThruplays.toLocaleString()}</div>
                            <div className="text-[8px] text-muted-foreground">ThruPlays</div>
                            <div className="text-[7px] text-gray-500">15s+ or Complete</div>
                          </div>
                        )}
                        {engagementMetrics.videoContinuous2SecWatched > 0 && (
                          <div className="p-2 bg-gray-50 rounded text-center">
                            <div className="text-sm font-semibold">{engagementMetrics.videoContinuous2SecWatched.toLocaleString()}</div>
                            <div className="text-[8px] text-muted-foreground">2s Continuous</div>
                            <div className="text-[7px] text-gray-500">Views</div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )}

                {/* Quality Rankings */}
                {(engagementMetrics.qualityRanking || engagementMetrics.engagementRateRanking || engagementMetrics.conversionRateRanking) && (
                  <Card className="p-3">
                    <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Quality Rankings
                    </h4>
                    <div className="space-y-2">
                      {engagementMetrics.qualityRanking && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Quality</span>
                          <Badge 
                            variant={engagementMetrics.qualityRanking === 'below_average' ? 'destructive' : 'secondary'} 
                            className={cn(
                              "text-[10px]",
                              engagementMetrics.qualityRanking === 'above_average' && "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                            )}
                          >
                            {engagementMetrics.qualityRanking.replace('_', ' ')}
                          </Badge>
                        </div>
                      )}
                      {engagementMetrics.engagementRateRanking && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Engagement Rate</span>
                          <Badge 
                            variant={engagementMetrics.engagementRateRanking === 'below_average' ? 'destructive' : 'secondary'}
                            className={cn(
                              "text-[10px]",
                              engagementMetrics.engagementRateRanking === 'above_average' && "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                            )}
                          >
                            {engagementMetrics.engagementRateRanking.replace('_', ' ')}
                          </Badge>
                        </div>
                      )}
                      {engagementMetrics.conversionRateRanking && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Conversion Rate</span>
                          <Badge 
                            variant={engagementMetrics.conversionRateRanking === 'below_average' ? 'destructive' : 'secondary'}
                            className={cn(
                              "text-[10px]",
                              engagementMetrics.conversionRateRanking === 'above_average' && "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                            )}
                          >
                            {engagementMetrics.conversionRateRanking.replace('_', ' ')}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
                
                {/* Cost Efficiency */}
                <Card className="p-3">
                  <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Cost Efficiency
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground">Cost per Click</div>
                      <div className="text-lg font-semibold">{currencySymbol}{engagementMetrics.cpc.toFixed(2)}</div>
                      {adMetrics.cpcOriginalCurrency && adMetrics.originalCurrency && adMetrics.originalCurrency !== currency && (
                        <div className="text-[9px] text-muted-foreground">
                          {adMetrics.originalCurrency} {adMetrics.cpcOriginalCurrency.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground">Cost per 1000 Impressions</div>
                      <div className="text-lg font-semibold">{currencySymbol}{engagementMetrics.cpm.toFixed(2)}</div>
                      {adMetrics.cpmOriginalCurrency && adMetrics.originalCurrency && adMetrics.originalCurrency !== currency && (
                        <div className="text-[9px] text-muted-foreground">
                          {adMetrics.originalCurrency} {adMetrics.cpmOriginalCurrency.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                
                {/* Conversions Section */}
                {conversionsData.total > 0 && (
                  <Card className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-orange-600" />
                        <h4 className="text-sm font-semibold">Conversions</h4>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        {conversionsData.total} Total
                      </Badge>
                    </div>
                    
                    {/* Conversion Types Breakdown */}
                    <div className="space-y-2 mb-3">
                      {conversionsData.formatted_types.map((conversion, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-xs font-medium">{conversion.formatted_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {conversion.count}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {((conversion.count / conversionsData.total) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Cost per Conversion */}
                    {conversionsData.cost_per_conversion > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Cost per Conversion</span>
                          <span className="text-sm font-bold text-orange-600">
                            {currencySymbol}{conversionsData.cost_per_conversion.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Other Available Actions */}
                    {adMetrics.rawActions && adMetrics.rawActions.length > 0 && (
                      <details className="mt-3">
                        <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                          <span className="inline-flex items-center gap-1">
                            View all tracked actions ({adMetrics.rawActions.length})
                            <ChevronDown className="h-3 w-3 inline-block" />
                          </span>
                        </summary>
                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto border rounded p-2">
                          {adMetrics.rawActions
                            .sort((a: any, b: any) => parseInt(b.value) - parseInt(a.value))
                            .map((action: any, idx: number) => {
                              const actionName = action.action_type
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (l: string) => l.toUpperCase())
                              const isImportant = [
                                'purchase', 'add_to_cart', 'lead', 'complete_registration',
                                'initiate_checkout', 'add_payment_info', 'search'
                              ].some(key => action.action_type.toLowerCase().includes(key))
                              
                              return (
                                <div 
                                  key={idx} 
                                  className={cn(
                                    "flex justify-between text-[10px] p-1.5 rounded",
                                    isImportant ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50"
                                  )}
                                >
                                  <span className={cn(
                                    "text-muted-foreground",
                                    isImportant && "text-amber-700 font-medium"
                                  )}>
                                    {actionName}:
                                  </span>
                                  <span className={cn(
                                    "font-medium",
                                    isImportant && "text-amber-900"
                                  )}>
                                    {parseInt(action.value).toLocaleString()}
                                  </span>
                                </div>
                              )
                            })}
                        </div>
                      </details>
                    )}
                  </Card>
                )}
              </TabsContent>
              
              {/* Performance Tab - Historical Performance Charts */}
              <TabsContent value="trends" className="space-y-3 mt-3">
                <PerformanceHistory ad={ad} currency={currency} />
              </TabsContent>
              
              {/* Targeting Tab */}
              <TabsContent value="targeting" className="space-y-3 mt-3">
                {/* Demographics */}
                <div className="grid grid-cols-2 gap-2">
                  <Card className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-3 w-3 text-blue-600" />
                      <span className="text-[10px] font-medium text-muted-foreground">Age Range</span>
                    </div>
                    <div className="text-lg font-bold text-blue-900">{ageMin} - {ageMax}</div>
                  </Card>
                  
                  <Card className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-3 w-3 text-purple-600" />
                      <span className="text-[10px] font-medium text-muted-foreground">Gender</span>
                    </div>
                    <div className="text-lg font-bold text-purple-900">
                      {genders.length === 2 ? 'All' : genders.includes(1) ? 'Male' : 'Female'}
                    </div>
                  </Card>
                </div>
                
                {/* Locations */}
                {(geoLocations.countries || geoLocations.regions || geoLocations.cities) && (
                  <Card className="p-3 bg-gradient-to-r from-red-50 to-orange-50 border-red-200/50">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-3 w-3 text-red-600" />
                      <span className="text-xs font-medium">Locations</span>
                    </div>
                    <div className="space-y-2">
                      {geoLocations.countries && (
                        <div className="flex flex-wrap gap-1">
                          {geoLocations.countries.map((country: string) => (
                            <Badge key={country} variant="outline" className="text-[10px] py-0.5">
                              {getCountryFlag(country)} {country}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {geoLocations.regions && (
                        <div className="flex flex-wrap gap-1">
                          {geoLocations.regions.map((region: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] py-0.5">
                              {typeof region === 'string' ? region : region?.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                )}
                
                {/* Interests */}
                {interests.length > 0 && (
                  <Card className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium">Interests</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {interests.map((interest: any, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-[10px] py-0.5">
                          {typeof interest === 'string' ? interest : interest?.name}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </TabsContent>
              
              {/* Placement Tab */}
              <TabsContent value="placement" className="space-y-3 mt-3">
                {publisherPlatformsTargeting.map((platform: string) => {
                  const placements = getDetailedPlacements(platform, targeting)
                  
                  return (
                    <Card key={platform} className="p-3 border">
                      <div className="flex items-center gap-2 mb-2">
                        {getPlatformIcon(platform)}
                        <span className="text-xs font-medium capitalize">
                          {platform === 'audience_network' ? 'Audience Network' : platform}
                        </span>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">
                          {placements.length} placements
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {placements.map((placement: string) => (
                          <Badge
                            key={placement}
                            variant="outline"
                            className="text-[10px] py-0.5"
                          >
                            {getPlacementIcon(placement)}
                            <span className="ml-1">{placement}</span>
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  )
                })}
                
                {/* Devices */}
                <div className="grid grid-cols-2 gap-2">
                  {devicePlatforms.map((device: string) => {
                    const deviceDetails = getDeviceDetails(device, targeting)
                    return (
                      <Card key={device} className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          {device === 'mobile' ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                          <span className="text-xs font-medium capitalize">{device}</span>
                        </div>
                        {deviceDetails && (
                          <div className="text-[10px] text-muted-foreground">{deviceDetails}</div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>
              
              {/* Details Tab */}
              <TabsContent value="details" className="space-y-3 mt-3">
                <Card className="p-3">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ad ID:</span>
                      <code className="font-mono text-[10px] bg-muted px-1 rounded">{ad.externalId}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(ad.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Budget:</span>
                      <span>{currencySymbol}{adAdSet?.budgetAmount || 0}/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPC:</span>
                      <span>{currencySymbol}{engagementMetrics.cpc.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPM:</span>
                      <span>{currencySymbol}{engagementMetrics.cpm.toFixed(2)}</span>
                    </div>
                  </div>
                </Card>
                
                {/* Custom Audiences */}
                {(customAudiences.length > 0 || excludedCustomAudiences.length > 0) && (
                  <Card className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="h-3 w-3" />
                      <span className="text-xs font-medium">Custom Audiences</span>
                    </div>
                    <div className="space-y-2">
                      {customAudiences.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {customAudiences.map((audience: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-[10px] py-0.5">
                              ✓ {typeof audience === 'string' ? audience : audience?.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {excludedCustomAudiences.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {excludedCustomAudiences.map((audience: any, idx: number) => (
                            <Badge key={idx} variant="destructive" className="text-[10px] py-0.5">
                              ✗ {typeof audience === 'string' ? audience : audience?.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                )}
                
                {/* View Live Ad Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={() => {
                    const adId = ad.externalId
                    if (!adId) return
                    
                    if (adCampaign?.provider?.toLowerCase() === 'google') {
                      window.open(`https://adstransparency.google.com/`, '_blank')
                    } else {
                      window.open(`https://www.facebook.com/ads/library/?id=${adId}`, '_blank')
                    }
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View in {adCampaign?.provider === 'google' ? 'Google' : 'Meta'} Ads Library
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
// Performance History Component
function PerformanceHistory({ ad, currency }: { ad: any, currency: string }) {
  const [chartData, setChartData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState('impressions')
  const [dateRange, setDateRange] = useState(30)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHistoricalData()
  }, [ad.id, dateRange])

  const fetchHistoricalData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/ads/${ad.id}/historical?days=${dateRange}`)
      if (!response.ok) throw new Error('Failed to fetch data')
      const data = await response.json()
      
      // Format data for charts
      const formattedData = data.dates.map((date: string, index: number) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rawDate: date,
        impressions: data.metrics.impressions[index],
        clicks: data.metrics.clicks[index],
        spend: data.metrics.spend[index],
        conversions: data.metrics.conversions[index],
        ctr: data.metrics.ctr[index],
        cpc: data.metrics.cpc[index],
        cpm: data.metrics.cpm[index],
        reach: data.metrics.reach[index],
        frequency: data.metrics.frequency[index],
        videoViews: data.metrics.videoViews[index],
        engagement: data.metrics.engagement[index]
      }))
      
      setChartData({
        data: formattedData,
        summary: data.summary
      })
    } catch (err) {
      console.error('Error fetching historical data:', err)
      setError('Unable to load historical data')
    } finally {
      setLoading(false)
    }
  }

  const getCurrencySymbol = (curr: string) => {
    const symbols: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', JPY: '¥', CHF: 'CHF'
    }
    return symbols[curr] || curr + ' '
  }

  const currencySymbol = getCurrencySymbol(currency)

  const metricConfigs = {
    impressions: { label: 'Impressions', color: '#3B82F6', format: (v: number) => v.toLocaleString() },
    clicks: { label: 'Clicks', color: '#10B981', format: (v: number) => v.toLocaleString() },
    conversions: { label: 'Conversions', color: '#F59E0B', format: (v: number) => v.toLocaleString() },
    spend: { label: 'Spend', color: '#EF4444', format: (v: number) => `${currencySymbol}${v.toFixed(2)}` },
    ctr: { label: 'CTR %', color: '#8B5CF6', format: (v: number) => `${v.toFixed(2)}%` },
    cpc: { label: 'CPC', color: '#EC4899', format: (v: number) => `${currencySymbol}${v.toFixed(2)}` },
    cpm: { label: 'CPM', color: '#14B8A6', format: (v: number) => `${currencySymbol}${v.toFixed(2)}` },
    reach: { label: 'Reach', color: '#F97316', format: (v: number) => v.toLocaleString() },
    frequency: { label: 'Frequency', color: '#84CC16', format: (v: number) => v.toFixed(2) },
    videoViews: { label: 'Video Views', color: '#06B6D4', format: (v: number) => v.toLocaleString() },
    engagement: { label: 'Engagement', color: '#A855F7', format: (v: number) => v.toLocaleString() }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading historical data...</p>
        </div>
      </div>
    )
  }

  if (error || !chartData) {
    return (
      <Card className="p-4">
        <div className="text-center text-sm text-muted-foreground">
          {error || 'No historical data available'}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => fetchHistoricalData()}
          >
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  const config = metricConfigs[selectedMetric as keyof typeof metricConfigs]

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <Select value={selectedMetric} onValueChange={setSelectedMetric}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(metricConfigs).map(([key, conf]) => (
              <SelectItem key={key} value={key} className="text-xs">
                {conf.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex gap-1">
          {[7, 14, 30, 60, 90].map(days => (
            <Button
              key={days}
              variant={dateRange === days ? "default" : "outline"}
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setDateRange(days)}
            >
              {days}d
            </Button>
          ))}
        </div>
      </div>

      {/* Main Chart */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center justify-between">
          {config.label} Trend
          <span className="text-xs text-muted-foreground">
            Last {dateRange} days
          </span>
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData.data}>
            <defs>
              <linearGradient id={`color${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={config.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              tickLine={false}
              tickFormatter={config.format}
            />
            <Tooltip
              formatter={config.format}
              labelStyle={{ fontSize: 11 }}
              contentStyle={{ fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey={selectedMetric}
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#color${selectedMetric})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Key Metrics Comparison */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Performance
          </h4>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                labelStyle={{ fontSize: 10 }}
                contentStyle={{ fontSize: 10 }}
              />
              <Line 
                type="monotone" 
                dataKey="clicks" 
                stroke="#10B981" 
                strokeWidth={1.5}
                dot={false}
                name="Clicks"
              />
              <Line 
                type="monotone" 
                dataKey="conversions" 
                stroke="#F59E0B" 
                strokeWidth={1.5}
                dot={false}
                name="Conversions"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-3">
          <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Cost Efficiency
          </h4>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                formatter={(value: any) => `${currencySymbol}${value.toFixed(2)}`}
                labelStyle={{ fontSize: 10 }}
                contentStyle={{ fontSize: 10 }}
              />
              <Line 
                type="monotone" 
                dataKey="cpc" 
                stroke="#EC4899" 
                strokeWidth={1.5}
                dot={false}
                name="CPC"
              />
              <Line 
                type="monotone" 
                dataKey="cpm" 
                stroke="#14B8A6" 
                strokeWidth={1.5}
                dot={false}
                name="CPM"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-3">
          <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
            <MousePointerClick className="h-3 w-3" />
            Engagement Rate
          </h4>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                formatter={(value: any) => `${value.toFixed(2)}%`}
                labelStyle={{ fontSize: 10 }}
                contentStyle={{ fontSize: 10 }}
              />
              <Area 
                type="monotone" 
                dataKey="ctr" 
                stroke="#8B5CF6" 
                strokeWidth={1.5}
                fill="#8B5CF6"
                fillOpacity={0.2}
                name="CTR"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Summary Stats */}
      {chartData?.summary && (
        <Card className="p-3">
          <h4 className="text-xs font-medium mb-2">Period Summary</h4>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Total Spend</span>
              <div className="font-semibold">{currencySymbol}{(chartData.summary.totalSpend ?? 0).toFixed(2)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Total Clicks</span>
              <div className="font-semibold">{(chartData.summary.totalClicks ?? 0).toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Avg. CTR</span>
              <div className="font-semibold">{(chartData.summary.avgCtr ?? 0).toFixed(2)}%</div>
            </div>
            <div>
              <span className="text-muted-foreground">Avg. CPC</span>
              <div className="font-semibold">{currencySymbol}{(chartData.summary.avgCpc ?? 0).toFixed(2)}</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
