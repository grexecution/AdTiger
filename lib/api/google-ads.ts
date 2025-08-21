/**
 * Google Ads API Client
 * 
 * This module provides a client for interacting with the Google Ads API.
 * It handles authentication, campaign data fetching, and data normalization.
 */

import { GoogleAuth } from 'google-auth-library';

// Google Ads API configuration
const GOOGLE_ADS_API_VERSION = 'v14';
const GOOGLE_ADS_API_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

// Google Ads API scopes
export const GOOGLE_ADS_SCOPES = [
  'https://www.googleapis.com/auth/adwords'
];

// Interface definitions
export interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  developerToken: string;
  customerId: string;
}

export interface GoogleCampaign {
  resourceName: string;
  id: string;
  name: string;
  status: string;
  advertisingChannelType: string;
  biddingStrategyType: string;
  campaignBudget: {
    amountMicros: string;
    deliveryMethod: string;
  };
  startDate?: string;
  endDate?: string;
}

export interface GoogleAdGroup {
  resourceName: string;
  id: string;
  name: string;
  status: string;
  campaign: string;
  type: string;
  cpcBidMicros?: string;
}

export interface GoogleAd {
  resourceName: string;
  id: string;
  status: string;
  adGroup: string;
  type: string;
  finalUrls: string[];
  displayUrl?: string;
  expandedTextAd?: any;
  responsiveSearchAd?: any;
  videoAd?: any;
  displayAd?: any;
}

export interface GoogleMetrics {
  impressions: string;
  clicks: string;
  cost_micros: string;
  ctr: string;
  average_cpc: string;
  conversions: string;
  conversion_value: string;
  view_through_conversions: string;
  video_views?: string;
  video_quartile_p25_rate?: string;
  video_quartile_p50_rate?: string;
  video_quartile_p75_rate?: string;
  video_quartile_p100_rate?: string;
}

export class GoogleAdsApiClient {
  private auth: GoogleAuth;
  private config: GoogleAdsConfig;

  constructor(config: GoogleAdsConfig) {
    this.config = config;
    this.auth = new GoogleAuth({
      credentials: {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
      },
      scopes: GOOGLE_ADS_SCOPES,
    });
  }

