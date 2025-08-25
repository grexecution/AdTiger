#!/usr/bin/env tsx
/**
 * Script to fix channel data in the database
 * Updates campaigns, ad groups, and ads to properly reflect their publisher platforms
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function fixChannels() {
  try {
    console.log("🔧 Fixing channel data in database...")
    
    // Get all Meta ads with their creative data
    const ads = await prisma.ad.findMany({
      where: {
        provider: "meta"
      },
      include: {
        adGroup: {
          include: {
            campaign: true
          }
        }
      }
    })
    
    console.log(`Found ${ads.length} Meta ads to process`)
    
    let updatedAds = 0
    let updatedAdGroups = 0
    let updatedCampaigns = 0
    
    // Track campaigns and adGroups we've already updated
    const updatedCampaignIds = new Set<string>()
    const updatedAdGroupIds = new Set<string>()
    
    for (const ad of ads) {
      // Extract publisher platforms from creative
      const creative = ad.creative as any
      let publisherPlatforms: string[] = []
      
      // Check multiple locations for publisher_platforms
      if (creative?.object_story_spec?.link_data?.publisher_platforms) {
        publisherPlatforms = creative.object_story_spec.link_data.publisher_platforms
      } else if (creative?.asset_feed_spec?.publisher_platforms) {
        publisherPlatforms = creative.asset_feed_spec.publisher_platforms
      } else if (ad.metadata && typeof ad.metadata === 'object') {
        const metadata = ad.metadata as any
        if (metadata?.rawData?.creative?.object_story_spec?.link_data?.publisher_platforms) {
          publisherPlatforms = metadata.rawData.creative.object_story_spec.link_data.publisher_platforms
        } else if (metadata?.rawData?.creative?.asset_feed_spec?.publisher_platforms) {
          publisherPlatforms = metadata.rawData.creative.asset_feed_spec.publisher_platforms
        }
      }
      
      // Determine primary channel based on publisher platforms
      let channel = 'facebook' // Default
      if (publisherPlatforms.length > 0) {
        // Priority: Instagram > Facebook > Messenger > Threads
        if (publisherPlatforms.includes('instagram')) {
          channel = 'instagram'
        } else if (publisherPlatforms.includes('facebook')) {
          channel = 'facebook'
        } else if (publisherPlatforms.includes('messenger')) {
          channel = 'messenger'
        } else if (publisherPlatforms.includes('threads')) {
          channel = 'threads'
        } else if (publisherPlatforms.includes('whatsapp')) {
          channel = 'whatsapp'
        }
      }
      
      // Update ad with correct channel and store publisher_platforms in metadata
      const currentMetadata = (ad.metadata || {}) as any
      await prisma.ad.update({
        where: { id: ad.id },
        data: {
          channel,
          metadata: {
            ...currentMetadata,
            publisherPlatforms
          }
        }
      })
      updatedAds++
      
      // Update adGroup if not already updated
      if (ad.adGroup && !updatedAdGroupIds.has(ad.adGroup.id)) {
        await prisma.adGroup.update({
          where: { id: ad.adGroup.id },
          data: { channel }
        })
        updatedAdGroupIds.add(ad.adGroup.id)
        updatedAdGroups++
      }
      
      // Update campaign if not already updated
      if (ad.adGroup?.campaign && !updatedCampaignIds.has(ad.adGroup.campaign.id)) {
        await prisma.campaign.update({
          where: { id: ad.adGroup.campaign.id },
          data: { channel }
        })
        updatedCampaignIds.add(ad.adGroup.campaign.id)
        updatedCampaigns++
      }
      
      if (updatedAds % 10 === 0) {
        console.log(`  Processed ${updatedAds}/${ads.length} ads...`)
      }
    }
    
    console.log("\n✅ Channel data fixed!")
    console.log(`  Updated ${updatedAds} ads`)
    console.log(`  Updated ${updatedAdGroups} ad groups`)
    console.log(`  Updated ${updatedCampaigns} campaigns`)
    
    // Now let's also check for any campaigns without ads and update them
    const campaignsWithoutAds = await prisma.campaign.findMany({
      where: {
        provider: "meta",
        adGroups: {
          none: {}
        }
      }
    })
    
    if (campaignsWithoutAds.length > 0) {
      console.log(`\nFound ${campaignsWithoutAds.length} campaigns without ads, setting to default channel`)
      for (const campaign of campaignsWithoutAds) {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { channel: 'facebook' }
        })
      }
    }
    
    console.log("\n🎉 All done!")
    
  } catch (error) {
    console.error("Error fixing channels:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixChannels()