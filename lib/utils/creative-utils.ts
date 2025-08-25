/**
 * Utility functions for handling ad creative data and extracting image URLs
 */

export interface AdCreative {
  id?: string
  name?: string
  title?: string
  body?: string
  image_url?: string
  image_hash?: string
  permalink_url?: string
  thumbnail_url?: string
  video_id?: string
  object_story_spec?: any
  asset_feed_spec?: {
    images?: Array<{
      url: string
      hash?: string
      permalink_url?: string
      width?: number
      height?: number
      url_128?: string
    }>
    videos?: Array<{
      url?: string
      video_id?: string
    }>
    bodies?: Array<{
      text: string
    }>
    titles?: Array<{
      text: string
    }>
    descriptions?: Array<{
      text: string
    }>
    call_to_action_types?: Array<string>
    link_urls?: Array<string>
    publisher_platforms?: Array<string>
  }
}

/**
 * Get images with their dimensions from creative
 */
export function getCreativeImagesWithDimensions(creative: AdCreative | null | undefined): Array<{ url: string; width?: number; height?: number; aspectRatio?: number }> {
  if (!creative) return []
  
  const images: Array<{ url: string; width?: number; height?: number; aspectRatio?: number }> = []
  
  // Extract from asset_feed_spec with dimensions
  if (creative.asset_feed_spec?.images) {
    creative.asset_feed_spec.images.forEach((image) => {
      if (image.url) {
        const width = image.width
        const height = image.height
        const aspectRatio = width && height ? width / height : undefined
        images.push({ url: image.url, width, height, aspectRatio })
      }
    })
  }
  
  // If no images with dimensions, fall back to URLs without dimensions
  if (images.length === 0) {
    const urls = getAllCreativeImageUrls(creative)
    urls.forEach(url => images.push({ url }))
  }
  
  return images
}

/**
 * Get the best image based on aspect ratio preference
 * @param creative - The creative object
 * @param preferredRatio - Preferred aspect ratio (1 for square, 1.91 for landscape, 0.8 for portrait)
 * @returns Best matching image URL or first available image
 */
export function getBestCreativeImageUrl(creative: AdCreative | null | undefined, preferredRatio: number = 1): string | null {
  if (!creative) return null
  
  const images = getCreativeImagesWithDimensions(creative)
  if (images.length === 0) return null
  
  // If we have images with dimensions, find the best match
  const imagesWithRatio = images.filter(img => img.aspectRatio !== undefined)
  
  if (imagesWithRatio.length > 0) {
    // Sort by distance from preferred ratio
    const sorted = imagesWithRatio.sort((a, b) => {
      const aDiff = Math.abs((a.aspectRatio || 1) - preferredRatio)
      const bDiff = Math.abs((b.aspectRatio || 1) - preferredRatio)
      return aDiff - bDiff
    })
    return sorted[0].url
  }
  
  // Fall back to first available image
  return images[0].url
}

/**
 * Extract the best available image URL from ad creative data
 * Priority: asset_feed_spec.images[0].url > permalink_url > image_url > thumbnail_url (parsed for original URL)
 */
export function getCreativeImageUrl(creative: AdCreative | null | undefined): string | null {
  if (!creative) return null

  // First priority: asset_feed_spec images (Meta's new format)
  if (creative.asset_feed_spec?.images && Array.isArray(creative.asset_feed_spec.images) && creative.asset_feed_spec.images.length > 0) {
    const firstImage = creative.asset_feed_spec.images[0]
    if (firstImage.url) {
      return firstImage.url
    }
  }

  // Second priority: permalink_url (most reliable)
  if (creative.permalink_url) {
    return creative.permalink_url
  }

  // Third priority: direct image_url
  if (creative.image_url) {
    return creative.image_url
  }

  // Fourth priority: extract from thumbnail_url
  if (creative.thumbnail_url) {
    try {
      const url = new URL(creative.thumbnail_url)
      const originalUrl = url.searchParams.get('url')
      if (originalUrl) {
        return decodeURIComponent(originalUrl)
      }
      // Fallback to thumbnail URL itself
      return creative.thumbnail_url
    } catch (error) {
      // If URL parsing fails, return the thumbnail URL as is
      return creative.thumbnail_url
    }
  }

  return null
}

