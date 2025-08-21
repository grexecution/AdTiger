"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  Play,
  ShoppingBag,
  Search,
  Monitor,
  ExternalLink,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  ThumbsUp,
  Star,
  Clock,
  Globe,
  Phone
} from "lucide-react"

// Google platform icons
const GooglePlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform?.toLowerCase()) {
    case 'google_search':
      return (
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded-full bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 p-0.5">
            <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
              <Search className="h-2 w-2" />
            </div>
          </div>
          <span className="text-xs">Search</span>
        </div>
      )
    case 'youtube':
      return (
        <div className="flex items-center gap-1 text-red-600">
          <div className="h-4 w-4 rounded bg-red-600 flex items-center justify-center">
            <Play className="h-2.5 w-2.5 text-white" fill="currentColor" />
          </div>
          <span className="text-xs">YouTube</span>
        </div>
      )
    case 'google_display':
      return (
        <div className="flex items-center gap-1 text-blue-600">
          <Monitor className="h-4 w-4" />
          <span className="text-xs">Display</span>
        </div>
      )
    case 'google_shopping':
      return (
        <div className="flex items-center gap-1 text-green-600">
          <ShoppingBag className="h-4 w-4" />
          <span className="text-xs">Shopping</span>
        </div>
      )
    default:
      return (
        <div className="flex items-center gap-1 text-gray-600">
          <Globe className="h-4 w-4" />
          <span className="text-xs">Google</span>
        </div>
      )
  }
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