  /**
   * Get authenticated HTTP headers for API requests
   */
  private async getHeaders(): Promise<Record<string, string>> {
    const authClient = await this.auth.getClient();
    const accessToken = await authClient.getAccessToken();

    return {
      'Authorization': `Bearer ${accessToken.token}`,
      'developer-token': this.config.developerToken,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make a Google Ads API request
   */
  private async makeRequest(
    endpoint: string, 
    body: any, 
    customerId?: string
  ): Promise<any> {
    const customer = customerId || this.config.customerId;
    const url = `${GOOGLE_ADS_API_BASE_URL}/customers/${customer}/${endpoint}`;
    
    const headers = await this.getHeaders();
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google Ads API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    return response.json();
  }

  /**
   * Search for resources using Google Ads Query Language (GAQL)
   */
  async search(query: string, customerId?: string): Promise<any> {
    return this.makeRequest('googleAds:search', { query }, customerId);
  }

  /**
   * Get all accessible customer accounts
   */
  async getCustomers(): Promise<any[]> {
    try {
      const query = `
        SELECT 
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone,
          customer.test_account,
          customer.manager,
          customer.status
        FROM customer
        WHERE customer.status = 'ENABLED'
      `;
      
      const response = await this.search(query);
      return response.results || [];
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  /**
   * Get campaigns for a customer
   */
  async getCampaigns(customerId?: string): Promise<GoogleCampaign[]> {
    try {
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.bidding_strategy_type,
          campaign.campaign_budget,
          campaign.start_date,
          campaign.end_date,
          campaign.resource_name,
          campaign_budget.amount_micros,
          campaign_budget.delivery_method
        FROM campaign 
        WHERE campaign.status IN ('ENABLED', 'PAUSED')
        ORDER BY campaign.name
      `;
      
      const response = await this.search(query, customerId);
      return response.results?.map(this.normalizeCampaign) || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  /**
   * Get ad groups for a campaign
   */
  async getAdGroups(campaignId: string, customerId?: string): Promise<GoogleAdGroup[]> {
    try {
      const query = `
        SELECT 
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ad_group.campaign,
          ad_group.type,
          ad_group.cpc_bid_micros,
          ad_group.resource_name
        FROM ad_group 
        WHERE campaign.id = ${campaignId}
          AND ad_group.status IN ('ENABLED', 'PAUSED')
        ORDER BY ad_group.name
      `;
      
      const response = await this.search(query, customerId);
      return response.results?.map(this.normalizeAdGroup) || [];
    } catch (error) {
      console.error('Error fetching ad groups:', error);
      throw error;
    }
  }

  /**
   * Get ads for an ad group
   */
  async getAds(adGroupId: string, customerId?: string): Promise<GoogleAd[]> {
    try {
      const query = `
        SELECT 
          ad_group_ad.ad.id,
          ad_group_ad.status,
          ad_group_ad.ad_group,
          ad_group_ad.ad.type,
          ad_group_ad.ad.final_urls,
          ad_group_ad.ad.display_url,
          ad_group_ad.ad.expanded_text_ad,
          ad_group_ad.ad.responsive_search_ad,
          ad_group_ad.ad.video_ad,
          ad_group_ad.ad.image_ad,
          ad_group_ad.ad.resource_name
        FROM ad_group_ad 
        WHERE ad_group.id = ${adGroupId}
          AND ad_group_ad.status IN ('ENABLED', 'PAUSED')
        ORDER BY ad_group_ad.ad.id
      `;
      
      const response = await this.search(query, customerId);
      return response.results?.map(this.normalizeAd) || [];
    } catch (error) {
      console.error('Error fetching ads:', error);
      throw error;
    }
  }

  /**
   * Get campaign metrics
   */
  async getCampaignMetrics(
    campaignId: string, 
    dateFrom: string, 
    dateTo: string, 
    customerId?: string
  ): Promise<GoogleMetrics> {
    try {
      const query = `
        SELECT 
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions,
          metrics.conversion_value,
          metrics.view_through_conversions,
          metrics.video_views,
          metrics.video_quartile_p25_rate,
          metrics.video_quartile_p50_rate,
          metrics.video_quartile_p75_rate,
          metrics.video_quartile_p100_rate
        FROM campaign 
        WHERE campaign.id = ${campaignId}
          AND segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      `;
      
      const response = await this.search(query, customerId);
      return this.normalizeMetrics(response.results?.[0]?.metrics || {});
    } catch (error) {
      console.error('Error fetching campaign metrics:', error);
      throw error;
    }
  }

  /**
   * Get ad group metrics
   */
  async getAdGroupMetrics(
    adGroupId: string, 
    dateFrom: string, 
    dateTo: string, 
    customerId?: string
  ): Promise<GoogleMetrics> {
    try {
      const query = `
        SELECT 
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions,
          metrics.conversion_value
        FROM ad_group 
        WHERE ad_group.id = ${adGroupId}
          AND segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      `;
      
      const response = await this.search(query, customerId);
      return this.normalizeMetrics(response.results?.[0]?.metrics || {});
    } catch (error) {
      console.error('Error fetching ad group metrics:', error);
      throw error;
    }
  }

  /**
   * Normalize campaign data from Google Ads API response
   */
  private normalizeCampaign(item: any): GoogleCampaign {
    const campaign = item.campaign;
    const campaignBudget = item.campaignBudget;
    
    return {
      resourceName: campaign.resourceName,
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      advertisingChannelType: campaign.advertisingChannelType,
      biddingStrategyType: campaign.biddingStrategyType,
      campaignBudget: {
        amountMicros: campaignBudget?.amountMicros || '0',
        deliveryMethod: campaignBudget?.deliveryMethod || 'STANDARD',
      },
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    };
  }

  /**
   * Normalize ad group data from Google Ads API response
   */
  private normalizeAdGroup(item: any): GoogleAdGroup {
    const adGroup = item.adGroup;
    
    return {
      resourceName: adGroup.resourceName,
      id: adGroup.id,
      name: adGroup.name,
      status: adGroup.status,
      campaign: adGroup.campaign,
      type: adGroup.type,
      cpcBidMicros: adGroup.cpcBidMicros,
    };
  }

  /**
   * Normalize ad data from Google Ads API response
   */
  private normalizeAd(item: any): GoogleAd {
    const adGroupAd = item.adGroupAd;
    const ad = adGroupAd.ad;
    
    return {
      resourceName: ad.resourceName,
      id: ad.id,
      status: adGroupAd.status,
      adGroup: adGroupAd.adGroup,
      type: ad.type,
      finalUrls: ad.finalUrls || [],
      displayUrl: ad.displayUrl,
      expandedTextAd: ad.expandedTextAd,
      responsiveSearchAd: ad.responsiveSearchAd,
      videoAd: ad.videoAd,
      displayAd: ad.imageAd,
    };
  }

  /**
   * Normalize metrics from Google Ads API response
   */
  private normalizeMetrics(metrics: any): GoogleMetrics {
    return {
      impressions: metrics.impressions || '0',
      clicks: metrics.clicks || '0',
      cost_micros: metrics.costMicros || '0',
      ctr: metrics.ctr || '0',
      average_cpc: metrics.averageCpc || '0',
      conversions: metrics.conversions || '0',
      conversion_value: metrics.conversionValue || '0',
      view_through_conversions: metrics.viewThroughConversions || '0',
      video_views: metrics.videoViews || '0',
      video_quartile_p25_rate: metrics.videoQuartileP25Rate || '0',
      video_quartile_p50_rate: metrics.videoQuartileP50Rate || '0',
      video_quartile_p75_rate: metrics.videoQuartileP75Rate || '0',
      video_quartile_p100_rate: metrics.videoQuartileP100Rate || '0',
    };
  }

  /**
   * Convert micros to actual currency amount (Google stores amounts in micros)
   */
  static microsToAmount(micros: string): number {
    return parseInt(micros) / 1000000;
  }

  /**
   * Get OAuth2 authorization URL for Google Ads
   */
  static getAuthorizationUrl(clientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_ADS_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ access_token: string; refresh_token: string }> {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }
}

export default GoogleAdsApiClient;