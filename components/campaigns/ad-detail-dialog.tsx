"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Play,
  ImageIcon,
  Layers,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  Download,
  Copy,
  Maximize2,
  Info,
} from "lucide-react"
import {
  getCreativeImageUrl,
  getCreativeFormat,
  isVideoCreative,
  isCarouselCreative,
  getAllCreativeImageUrls,
  getCreativeImagesWithDimensions,
} from "@/lib/utils/creative-utils"

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

interface AdDetailDialogProps {
  ad: any
  open: boolean
  onClose: () => void
}

export function AdDetailDialog({ ad, open, onClose }: AdDetailDialogProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  
  if (!ad) return null
  
  // Get creative data
  const creative = ad.creative
  const creativeFormat = getCreativeFormat(creative)
  const isVideo = isVideoCreative(creative)
  const isCarousel = isCarouselCreative(creative)
  const mainImageUrl = getCreativeImageUrl(creative)
  const allImageUrls = getAllCreativeImageUrls(creative)
  const imagesWithDimensions = getCreativeImagesWithDimensions(creative)
  
  // Get metrics from ad data
  const adMetrics = ad.metadata?.insights || {}
  const engagementMetrics = {
    likes: adMetrics.likes || 0,
    comments: adMetrics.comments || 0,
    shares: adMetrics.shares || 0,
    saves: adMetrics.saves || 0,
    videoViews: adMetrics.videoViews || 0,
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ad.name}</DialogTitle>
          <DialogDescription>
            {ad.campaignName || ad.campaign?.name} → {ad.adSetName || ad.adGroup?.name}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="preview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="creatives">Creatives</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          {/* Preview Tab */}
          <TabsContent value="preview" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Main Creative Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Ad Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {isCarousel && allImageUrls.length > 0 ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={allImageUrls[selectedImageIndex] || `https://picsum.photos/800/800?random=${ad.id}`}
                            alt={`${ad.name} ${selectedImageIndex + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://picsum.photos/800/800?random=${ad.id}_${selectedImageIndex}`
                            }}
                          />
                          {/* Carousel indicators */}
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
                      ) : mainImageUrl ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={mainImageUrl}
                            alt={ad.name}
                            className="w-full h-full object-cover"
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
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                            <p>No preview available</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Creative Text */}
                    <div className="space-y-2">
                      <h4 className="font-semibold">{ad.name}</h4>
                      {creative?.title && (
                        <p className="text-sm font-medium">{creative.title}</p>
                      )}
                      {creative?.body && (
                        <p className="text-sm text-muted-foreground">{creative.body}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button className="flex-1">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Live Ad
                      </Button>
                      <Button variant="outline" size="icon">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Quick Metrics */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Ad Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Status</p>
                        <StatusBadge status={ad.status} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Format</p>
                        <div className="flex items-center gap-2">
                          {creativeFormat === 'video' ? <Play className="h-4 w-4" /> : 
                           creativeFormat === 'carousel' ? <Layers className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                          <span className="text-sm font-medium capitalize">
                            {creativeFormat === 'unknown' ? 'Image' : creativeFormat}
                          </span>
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
                            {engagementMetrics.likes.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" /> Comments
                          </span>
                          <span className="font-medium">
                            {engagementMetrics.comments.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center gap-2">
                            <Share2 className="h-4 w-4" /> Shares
                          </span>
                          <span className="font-medium">
                            {engagementMetrics.shares.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Creatives Tab - Show all variations */}
          <TabsContent value="creatives" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Creative Variations</CardTitle>
                <p className="text-xs text-muted-foreground">
                  All creative assets and variations for this ad
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Images with dimensions */}
                {imagesWithDimensions.length > 0 && (
                  <div>
                    <h5 className="font-medium text-sm mb-3">Images ({imagesWithDimensions.length})</h5>
                    <div className="grid grid-cols-3 gap-4">
                      {imagesWithDimensions.map((image, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <img 
                              src={image.url}
                              alt={`Creative ${idx + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(image.url, '_blank')}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://picsum.photos/400/400?random=${ad.id}_${idx}`
                              }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            {image.width && image.height && (
                              <p>{image.width} × {image.height}px</p>
                            )}
                            {image.aspectRatio && (
                              <p>Ratio: {image.aspectRatio.toFixed(2)}</p>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {image.aspectRatio && image.aspectRatio > 1.5 ? 'Landscape' :
                               image.aspectRatio && image.aspectRatio < 0.8 ? 'Portrait' : 'Square'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Text Variations */}
                {creative?.asset_feed_spec && (
                  <>
                    {creative.asset_feed_spec.titles && creative.asset_feed_spec.titles.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">
                          Headlines ({creative.asset_feed_spec.titles.length})
                        </h5>
                        <div className="space-y-1">
                          {creative.asset_feed_spec.titles.map((title: any, idx: number) => (
                            <div key={idx} className="p-2 bg-muted/50 rounded text-sm">
                              {title.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {creative.asset_feed_spec.bodies && creative.asset_feed_spec.bodies.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">
                          Body Text ({creative.asset_feed_spec.bodies.length})
                        </h5>
                        <div className="space-y-1">
                          {creative.asset_feed_spec.bodies.map((body: any, idx: number) => (
                            <div key={idx} className="p-2 bg-muted/50 rounded text-sm">
                              {body.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {creative.asset_feed_spec.descriptions && creative.asset_feed_spec.descriptions.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">
                          Descriptions ({creative.asset_feed_spec.descriptions.length})
                        </h5>
                        <div className="space-y-1">
                          {creative.asset_feed_spec.descriptions.map((desc: any, idx: number) => (
                            <div key={idx} className="p-2 bg-muted/50 rounded text-sm">
                              {desc.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Metrics Tab */}
          <TabsContent value="metrics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Impressions</p>
                    <p className="text-xl font-bold">
                      {(adMetrics.impressions || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Clicks</p>
                    <p className="text-xl font-bold">
                      {(adMetrics.clicks || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">CTR</p>
                    <p className="text-xl font-bold">
                      {(adMetrics.ctr || 0).toFixed(2)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">CPC</p>
                    <p className="text-xl font-bold">
                      ${(adMetrics.cpc || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Spend</p>
                    <p className="text-xl font-bold">
                      ${(adMetrics.spend || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">CPM</p>
                    <p className="text-xl font-bold">
                      ${(adMetrics.cpm || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Conversions</p>
                    <p className="text-xl font-bold">
                      {(adMetrics.conversions || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">ROAS</p>
                    <p className="text-xl font-bold">
                      {(adMetrics.purchaseRoas || 0).toFixed(2)}x
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Details Tab */}
          <TabsContent value="details" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ad Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Ad ID</p>
                    <p className="font-mono">{ad.externalId || ad.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Provider</p>
                    <p className="capitalize">{ad.provider || 'meta'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Campaign</p>
                    <p>{ad.campaignName || ad.campaign?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ad Set</p>
                    <p>{ad.adSetName || ad.adGroup?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p>{new Date(ad.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Updated</p>
                    <p>{new Date(ad.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {ad.channel && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Channel</p>
                    <Badge variant="outline">{ad.channel}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}