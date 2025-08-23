#!/usr/bin/env npx tsx

import { prisma } from '@/lib/prisma'

async function checkImageUrls() {
  console.log('🔍 Checking image URLs in database...\n')
  
  const ads = await prisma.ad.findMany({
    where: {
      provider: 'meta'
    },
    take: 5
  })
  
  for (const ad of ads) {
    const creative = ad.creative as any
    console.log(`\n📌 Ad: ${ad.name}`)
    console.log(`  ID: ${ad.id}`)
    
    // Check for asset_feed_spec images
    if (creative?.asset_feed_spec?.images) {
      console.log(`  ✅ Images in asset_feed_spec: ${creative.asset_feed_spec.images.length}`)
      
      for (let i = 0; i < Math.min(2, creative.asset_feed_spec.images.length); i++) {
        const img = creative.asset_feed_spec.images[i]
        console.log(`\n  Image ${i + 1}:`)
        console.log(`    - Hash: ${img.hash || 'none'}`)
        console.log(`    - URL: ${img.url ? img.url.substring(0, 100) + '...' : 'MISSING'}`)
        console.log(`    - Has url_128: ${img.url_128 ? 'YES' : 'NO'}`)
        console.log(`    - Has permalink: ${img.permalink_url ? 'YES' : 'NO'}`)
      }
    } else {
      console.log(`  ❌ No asset_feed_spec images`)
    }
    
    // Check for direct image_url
    if (creative?.image_url) {
      console.log(`\n  Direct image_url: ${creative.image_url.substring(0, 100)}...`)
    }
    
    // Check metadata for stored URLs
    const metadata = ad.metadata as any
    if (metadata?.imageUrl) {
      console.log(`  Metadata imageUrl: ${metadata.imageUrl.substring(0, 100)}...`)
    }
    if (metadata?.allImageUrls?.length > 0) {
      console.log(`  Metadata has ${metadata.allImageUrls.length} stored image URLs`)
    }
  }
  
  // Count totals
  const totalAds = await prisma.ad.count({
    where: { provider: 'meta' }
  })
  
  const adsWithAssetFeedImages = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "Ad" 
    WHERE provider = 'meta' 
    AND creative->'asset_feed_spec'->'images'->0->>'url' IS NOT NULL
  ` as any[]
  
  const adsWithDirectImage = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "Ad" 
    WHERE provider = 'meta' 
    AND creative->>'image_url' IS NOT NULL
  ` as any[]
  
  console.log(`\n\n📊 Summary:`)
  console.log(`  Total Meta ads: ${totalAds}`)
  console.log(`  Ads with asset_feed_spec images: ${adsWithAssetFeedImages[0]?.count || 0}`)
  console.log(`  Ads with direct image_url: ${adsWithDirectImage[0]?.count || 0}`)
  
  await prisma.$disconnect()
}

checkImageUrls()