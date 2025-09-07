#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { getThumbnailUrl, getAllImageUrls, getAdFormat } from '../lib/utils/thumbnail-utils'
import { getCreativeImageUrl, getAllCreativeImageUrls, getCreativeFormat } from '../lib/utils/creative-utils'

const prisma = new PrismaClient()

async function testPlacementAndThumbnails() {
  try {
    console.log('🔍 Testing Placement and Thumbnail Extraction...\n')
    
    // Get some ads with their ad groups to test
    const ads = await prisma.ad.findMany({
      where: {
        provider: 'meta',
        creative: {
          not: null
        }
      },
      include: {
        adGroup: true
      },
      take: 5
    })
    
    if (ads.length === 0) {
      console.log('No Meta ads found. Please run a sync first.')
      return
    }
    
    console.log(`Found ${ads.length} ads to test\n`)
    
    for (const ad of ads) {
      console.log('━'.repeat(80))
      console.log(`\n📢 Ad: ${ad.name} (${ad.externalId})`)
      console.log(`Status: ${ad.status}`)
      
      // Test placement extraction
      const placementData = ad.adGroup?.metadata?.placementData as any || {}
      console.log('\n📍 Placements:')
      
      if (placementData.publisher_platforms?.length > 0) {
        console.log(`  Publisher Platforms: ${placementData.publisher_platforms.join(', ')}`)
      } else {
        console.log('  No publisher platforms found')
      }
      
      if (placementData.facebook_positions?.length > 0) {
        console.log(`  Facebook: ${placementData.facebook_positions.join(', ')}`)
      }
      
      if (placementData.instagram_positions?.length > 0) {
        console.log(`  Instagram: ${placementData.instagram_positions.join(', ')}`)
      }
      
      if (placementData.messenger_positions?.length > 0) {
        console.log(`  Messenger: ${placementData.messenger_positions.join(', ')}`)
      }
      
      if (placementData.audience_network_positions?.length > 0) {
        console.log(`  Audience Network: ${placementData.audience_network_positions.join(', ')}`)
      }
      
      // Test thumbnail extraction
      const creative = ad.creative as any
      if (creative) {
        console.log('\n🖼️  Creative Analysis:')
        
        // Test format detection
        const format1 = getAdFormat(creative)
        const format2 = getCreativeFormat(creative)
        console.log(`  Format (thumbnail-utils): ${format1}`)
        console.log(`  Format (creative-utils): ${format2}`)
        
        // Test thumbnail extraction
        const thumbnail1 = getThumbnailUrl(creative)
        const thumbnail2 = getCreativeImageUrl(creative, ad.externalId)
        console.log(`  Thumbnail (thumbnail-utils): ${thumbnail1 ? thumbnail1.substring(0, 100) + '...' : 'null'}`)
        console.log(`  Thumbnail (creative-utils): ${thumbnail2 ? thumbnail2.substring(0, 100) + '...' : 'null'}`)
        
        // Test all images extraction
        const allImages1 = getAllImageUrls(creative)
        const allImages2 = getAllCreativeImageUrls(creative)
        console.log(`  All Images (thumbnail-utils): ${allImages1.length} images found`)
        console.log(`  All Images (creative-utils): ${allImages2.length} images found`)
        
        // Show creative structure for debugging
        console.log('\n  Creative Structure:')
        if (creative.asset_feed_spec) {
          console.log('    - Has asset_feed_spec')
          if (creative.asset_feed_spec.images) {
            console.log(`      - ${creative.asset_feed_spec.images.length} images`)
          }
          if (creative.asset_feed_spec.videos) {
            console.log(`      - ${creative.asset_feed_spec.videos.length} videos`)
          }
        }
        if (creative.object_story_spec) {
          console.log('    - Has object_story_spec')
          if (creative.object_story_spec.link_data) {
            console.log('      - Has link_data')
          }
          if (creative.object_story_spec.video_data) {
            console.log('      - Has video_data')
          }
          if (creative.object_story_spec.photo_data) {
            console.log('      - Has photo_data')
          }
        }
        if (creative.image_url) {
          console.log('    - Has direct image_url')
        }
        if (creative.image_hash) {
          console.log('    - Has image_hash')
        }
        if (creative.thumbnail_url) {
          console.log('    - Has thumbnail_url')
        }
      } else {
        console.log('\n⚠️  No creative data found')
      }
    }
    
    console.log('\n' + '━'.repeat(80))
    console.log('\n✅ Test complete!')
    
  } catch (error) {
    console.error('Error testing placements and thumbnails:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPlacementAndThumbnails()