# AdFire Database Metrics Analysis Report

## Current State of Ad Metrics

Based on a comprehensive analysis of the database, I've found the following insights about what metrics are actually populated in the system.

### Summary of Findings

**Entities with Data:**
- 5 entities (campaigns) have non-zero metrics data
- 65 ads exist in the database but **none have insights data**
- Only campaign-level insights are currently populated

**Current Metrics Available (16 total):**
- ✅ **Basic Performance**: clicks, impressions, spend, ctr, cpc, cpm, conversions
- ✅ **Engagement**: likes, saves, shares, comments, inlineLinkClicks, inlinePostEngagement  
- ✅ **Video**: videoViews (basic count only)
- ✅ **Date Info**: dateStart, dateStop

### Missing Advanced Metrics

**Video Metrics:**
- ❌ video_p25_watched_actions (25% video completions)
- ❌ video_p50_watched_actions (50% video completions) 
- ❌ video_p75_watched_actions (75% video completions)
- ❌ video_p100_watched_actions (100% video completions)
- ❌ video_play_actions (video play starts)
- ❌ video_thruplay_watched_actions (ThruPlay completions)

**Quality Rankings:**
- ❌ quality_ranking
- ❌ engagement_rate_ranking  
- ❌ conversion_rate_ranking

**Advanced Engagement:**
- ❌ unique_clicks
- ❌ cost_per_unique_click
- ❌ unique_link_clicks_ctr
- ❌ landing_page_views
- ❌ post_engagements (structured format)
- ❌ post_reactions
- ❌ page_likes
- ❌ checkins

### Root Cause Analysis

The issue is in `/lib/jobs/sync-meta-insights.ts` (lines 167-186). The current sync only requests these basic fields:

```javascript
fields: [
  'impressions',
  'clicks', 
  'spend',
  'ctr',
  'cpm',
  'cpc',
  'conversions',
  'conversion_rate',
  'cost_per_conversion',
  'purchase_roas',
  'frequency',
  'reach',
  'account_id',
  'campaign_id',
  'adset_id',
  'ad_id',
  'date_start',
  'date_stop',
].join(',')
```

### Real-World Data Available

Looking at actual campaign data in the system:

**Campaign: "AT_Wien_Prospecting_Leads_[08-2025]"**
- Has rich engagement data: 16 likes, 2 saves, 2 shares, 9 video views
- 361 clicks, 6,319 impressions, €0.43 spend
- Strong performance: 5.71% CTR, €0.001 CPC

**Campaign: "Landingpage - Hochpreis Leadquelle"**  
- Minimal engagement: 1 like, 0 saves
- 21 clicks, 4,570 impressions, €0.96 spend
- Lower performance: 0.46% CTR, €0.046 CPC

### Ad-Level Data Gap

**Critical Issue**: While 65 ads exist with rich creative data (including Instagram permalinks, asset feeds, and image URLs), **none have insights data**. This means:

- No ad-level performance analysis possible
- Cannot identify top-performing creatives
- Missing creative fatigue detection
- No ad-specific optimization recommendations

### Recommendations for Enhanced Metrics

1. **Expand Meta API Fields** - Add these fields to the sync:
   ```javascript
   // Video metrics
   'video_p25_watched_actions',
   'video_p50_watched_actions', 
   'video_p75_watched_actions',
   'video_p100_watched_actions',
   'video_play_actions',
   
   // Quality rankings (when available)
   'quality_ranking',
   'engagement_rate_ranking',
   'conversion_rate_ranking',
   
   // Advanced engagement
   'unique_clicks',
   'cost_per_unique_click',
   'landing_page_views',
   'post_engagements',
   'post_reactions',
   
   // Actions breakdown
   'actions',
   'action_values'
   ```

2. **Add Ad-Level Insights Sync** - Currently missing from the sync process

3. **Enhanced Metrics Processing** - Handle complex fields like `actions` array and `post_engagements` object structure

4. **Historical Data Backfill** - Sync historical data for existing ads

### Implementation Priority

**High Priority:**
1. Add ad-level insights sync
2. Include video completion metrics 
3. Add actions breakdown for engagement analysis

**Medium Priority:**  
1. Quality rankings (may not be available for all accounts)
2. Unique metrics (clicks, reach)
3. Landing page views

**Low Priority:**
1. Advanced canvas/video metrics
2. Offline conversions  
3. Cross-device attribution

### Database Structure Assessment

The current database structure can handle the additional metrics well:
- `metrics` JSON field in `Insight` table can store any additional fields
- Ad metadata already contains rich creative information
- Proper relationships exist between campaigns → ad groups → ads

The main limitation is the sync process not requesting comprehensive metrics from Meta's API, not the database design.