/**
 * Extract all available image URLs from ad creative data
 * Useful for carousel ads or ads with multiple images
 */
export function getAllCreativeImageUrls(creative: AdCreative | null | undefined): string[] {
  if (!creative) return []

  const urls: string[] = []
  
  // Priority 1: Extract all images from asset_feed_spec (Meta's new format)
  if (creative.asset_feed_spec?.images) {
    creative.asset_feed_spec.images.forEach((image) => {
      if (image.url) {
        urls.push(image.url)
      }
    })
  }

  // Priority 2: Check object_story_spec for carousel images
  if (creative.object_story_spec?.link_data?.child_attachments) {
    creative.object_story_spec.link_data.child_attachments.forEach((attachment: any) => {
      if (attachment.image_url) {
        urls.push(attachment.image_url)
      }
      if (attachment.image_hash) {
        // Note: For carousel images, we'd need to fetch permalink URLs separately
        // For now, we'll include what we have
      }
    })
  }

  // Priority 3: Fallback to single image URLs if no asset_feed_spec
  if (urls.length === 0) {
    const mainImageUrl = getCreativeImageUrl(creative)
    if (mainImageUrl) {
      urls.push(mainImageUrl)
    }
  }

  // Remove duplicates
  return Array.from(new Set(urls))
}

/**
 * Determine the creative format based on available data
 */
export function getCreativeFormat(creative: AdCreative | null | undefined): 'image' | 'video' | 'carousel' | 'unknown' {
  if (!creative) return 'unknown'

  // Check for video in asset_feed_spec
  if (creative.asset_feed_spec?.videos && Array.isArray(creative.asset_feed_spec.videos) && creative.asset_feed_spec.videos.length > 0) {
    return 'video'
  }

  // Check for traditional video
  if (creative.video_id) {
    return 'video'
  }

  // Check for carousel in object_story_spec (actual carousel format)
  if (creative.object_story_spec?.link_data?.child_attachments && Array.isArray(creative.object_story_spec.link_data.child_attachments) && creative.object_story_spec.link_data.child_attachments.length > 1) {
    return 'carousel'
  }
  
  // Check if asset_feed_spec has carousel indicators (not just multiple sizes)
  // Multiple images in asset_feed_spec often means multiple aspect ratios, not carousel
  // Only consider it carousel if there's explicit carousel configuration
  if (creative.asset_feed_spec?.call_to_action_types && 
      creative.asset_feed_spec?.images && 
      Array.isArray(creative.asset_feed_spec.images) && 
      creative.asset_feed_spec.images.length > 1 &&
      creative.asset_feed_spec?.link_urls && 
      Array.isArray(creative.asset_feed_spec.link_urls) && 
      creative.asset_feed_spec.link_urls.length > 1) {
    return 'carousel'
  }

  // Check for single image in asset_feed_spec
  if (creative.asset_feed_spec?.images && Array.isArray(creative.asset_feed_spec.images) && creative.asset_feed_spec.images.length === 1) {
    return 'image'
  }

  // Check for traditional single image
  if (creative.image_url || creative.image_hash || creative.thumbnail_url) {
    return 'image'
  }

  return 'unknown'
}

/**
 * Check if creative has multiple images (carousel)
 */
export function isCarouselCreative(creative: AdCreative | null | undefined): boolean {
  return getCreativeFormat(creative) === 'carousel'
}

/**
 * Check if creative is a video
 */
export function isVideoCreative(creative: AdCreative | null | undefined): boolean {
  return getCreativeFormat(creative) === 'video'
}

/**
 * Get video thumbnail URL for video creatives
 */
export function getVideoThumbnailUrl(creative: AdCreative | null | undefined): string | null {
  if (!creative || !creative.video_id) return null

  // Meta provides video thumbnails through the video_id
  // Format: https://external.xx.fbcdn.net/safe_image.php?d={video_thumbnail_url}
  
  // For now, return the main image URL as fallback
  return getCreativeImageUrl(creative)
}

