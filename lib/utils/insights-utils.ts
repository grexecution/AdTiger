/**
 * Utility functions for processing Meta API insights data
 */

/**
 * Get empty insights object
 */
function getEmptyInsights(): Record<string, any> {
  return {
    impressions: 0,
    clicks: 0,
    spend: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    conversions: 0,
    purchaseRoas: 0,
    websitePurchaseRoas: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    videoViews: 0,
    inlineLinkClicks: 0,
    inlinePostEngagement: 0,
  }
}

/**
 * Extract engagement metrics from Meta API actions array
 * @param actions Array of action objects from Meta API
 * @returns Processed engagement metrics
 */
export function extractEngagementMetrics(actions?: any[]): {
  likes: number
  comments: number
  shares: number
  saves: number
  videoViews: number
} {
  const metrics = {
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    videoViews: 0,
  }
  
  if (!actions || !Array.isArray(actions)) {
    return metrics
  }
  
  actions.forEach(action => {
    switch (action.action_type) {
      case 'like':
      case 'post_reaction':
        metrics.likes += parseInt(action.value) || 0
        break
      case 'comment':
        metrics.comments += parseInt(action.value) || 0
        break
      case 'post':
      case 'share':
        metrics.shares += parseInt(action.value) || 0
        break
      case 'save':
      case 'onsite_conversion.post_save':
        metrics.saves += parseInt(action.value) || 0
        break
      case 'video_view':
        metrics.videoViews += parseInt(action.value) || 0
        break
    }
  })
  
  return metrics
}

/**
 * Process insights data from Meta API
 * @param insights Insights object from Meta API
 * @returns Processed metrics object
 */
export function processMetaInsights(insights?: any): Record<string, any> {
  // Handle both direct insights object and wrapped in data array
  let insightsData = insights
  
  // If insights is wrapped in a data array (Meta API response format)
  if (insights?.data && Array.isArray(insights.data)) {
    if (insights.data.length === 0) {
      return getEmptyInsights()
    }
    insightsData = insights.data[0]
  }
  
  // If no insights data at all
  if (!insightsData) {
    return getEmptyInsights()
  }
  
  const data = insightsData
  const engagement = extractEngagementMetrics(data.actions)
  
  return {
    // Basic metrics
    impressions: parseInt(data.impressions) || 0,
    clicks: parseInt(data.clicks) || 0,
    spend: parseFloat(data.spend) || 0,
    
    // Calculated metrics
    ctr: parseFloat(data.ctr) || 0,
    cpc: parseFloat(data.cpc) || 0,
    cpm: parseFloat(data.cpm) || 0,
    
    // Conversion metrics
    conversions: parseInt(data.conversions) || 0,
    purchaseRoas: data.purchase_roas ? parseFloat(data.purchase_roas[0]?.value || 0) : 0,
    websitePurchaseRoas: data.website_purchase_roas ? parseFloat(data.website_purchase_roas[0]?.value || 0) : 0,
    costPerConversion: parseFloat(data.cost_per_conversion) || 0,
    
    // Engagement metrics
    likes: engagement.likes,
    comments: engagement.comments,
    shares: engagement.shares,
    saves: engagement.saves,
    videoViews: engagement.videoViews,
    
    // Additional engagement
    inlineLinkClicks: parseInt(data.inline_link_clicks) || 0,
    inlinePostEngagement: parseInt(data.inline_post_engagement) || 0,
    
    // Raw data for reference
    rawActions: data.actions,
    rawInsights: data,
  }
}

/**
 * Calculate ROAS (Return on Ad Spend)
 * @param revenue Total revenue generated
 * @param spend Total ad spend
 * @returns ROAS value
 */
export function calculateROAS(revenue: number, spend: number): number {
  if (spend === 0) return 0
  return revenue / spend
}

/**
 * Format metrics for display
 * @param value The metric value
 * @param type The type of metric
 * @returns Formatted string
 */
export function formatMetric(value: number | undefined | null, type: 'currency' | 'percentage' | 'integer' | 'decimal'): string {
  if (value === undefined || value === null) {
    return type === 'currency' ? '$0' : '0'
  }
  
  switch (type) {
    case 'currency':
      return `$${value.toFixed(2)}`
    case 'percentage':
      return `${value.toFixed(2)}%`
    case 'integer':
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
    case 'decimal':
      return value.toFixed(2)
    default:
      return value.toString()
  }
}