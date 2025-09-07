/**
 * Utility functions for extracting thumbnails from ad creatives
 * Based on platform and placement type
 */

export interface CreativeData {
  // Direct image fields
  thumbnail_url?: string
  image_url?: string
  
  // Asset feed spec (used for dynamic ads, carousel, etc)
  asset_feed_spec?: {
    images?: Array<{
      url?: string
      hash?: string
    }>
    videos?: Array<{
      url?: string
      thumbnail_url?: string
      video_id?: string
    }>
    bodies?: Array<{ text: string }>
    titles?: Array<{ text: string }>
  }
  
  // Object story spec (used for link ads, video ads, etc)
  object_story_spec?: {
    link_data?: {
      picture?: string
      image_hash?: string
      link?: string
      message?: string
      name?: string
    }
    video_data?: {
      image_url?: string
      video_id?: string
      title?: string
      message?: string
    }
    photo_data?: {
      image_hash?: string
      url?: string
    }
  }
  
  // Legacy fields
  image_hash?: string
  video_id?: string
}

/**
 * Get thumbnail URL based on creative structure and platform
 * Priority order:
 * 1. Video thumbnail (if video ad)
 * 2. First image in asset feed
 * 3. Link data picture
 * 4. Direct image URL
 * 5. Photo data URL
 */
export function getThumbnailUrl(
  creative: CreativeData | null | undefined,
  platform?: string
): string | null {
  if (!creative) return null
  
  // 1. Check for video thumbnail first (highest priority for video ads)
  if (creative.asset_feed_spec?.videos?.[0]?.thumbnail_url) {
    return creative.asset_feed_spec.videos[0].thumbnail_url
  }
  
  if (creative.object_story_spec?.video_data?.image_url) {
    return creative.object_story_spec.video_data.image_url
  }
  
  // 2. Check asset feed images (used for carousel, collection, dynamic ads)
  if (creative.asset_feed_spec?.images?.[0]?.url) {
    return creative.asset_feed_spec.images[0].url
  }
  
  // 3. Check link data picture (used for link ads)
  if (creative.object_story_spec?.link_data?.picture) {
    return creative.object_story_spec.link_data.picture
  }
  
  // 4. Check direct image URL
  if (creative.image_url) {
    return creative.image_url
  }
  
  // 5. Check photo data (single image ads)
  if (creative.object_story_spec?.photo_data?.url) {
    return creative.object_story_spec.photo_data.url
  }
  
  // 6. Direct thumbnail URL (rare but possible)
  if (creative.thumbnail_url) {
    return creative.thumbnail_url
  }
  
  return null
}

/**
 * Get all image URLs from a creative
 * Used for carousel ads or multi-image formats
 */
export function getAllImageUrls(creative: CreativeData | null | undefined): string[] {
  if (!creative) return []
  
  const urls: string[] = []
  
  // Get all images from asset feed
  if (creative.asset_feed_spec?.images) {
    creative.asset_feed_spec.images.forEach(img => {
      if (img.url) urls.push(img.url)
    })
  }
  
  // Add video thumbnails
  if (creative.asset_feed_spec?.videos) {
    creative.asset_feed_spec.videos.forEach(video => {
      if (video.thumbnail_url) urls.push(video.thumbnail_url)
    })
  }
  
  // Add other image sources if not already included
  const thumbnail = getThumbnailUrl(creative)
  if (thumbnail && !urls.includes(thumbnail)) {
    urls.push(thumbnail)
  }
  
  return urls
}

/**
 * Determine if creative is a video ad
 */
export function isVideoAd(creative: CreativeData | null | undefined): boolean {
  if (!creative) return false
  
  return !!(
    creative.video_id ||
    creative.asset_feed_spec?.videos?.length ||
    creative.object_story_spec?.video_data?.video_id
  )
}

/**
 * Determine if creative is a carousel ad
 */
export function isCarouselAd(creative: CreativeData | null | undefined): boolean {
  if (!creative) return false
  
  const imageCount = creative.asset_feed_spec?.images?.length || 0
  const videoCount = creative.asset_feed_spec?.videos?.length || 0
  
  return (imageCount + videoCount) > 1
}

/**
 * Get ad format type based on creative structure
 */
export function getAdFormat(creative: CreativeData | null | undefined): string {
  if (!creative) return 'unknown'
  
  if (isCarouselAd(creative)) return 'carousel'
  if (isVideoAd(creative)) return 'video'
  
  if (creative.asset_feed_spec?.images?.length) return 'image'
  if (creative.object_story_spec?.link_data) return 'link'
  if (creative.object_story_spec?.photo_data) return 'photo'
  
  return 'unknown'
}

/**
 * Get thumbnail for specific placement
 * Some placements may have specific image requirements
 */
export function getThumbnailForPlacement(
  creative: CreativeData | null | undefined,
  placement: string
): string | null {
  // For now, use the same logic for all placements
  // In the future, we can add placement-specific logic here
  // e.g., Stories might need vertical images, Feed needs square/horizontal
  return getThumbnailUrl(creative)
}

/**
 * Extract placement information from adGroup metadata
 */
export function getPlacementsFromAdGroup(metadata: any): {
  platforms: string[]
  positions: Record<string, string[]>
} {
  const targeting = metadata?.targeting || {}
  
  return {
    platforms: targeting.publisher_platforms || [],
    positions: {
      facebook: targeting.facebook_positions || [],
      instagram: targeting.instagram_positions || [],
      messenger: targeting.messenger_positions || [],
      audience_network: targeting.audience_network_positions || [],
    }
  }
}

/**
 * Format placement for display
 */
export function formatPlacement(position: string): string {
  const formatMap: Record<string, string> = {
    'feed': 'Feed',
    'instagram_stories': 'Stories',
    'facebook_stories': 'Stories',
    'instagram_reels': 'Reels',
    'facebook_reels': 'Reels',
    'instant_article': 'Instant Articles',
    'instream_video': 'In-Stream Video',
    'marketplace': 'Marketplace',
    'right_hand_column': 'Right Column',
    'search': 'Search Results',
    'video_feeds': 'Video Feeds',
    'instagram_explore': 'Explore',
    'instagram_shop': 'Shop',
    'instagram_profile_feed': 'Profile Feed',
    'messenger_inbox': 'Messenger Inbox',
    'messenger_stories': 'Messenger Stories',
    'rewarded_video': 'Rewarded Video',
    'banner': 'Banner',
    'native': 'Native',
    'native_banner': 'Native Banner',
    'interstitial': 'Interstitial',
    'medium_rectangle': 'Medium Rectangle'
  }
  
  return formatMap[position.toLowerCase()] || position
}