/**
 * Google Ads specific creative data interface
 */
export interface GoogleAdCreative {
  id?: string
  name?: string
  headlines?: Array<{ text: string }>
  descriptions?: Array<{ text: string }>
  displayUrl?: string
  finalUrl?: string
  images?: Array<{ url: string; fullSize?: { url: string } }>
  videos?: Array<{ url: string; youtubeVideoId?: string }>
  responsiveDisplayAd?: {
    headlines?: Array<{ text: string }>
    longHeadlines?: Array<{ text: string }>
    descriptions?: Array<{ text: string }>
    businessName?: string
    marketingImages?: Array<{ url: string }>
    logoImages?: Array<{ url: string }>
    squareMarketingImages?: Array<{ url: string }>
  }
}

/**
 * Extract image URL from Google Ads creative data
 */
export function getGoogleCreativeImageUrl(creative: GoogleAdCreative | null | undefined): string | null {
  if (!creative) return null

  // Check responsive display ad images
  if (creative.responsiveDisplayAd?.marketingImages?.[0]?.url) {
    return creative.responsiveDisplayAd.marketingImages[0].url
  }

  // Check direct images array
  if (creative.images?.[0]?.fullSize?.url) {
    return creative.images[0].fullSize.url
  }

  if (creative.images?.[0]?.url) {
    return creative.images[0].url
  }

  return null
}

/**
 * Extract all image URLs from Google Ads creative
 */
export function getAllGoogleCreativeImageUrls(creative: GoogleAdCreative | null | undefined): string[] {
  if (!creative) return []

  const urls: string[] = []

  // Add responsive display ad images
  if (creative.responsiveDisplayAd?.marketingImages) {
    urls.push(...creative.responsiveDisplayAd.marketingImages.map(img => img.url).filter(Boolean))
  }

  if (creative.responsiveDisplayAd?.squareMarketingImages) {
    urls.push(...creative.responsiveDisplayAd.squareMarketingImages.map(img => img.url).filter(Boolean))
  }

  // Add direct images
  if (creative.images) {
    creative.images.forEach(img => {
      if (img.fullSize?.url) urls.push(img.fullSize.url)
      else if (img.url) urls.push(img.url)
    })
  }

  // Remove duplicates
  return Array.from(new Set(urls))
}

/**
 * Get Google Ad format based on creative data
 */
export function getGoogleCreativeFormat(creative: GoogleAdCreative | null | undefined): 'text' | 'image' | 'video' | 'responsive_display' | 'unknown' {
  if (!creative) return 'unknown'

  // Check for video
  if (creative.videos && Array.isArray(creative.videos) && creative.videos.length > 0) {
    return 'video'
  }

  // Check for responsive display ad
  if (creative.responsiveDisplayAd) {
    return 'responsive_display'
  }

  // Check for images
  if (creative.images && Array.isArray(creative.images) && creative.images.length > 0) {
    return 'image'
  }

  // Check for text ad (has headlines/descriptions but no images/videos)
  if ((creative.headlines && Array.isArray(creative.headlines) && creative.headlines.length > 0) || 
      (creative.descriptions && Array.isArray(creative.descriptions) && creative.descriptions.length > 0)) {
    return 'text'
  }

  return 'unknown'
}

/**
 * Determine creative format for any provider
 */
export function getUniversalCreativeFormat(ad: any, provider: string = 'meta'): string {
  if (provider === 'google') {
    return getGoogleCreativeFormat(ad.creative)
  } else {
    return getCreativeFormat(ad.creative)
  }
}

/**
 * Get image URL for any provider
 */
export function getUniversalCreativeImageUrl(ad: any, provider: string = 'meta'): string | null {
  if (provider === 'google') {
    return getGoogleCreativeImageUrl(ad.creative)
  } else {
    return getCreativeImageUrl(ad.creative)
  }
}