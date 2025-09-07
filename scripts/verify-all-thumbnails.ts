#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { getThumbnailUrl } from '../lib/utils/thumbnail-utils'
import { getCreativeImageUrl, getVideoThumbnailUrl, getCreativeFormat } from '../lib/utils/creative-utils'

const prisma = new PrismaClient()

async function verifyAllThumbnails() {
  try {
    console.log('🔍 Verifying all campaigns have thumbnails...\n')
    
    // Get all ads with their ad groups (which contain campaigns)
    const ads = await prisma.ad.findMany({
      where: {
        creative: {
          not: null
        }
      },
      include: {
        adGroup: {
          include: {
            campaign: true
          }
        }
      }
    })
    
    console.log(`Found ${ads.length} ads to verify\n`)
    
    let totalAds = 0
    let adsWithThumbnails = 0
    let adsByFormat: Record<string, number> = {}
    let adsWithThumbnailsByFormat: Record<string, number> = {}
    let missingThumbnails: any[] = []
    
    for (const ad of ads) {
      totalAds++
      const creative = ad.creative as any
      
      // Get format
      const format = getCreativeFormat(creative)
      adsByFormat[format] = (adsByFormat[format] || 0) + 1
      
      // Get thumbnail based on format
      let thumbnailUrl = null
      
      if (format === 'video') {
        // For video, try video thumbnail first, then fallback to general thumbnail
        thumbnailUrl = getVideoThumbnailUrl(creative) || getThumbnailUrl(creative) || getCreativeImageUrl(creative, ad.externalId)
      } else {
        // For all other formats (image, carousel, unknown)
        thumbnailUrl = getThumbnailUrl(creative) || getCreativeImageUrl(creative, ad.externalId)
      }
      
      if (thumbnailUrl) {
        adsWithThumbnails++
        adsWithThumbnailsByFormat[format] = (adsWithThumbnailsByFormat[format] || 0) + 1
      } else {
        missingThumbnails.push({
          adId: ad.externalId,
          adName: ad.name,
          campaignName: ad.adGroup?.campaign?.name,
          format,
          creative: {
            hasAssetFeedSpec: !!creative.asset_feed_spec,
            hasObjectStorySpec: !!creative.object_story_spec,
            hasImageUrl: !!creative.image_url,
            hasImageHash: !!creative.image_hash,
            hasThumbnailUrl: !!creative.thumbnail_url,
            hasVideoId: !!creative.video_id
          }
        })
      }
    }
    
    // Print summary
    console.log('━'.repeat(80))
    console.log('\n📊 SUMMARY\n')
    console.log(`Total ads: ${totalAds}`)
    console.log(`Ads with thumbnails: ${adsWithThumbnails} (${((adsWithThumbnails/totalAds)*100).toFixed(1)}%)`)
    console.log(`Missing thumbnails: ${totalAds - adsWithThumbnails}\n`)
    
    console.log('By Format:')
    for (const format of Object.keys(adsByFormat)) {
      const total = adsByFormat[format]
      const withThumb = adsWithThumbnailsByFormat[format] || 0
      const percentage = ((withThumb/total)*100).toFixed(1)
      console.log(`  ${format}: ${withThumb}/${total} (${percentage}%)`)
    }
    
    if (missingThumbnails.length > 0) {
      console.log('\n⚠️  ADS MISSING THUMBNAILS:\n')
      for (const missing of missingThumbnails.slice(0, 10)) { // Show first 10
        console.log(`Ad: ${missing.adName} (${missing.adId})`)
        console.log(`  Campaign: ${missing.campaignName}`)
        console.log(`  Format: ${missing.format}`)
        console.log(`  Creative structure:`)
        console.log(`    - Asset Feed Spec: ${missing.creative.hasAssetFeedSpec}`)
        console.log(`    - Object Story Spec: ${missing.creative.hasObjectStorySpec}`)
        console.log(`    - Image URL: ${missing.creative.hasImageUrl}`)
        console.log(`    - Image Hash: ${missing.creative.hasImageHash}`)
        console.log(`    - Thumbnail URL: ${missing.creative.hasThumbnailUrl}`)
        console.log(`    - Video ID: ${missing.creative.hasVideoId}`)
        console.log()
      }
      
      if (missingThumbnails.length > 10) {
        console.log(`... and ${missingThumbnails.length - 10} more ads missing thumbnails\n`)
      }
    }
    
    // Test fallback mechanism
    console.log('━'.repeat(80))
    console.log('\n🔧 TESTING FALLBACK MECHANISMS\n')
    
    // Pick a few different format ads to test
    const testCases = [
      ads.find(a => getCreativeFormat(a.creative as any) === 'video'),
      ads.find(a => getCreativeFormat(a.creative as any) === 'carousel'),
      ads.find(a => getCreativeFormat(a.creative as any) === 'image'),
      ads.find(a => getCreativeFormat(a.creative as any) === 'unknown')
    ].filter(Boolean)
    
    for (const testAd of testCases) {
      if (!testAd) continue
      
      const creative = testAd.creative as any
      const format = getCreativeFormat(creative)
      
      console.log(`Testing ${format} ad: ${testAd.name}`)
      
      // Try all methods
      const thumb1 = getThumbnailUrl(creative)
      const thumb2 = getCreativeImageUrl(creative, testAd.externalId)
      const thumb3 = format === 'video' ? getVideoThumbnailUrl(creative) : null
      
      console.log(`  getThumbnailUrl: ${thumb1 ? '✅' : '❌'} ${thumb1 ? thumb1.substring(0, 50) + '...' : 'null'}`)
      console.log(`  getCreativeImageUrl: ${thumb2 ? '✅' : '❌'} ${thumb2 ? thumb2.substring(0, 50) + '...' : 'null'}`)
      if (format === 'video') {
        console.log(`  getVideoThumbnailUrl: ${thumb3 ? '✅' : '❌'} ${thumb3 ? thumb3.substring(0, 50) + '...' : 'null'}`)
      }
      
      const finalThumb = thumb3 || thumb1 || thumb2
      console.log(`  Final thumbnail: ${finalThumb ? '✅' : '❌'}`)
      console.log()
    }
    
    console.log('━'.repeat(80))
    
    if (adsWithThumbnails === totalAds) {
      console.log('\n✅ SUCCESS: All ads have thumbnails!')
    } else {
      console.log(`\n⚠️  WARNING: ${totalAds - adsWithThumbnails} ads are missing thumbnails`)
      console.log('This might be due to:')
      console.log('  1. Ads without any creative assets')
      console.log('  2. Expired or invalid image URLs')
      console.log('  3. Missing creative data in the sync')
    }
    
  } catch (error) {
    console.error('Error verifying thumbnails:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyAllThumbnails()