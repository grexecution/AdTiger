#!/usr/bin/env npx tsx

/**
 * Test script to verify real data is being synced from Meta API
 */

import { prisma } from '@/lib/prisma'

async function testRealDataSync() {
  console.log('🔍 Checking for real data in database...\n')
  
  try {
    // Check campaigns
    const campaigns = await prisma.campaign.findMany({
      where: {
        provider: 'meta'
      },
      take: 3
    })
    
    console.log('📊 Campaigns with insights:')
    campaigns.forEach(campaign => {
      const insights = (campaign.metadata as any)?.insights
      console.log(`\n  Campaign: ${campaign.name}`)
      console.log(`  - Impressions: ${insights?.impressions || 'NO DATA'}`)
      console.log(`  - Clicks: ${insights?.clicks || 'NO DATA'}`)
      console.log(`  - CTR: ${insights?.ctr || 'NO DATA'}%`)
      console.log(`  - CPC: $${insights?.cpc || 'NO DATA'}`)
      console.log(`  - Likes: ${insights?.likes || 'NO DATA'}`)
      console.log(`  - Comments: ${insights?.comments || 'NO DATA'}`)
      console.log(`  - Shares: ${insights?.shares || 'NO DATA'}`)
    })
    
    // Check ads
    const ads = await prisma.ad.findMany({
      where: {
        provider: 'meta'
      },
      take: 3
    })
    
    console.log('\n\n🎯 Ads with insights and creatives:')
    ads.forEach(ad => {
      const insights = (ad.metadata as any)?.insights
      const creative = ad.creative as any
      
      console.log(`\n  Ad: ${ad.name}`)
      console.log(`  Insights:`)
      console.log(`  - Impressions: ${insights?.impressions || 'NO DATA'}`)
      console.log(`  - Clicks: ${insights?.clicks || 'NO DATA'}`)
      console.log(`  - CTR: ${insights?.ctr || 'NO DATA'}%`)
      console.log(`  - CPC: $${insights?.cpc || 'NO DATA'}`)
      console.log(`  - Likes: ${insights?.likes || 'NO DATA'}`)
      console.log(`  - Comments: ${insights?.comments || 'NO DATA'}`)
      console.log(`  - Shares: ${insights?.shares || 'NO DATA'}`)
      console.log(`  - ROAS: ${insights?.purchaseRoas || 'NO DATA'}`)
      
      console.log(`  Creative:`)
      console.log(`  - Title: ${creative?.title || 'NO DATA'}`)
      console.log(`  - Body: ${creative?.body?.substring(0, 50) || 'NO DATA'}...`)
      console.log(`  - Image URL: ${creative?.image_url ? 'YES' : 'NO DATA'}`)
      
      // Check for asset feed spec (multiple creatives)
      if (creative?.asset_feed_spec) {
        const spec = creative.asset_feed_spec
        console.log(`  Asset Feed Spec:`)
        console.log(`  - Images: ${spec.images?.length || 0} variations`)
        console.log(`  - Headlines: ${spec.titles?.length || 0} variations`)
        console.log(`  - Body texts: ${spec.bodies?.length || 0} variations`)
        console.log(`  - Descriptions: ${spec.descriptions?.length || 0} variations`)
        
        if (spec.images?.length > 0) {
          console.log(`  - First image URL: ${spec.images[0].url ? 'YES' : 'NO DATA'}`)
        }
      }
    })
    
    // Check for data freshness
    const latestAd = await prisma.ad.findFirst({
      where: {
        provider: 'meta'
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })
    
    if (latestAd) {
      const metadata = latestAd.metadata as any
      console.log(`\n\n📅 Data Freshness:`)
      console.log(`  Last sync: ${metadata?.lastSyncedAt || 'Unknown'}`)
      console.log(`  Latest ad updated: ${latestAd.updatedAt}`)
    }
    
    // Summary
    const totalAds = await prisma.ad.count({
      where: { provider: 'meta' }
    })
    
    const adsWithInsights = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "Ad" 
      WHERE provider = 'meta' 
      AND metadata::text LIKE '%insights%'
      AND metadata::text NOT LIKE '%"insights":{}%'
    ` as any[]
    
    const adsWithCreatives = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "Ad" 
      WHERE provider = 'meta' 
      AND creative IS NOT NULL
      AND creative::text != '{}'
    ` as any[]
    
    console.log(`\n\n📈 Summary:`)
    console.log(`  Total Meta ads: ${totalAds}`)
    console.log(`  Ads with insights data: ${adsWithInsights[0]?.count || 0}`)
    console.log(`  Ads with creative data: ${adsWithCreatives[0]?.count || 0}`)
    
    if (adsWithInsights[0]?.count === 0) {
      console.log('\n⚠️  WARNING: No ads have insights data! Run a sync to fetch real metrics.')
    }
    
    if (adsWithCreatives[0]?.count === 0) {
      console.log('\n⚠️  WARNING: No ads have creative data! Check the sync service.')
    }
    
  } catch (error) {
    console.error('❌ Error checking data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testRealDataSync()