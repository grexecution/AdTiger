/**
 * Utility functions for determining channels from provider data
 */

/**
 * Determine the channel for a Meta campaign based on its data
 * @param campaign Campaign data from Meta API
 * @returns The channel (facebook, instagram, etc.)
 */
export function getMetaChannel(campaign: any): string {
  // Check configured_status or special_ad_categories for platform hints
  const metadata = campaign.metadata || campaign
  
  // Check if campaign has placement configuration
  if (metadata.targeting?.publisher_platforms) {
    const platforms = metadata.targeting.publisher_platforms
    
    // If only Instagram is selected
    if (platforms.length === 1 && platforms[0] === 'instagram') {
      return 'instagram'
    }
    
    // If only Facebook is selected
    if (platforms.length === 1 && platforms[0] === 'facebook') {
      return 'facebook'
    }
    
    // If both are selected, try to determine primary from spend
    if (platforms.includes('instagram') && platforms.includes('facebook')) {
      // Could check insights to see where most spend goes
      // For now, default to facebook if both
      return 'facebook'
    }
  }
  
  // Check ad set level targeting
  if (metadata.adsets?.data?.[0]?.targeting?.publisher_platforms) {
    const platforms = metadata.adsets.data[0].targeting.publisher_platforms
    if (platforms.length === 1) {
      return platforms[0] === 'instagram' ? 'instagram' : 'facebook'
    }
  }
  
  // Check objective for hints
  if (metadata.objective) {
    // Instagram-specific objectives
    if (metadata.objective.includes('INSTAGRAM')) {
      return 'instagram'
    }
  }
  
  // Default to facebook for Meta campaigns
  return 'facebook'
}

/**
 * Determine the channel for a Google campaign based on its data
 * @param campaign Campaign data from Google Ads API
 * @returns The channel (google_search, youtube, display, shopping, etc.)
 */
export function getGoogleChannel(campaign: any): string {
  const metadata = campaign.metadata || campaign
  
  // Check advertising_channel_type
  if (metadata.advertising_channel_type) {
    switch (metadata.advertising_channel_type) {
      case 'SEARCH':
        return 'google_search'
      case 'DISPLAY':
        return 'google_display'
      case 'SHOPPING':
        return 'google_shopping'
      case 'VIDEO':
        return 'youtube'
      case 'PERFORMANCE_MAX':
        return 'performance_max'
      default:
        return 'google_search'
    }
  }
  
  // Check campaign type from name or other fields
  if (metadata.name) {
    const name = metadata.name.toLowerCase()
    if (name.includes('youtube') || name.includes('video')) {
      return 'youtube'
    }
    if (name.includes('shopping')) {
      return 'google_shopping'
    }
    if (name.includes('display')) {
      return 'google_display'
    }
  }
  
  // Default to search for Google campaigns
  return 'google_search'
}

/**
 * Get the channel for any provider's campaign
 * @param provider The ad platform provider
 * @param campaign Campaign data
 * @returns The channel string
 */
export function getChannel(provider: string, campaign: any): string {
  switch (provider.toLowerCase()) {
    case 'meta':
      return getMetaChannel(campaign)
    case 'google':
      return getGoogleChannel(campaign)
    case 'tiktok':
      return 'tiktok' // TikTok doesn't have multiple channels like Meta/Google
    default:
      return provider.toLowerCase()
  }
}

/**
 * Get display name for a channel
 * @param channel The channel identifier
 * @returns Human-readable channel name
 */
export function getChannelDisplayName(channel: string): string {
  const channelNames: Record<string, string> = {
    'facebook': 'Facebook',
    'instagram': 'Instagram',
    'google_search': 'Google Search',
    'google_display': 'Google Display',
    'google_shopping': 'Google Shopping',
    'youtube': 'YouTube',
    'performance_max': 'Performance Max',
    'tiktok': 'TikTok',
  }
  
  return channelNames[channel] || channel
}

/**
 * Get the platform for a given channel
 * @param channel The channel identifier
 * @returns The platform (meta, google, tiktok)
 */
export function getPlatformFromChannel(channel: string): string {
  if (['facebook', 'instagram'].includes(channel)) {
    return 'meta'
  }
  if (['google_search', 'google_display', 'google_shopping', 'youtube', 'performance_max'].includes(channel)) {
    return 'google'
  }
  if (channel === 'tiktok') {
    return 'tiktok'
  }
  return channel
}