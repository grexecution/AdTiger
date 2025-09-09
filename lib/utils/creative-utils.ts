/**
 * Utility functions for handling ad creative data and extracting image URLs
 */

import { getThumbnailUrl as getThumbnail, getAllImageUrls as getAllImages } from './thumbnail-utils'

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
      const publicUrl = convertToPublicUrl(image.url, image.hash)
      const finalUrl = publicUrl || (image.hash ? `https://graph.facebook.com/v21.0/${image.hash}/picture?width=1200&height=1200` : null)
      
      if (finalUrl) {
        const width = image.width
        const height = image.height
        const aspectRatio = width && height ? width / height : undefined
        images.push({ url: finalUrl, width, height, aspectRatio })
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
 * Convert Facebook business URLs to CDN URLs that don't require authentication
 */
function convertToPublicUrl(url: string | undefined, hash?: string): string | null {
  if (!url) return null
  
  // URLs from scontent CDN are public - return as-is
  // These work fine and don't need authentication
  if (url.includes('scontent') && url.includes('fbcdn.net')) {
    return url
  }
  
  // Skip URLs that require authentication (business.facebook.com, internal APIs)
  // BUT NOT scontent CDN URLs which are public
  if (url.includes('business.facebook.com') || 
      url.includes('/ads/image/') || 
      (url.includes('graph.facebook.com') && !url.includes('/picture') && !url.includes('scontent'))) {
    // If we have a hash, use the Graph API picture endpoint
    if (hash) {
      return `https://graph.facebook.com/v21.0/${hash}/picture?width=1200&height=1200`
    }
    return null // Skip auth-required URLs without a hash
  }
  
  // If it's a Graph API picture URL, ensure it has size parameters
  if (url.includes('graph.facebook.com') && url.includes('/picture')) {
    if (!url.includes('width=') && !url.includes('height=')) {
      const separator = url.includes('?') ? '&' : '?'
      return `${url}${separator}width=1200&height=1200`
    }
    return url
  }
  
  return url
}

/**
 * Extract the best available image URL from ad creative data
 * Priority: asset_feed_spec.images[0] > object_story_spec > image_url > thumbnail_url
 * Note: Returns CDN URLs directly for browser rendering (bypasses CORS issues)
 */
export function getCreativeImageUrl(creative: AdCreative | null | undefined, adId?: string): string | null {
  if (!creative) return null
  
  // Priority 1: asset_feed_spec images (prefer stable permalink_url over CDN URLs)
  if (creative.asset_feed_spec?.images && Array.isArray(creative.asset_feed_spec.images) && creative.asset_feed_spec.images.length > 0) {
    const firstImage = creative.asset_feed_spec.images[0]
    // Prefer permalink_url as it's more stable than CDN URLs
    if (firstImage.permalink_url) return firstImage.permalink_url
    // Fallback to direct URL (might have expired tokens)
    if (firstImage.url) return firstImage.url
  }
  
  // Priority 2: object_story_spec link_data  
  if (creative.object_story_spec?.link_data?.picture) {
    return creative.object_story_spec.link_data.picture
  }

  // Priority 3: direct image_url
  if (creative.image_url) {
    return creative.image_url
  }

  // Priority 4: thumbnail_url
  if (creative.thumbnail_url) {
    return creative.thumbnail_url
  }
  
  // Priority 5: Use thumbnail utils as fallback
  const thumbnailUrl = getThumbnail(creative)
  if (thumbnailUrl) {
    return thumbnailUrl
  }

  return null
}

/**
 * Extract all available image URLs from ad creative data
 * Useful for carousel ads or ads with multiple images
 */
export function getAllCreativeImageUrls(creative: AdCreative | null | undefined): string[] {
  if (!creative) return []
  
  // Use the improved image extraction from thumbnail-utils
  const allUrls = getAllImages(creative)
  
  // Convert all URLs to public URLs if possible
  const publicUrls = allUrls.map(url => {
    const publicUrl = convertToPublicUrl(url)
    return publicUrl || url
  })
  
  // If we got images from the new utility, return them
  if (publicUrls.length > 0) {
    return publicUrls
  }

  // Legacy fallback
  const urls: string[] = []
  
  // Priority 1: Extract all images from asset_feed_spec (Meta's new format)
  if (creative.asset_feed_spec?.images) {
    creative.asset_feed_spec.images.forEach((image) => {
      const publicUrl = convertToPublicUrl(image.url, image.hash)
      if (publicUrl) {
        urls.push(publicUrl)
      } else if (image.hash) {
        // Fall back to Graph API picture endpoint if URL conversion failed
        urls.push(`https://graph.facebook.com/v21.0/${image.hash}/picture?width=1200&height=1200`)
      }
    })
  }

  // Priority 2: Check object_story_spec for carousel images
  if (creative.object_story_spec?.link_data?.child_attachments) {
    creative.object_story_spec.link_data.child_attachments.forEach((attachment: any) => {
      const publicUrl = convertToPublicUrl(attachment.image_url, attachment.image_hash)
      if (publicUrl) {
        urls.push(publicUrl)
      } else if (attachment.image_hash) {
        // Use Graph API picture endpoint for carousel images
        urls.push(`https://graph.facebook.com/v21.0/${attachment.image_hash}/picture?width=1200&height=1200`)
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
  
  // Check for video in object_story_spec
  if (creative.object_story_spec?.video_data?.video_id) {
    return 'video'
  }

  // Check for carousel in object_story_spec (actual carousel format)
  if (creative.object_story_spec?.link_data?.child_attachments && Array.isArray(creative.object_story_spec.link_data.child_attachments) && creative.object_story_spec.link_data.child_attachments.length > 1) {
    return 'carousel'
  }
  
  // Check if asset_feed_spec has multiple unique content items (true carousel)
  // Multiple images alone doesn't mean carousel - they could be placement variations
  // A carousel needs multiple unique titles/bodies/links, not just multiple images
  if (creative.asset_feed_spec?.images && Array.isArray(creative.asset_feed_spec.images) && creative.asset_feed_spec.images.length > 1) {
    const hasMultipleTitles = (creative.asset_feed_spec?.titles?.length || 0) > 1
    const hasMultipleBodies = (creative.asset_feed_spec?.bodies?.length || 0) > 1
    const hasMultipleLinks = (creative.asset_feed_spec?.link_urls?.length || 0) > 1
    
    // Only consider it a carousel if we have multiple content variations
    // Not just multiple images with the same text (which are placement variations)
    if (hasMultipleTitles || hasMultipleBodies || hasMultipleLinks) {
      // Additional check: ensure they're actually different
      if (hasMultipleTitles) {
        const titles = creative.asset_feed_spec?.titles || []
        const uniqueTitles = new Set(titles.map((t: any) => t.text || t))
        if (uniqueTitles.size > 1) return 'carousel'
      }
      if (hasMultipleBodies) {
        const bodies = creative.asset_feed_spec?.bodies || []
        const uniqueBodies = new Set(bodies.map((b: any) => b.text || b))
        if (uniqueBodies.size > 1) return 'carousel'
      }
      if (hasMultipleLinks) {
        const links = creative.asset_feed_spec?.link_urls || []
        const uniqueLinks = new Set(links)
        if (uniqueLinks.size > 1) return 'carousel'
      }
    }
    
    // Multiple images with single title/body = image ad with placement variations
    return 'image'
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
  if (!creative) return null
  
  // Check if it's actually a video
  if (!isVideoCreative(creative)) return null

  // Try to get thumbnail from object_story_spec
  if (creative.object_story_spec?.video_data?.image_url) {
    const publicUrl = convertToPublicUrl(creative.object_story_spec.video_data.image_url)
    if (publicUrl) return publicUrl
  }
  
  // Try to get thumbnail from asset_feed_spec videos
  const firstVideo = creative.asset_feed_spec?.videos?.[0] as any
  if (firstVideo?.thumbnail_url) {
    const publicUrl = convertToPublicUrl(firstVideo.thumbnail_url)
    if (publicUrl) return publicUrl
  }
  
  // Fall back to main image URL
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