// Google Search Ad Component
const GoogleSearchAdPreview = ({ ad, onExpand }: { ad: any; onExpand: () => void }) => {
  const mockBusinessInfo = {
    siteName: "example.com",
    phone: "(555) 123-4567",
    address: "123 Main St, City, State",
    rating: 4.5,
    reviews: 127
  }

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Ad Label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">
          Ad
        </span>
        <GooglePlatformIcon platform="google_search" />
      </div>

      {/* Mobile Search Result Layout */}
      <div className="space-y-2">
        {/* URL and Site Info */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">E</span>
          </div>
          <span className="text-green-700 text-sm">{mockBusinessInfo.siteName}</span>
        </div>

        {/* Headlines */}
        <div className="space-y-1">
          <h3 className="text-blue-600 text-lg font-medium leading-tight cursor-pointer hover:underline">
            {ad.name.replace(/Ad \d+$/, '').trim() || 'Premium Product Solutions'}
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Get the best deals on premium products. Fast shipping, great prices, and excellent customer service. 
            Free returns within 30 days.
          </p>
        </div>

        {/* Business Extensions */}
        <div className="space-y-2 mt-3">
          {/* Phone Extension */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{mockBusinessInfo.phone}</span>
          </div>

          {/* Location Extension */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="h-4 w-4 rounded-full bg-red-500"></div>
            <span>{mockBusinessInfo.address}</span>
          </div>

          {/* Rating Extension */}
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`h-3 w-3 ${star <= Math.floor(mockBusinessInfo.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {mockBusinessInfo.rating} ({mockBusinessInfo.reviews} reviews)
            </span>
          </div>

          {/* Sitelinks */}
          <div className="flex flex-wrap gap-4 mt-3">
            <a href="#" className="text-blue-600 text-sm hover:underline">Products</a>
            <a href="#" className="text-blue-600 text-sm hover:underline">About Us</a>
            <a href="#" className="text-blue-600 text-sm hover:underline">Contact</a>
            <a href="#" className="text-blue-600 text-sm hover:underline">Support</a>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
          <StatusBadge status={ad.status} />
          <Button
            size="sm"
            variant="outline"
            onClick={onExpand}
            className="text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Details
          </Button>
        </div>
      </div>
    </div>
  )
}

// YouTube Video Ad Component
const YouTubeVideoAdPreview = ({ ad, onExpand }: { ad: any; onExpand: () => void }) => {
  const mockVideoMetrics = {
    views: Math.floor(Math.random() * 100000) + 50000,
    likes: Math.floor(Math.random() * 5000) + 1000,
    comments: Math.floor(Math.random() * 500) + 100,
    duration: "0:30",
    uploadedAgo: "2 days ago"
  }

  return (
    <div className="bg-black rounded-lg overflow-hidden shadow-lg">
      {/* Video Preview */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900">
        {/* Video Thumbnail */}
        <img 
          src={`https://picsum.photos/400/225?random=${ad.id}`} 
          alt={ad.name}
          className="w-full h-full object-cover"
        />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-red-600 rounded-full p-3 shadow-lg hover:bg-red-700 transition-colors">
            <Play className="h-6 w-6 text-white ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white px-2 py-1 rounded text-xs font-medium">
          {mockVideoMetrics.duration}
        </div>

        {/* Skip Ad Button (shows it's an ad) */}
        <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-80 text-white px-2 py-1 rounded text-xs">
          Skip Ad
        </div>

        {/* YouTube Logo */}
        <div className="absolute top-2 left-2">
          <GooglePlatformIcon platform="youtube" />
        </div>
      </div>

      {/* Video Info */}
      <div className="bg-white p-4">
        <div className="space-y-3">
          {/* Title and Channel */}
          <div>
            <h3 className="font-semibold text-sm line-clamp-2 mb-1">
              {ad.name} - Sponsored
            </h3>
            <p className="text-xs text-gray-600">Your Company • {mockVideoMetrics.uploadedAgo}</p>
          </div>

          {/* Video Metrics */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{mockVideoMetrics.views.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              <span>{mockVideoMetrics.likes.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              <span>{mockVideoMetrics.comments.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs">
              Subscribe
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs">
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </Button>
          </div>

          {/* Status */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <StatusBadge status={ad.status} />
            <Button
              size="sm"
              variant="outline"
              onClick={onExpand}
              className="text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Google Display Ad Component
const GoogleDisplayAdPreview = ({ ad, onExpand }: { ad: any; onExpand: () => void }) => {
  return (
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-2 hover:border-blue-300 transition-colors">
      {/* Display Ad Banner */}
      <div className="space-y-2">
        {/* Ad Label */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            Advertisement
          </span>
          <GooglePlatformIcon platform="google_display" />
        </div>

        {/* Banner Content */}
        <div className="relative aspect-[16/6] bg-gradient-to-r from-blue-50 to-purple-50 rounded border overflow-hidden">
          <img 
            src={`https://picsum.photos/320/120?random=${ad.id}`} 
            alt={ad.name}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay Content */}
          <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-center items-center text-white p-4">
            <h3 className="font-bold text-sm text-center mb-2">{ad.name.replace(/Ad$/, '').trim()}</h3>
            <p className="text-xs text-center mb-3 opacity-90">
              Special Offer - Limited Time Only
            </p>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-4">
              Learn More
            </Button>
          </div>
        </div>

        {/* Website Info */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>example.com</span>
          <span>Sponsored</span>
        </div>

        {/* Status */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <StatusBadge status={ad.status} />
          <Button
            size="sm"
            variant="outline"
            onClick={onExpand}
            className="text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Details
          </Button>
        </div>
      </div>
    </div>
  )
}

// Google Shopping Ad Component
const GoogleShoppingAdPreview = ({ ad, onExpand }: { ad: any; onExpand: () => void }) => {
  const mockProduct = {
    price: '$' + (Math.floor(Math.random() * 200) + 50).toFixed(2),
    originalPrice: '$' + (Math.floor(Math.random() * 50) + 200).toFixed(2),
    rating: 4.2 + Math.random() * 0.7,
    reviews: Math.floor(Math.random() * 500) + 50,
    store: "Your Store",
    shipping: "Free shipping"
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-50">
        <img 
          src={`https://picsum.photos/300/300?random=${ad.id}`} 
          alt={ad.name}
          className="w-full h-full object-cover"
        />
        
        {/* Shopping Platform Badge */}
        <div className="absolute top-2 left-2">
          <GooglePlatformIcon platform="google_shopping" />
        </div>

        {/* Sponsored Badge */}
        <div className="absolute top-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs font-medium">
          Sponsored
        </div>
      </div>

      {/* Product Info */}
      <div className="p-3 space-y-2">
        {/* Product Title */}
        <h3 className="font-medium text-sm line-clamp-2 leading-tight">
          {ad.name.replace(/Ad$/, '').replace(/Product Listing/, 'Premium Product')}
        </h3>

        {/* Store Info */}
        <p className="text-xs text-green-700">{mockProduct.store}</p>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                className={`h-3 w-3 ${star <= Math.floor(mockProduct.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
              />
            ))}
          </div>
          <span className="text-xs text-gray-600">
            ({mockProduct.reviews})
          </span>
        </div>

        {/* Pricing */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-green-600">{mockProduct.price}</span>
            <span className="text-sm text-gray-500 line-through">{mockProduct.originalPrice}</span>
          </div>
          <p className="text-xs text-gray-600">{mockProduct.shipping}</p>
        </div>

        {/* Status */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <StatusBadge status={ad.status} />
          <Button
            size="sm"
            variant="outline"
            onClick={onExpand}
            className="text-xs"
          >
            <ShoppingBag className="h-3 w-3 mr-1" />
            Details
          </Button>
        </div>
      </div>
    </div>
  )
}

// Main Google Ad Preview Component
interface GoogleAdPreviewProps {
  ad: any
  campaign: any
  adSet: any
  onExpand: () => void
}

export const GoogleAdPreview = ({ ad, campaign, adSet, onExpand }: GoogleAdPreviewProps) => {
  const adType = ad.metadata?.type || 'expanded_text_ad'
  const platform = ad.metadata?.platform || 'google_search'

  // Determine which preview component to render
  const renderAdPreview = () => {
    switch (platform) {
      case 'youtube':
        return <YouTubeVideoAdPreview ad={ad} onExpand={onExpand} />
      case 'google_display':
        return <GoogleDisplayAdPreview ad={ad} onExpand={onExpand} />
      case 'google_shopping':
        return <GoogleShoppingAdPreview ad={ad} onExpand={onExpand} />
      case 'google_search':
      default:
        return <GoogleSearchAdPreview ad={ad} onExpand={onExpand} />
    }
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200">
      <CardContent className="p-0">
        {/* Mobile-first responsive design */}
        <div className="max-w-sm mx-auto">
          {renderAdPreview()}
        </div>
        
        {/* Campaign/AdSet Info Footer */}
        <div className="p-3 bg-gray-50 border-t">
          <div className="text-xs text-gray-600 space-y-1">
            <p className="font-medium text-primary">{campaign.name}</p>
            <p>{adSet.name}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default GoogleAdPreview