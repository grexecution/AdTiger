#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addTestPlacementData() {
  try {
    console.log('📍 Adding test placement data to ad groups...\n')
    
    // Get all Meta ad groups
    const adGroups = await prisma.adGroup.findMany({
      where: {
        provider: 'meta'
      }
    })
    
    console.log(`Found ${adGroups.length} ad groups to update\n`)
    
    // Different placement configurations for testing
    const placementConfigs = [
      {
        // Facebook & Instagram Feed
        publisher_platforms: ['facebook', 'instagram'],
        facebook_positions: ['feed'],
        instagram_positions: ['stream', 'explore'],
        messenger_positions: [],
        audience_network_positions: []
      },
      {
        // Stories across platforms
        publisher_platforms: ['facebook', 'instagram', 'messenger'],
        facebook_positions: ['feed', 'facebook_stories'],
        instagram_positions: ['stream', 'story', 'reels'],
        messenger_positions: ['messenger_stories'],
        audience_network_positions: []
      },
      {
        // Video placements
        publisher_platforms: ['facebook', 'instagram'],
        facebook_positions: ['feed', 'video_feeds', 'instream_video'],
        instagram_positions: ['stream', 'igtv'],
        messenger_positions: [],
        audience_network_positions: []
      },
      {
        // Broad placement
        publisher_platforms: ['facebook', 'instagram', 'messenger', 'audience_network'],
        facebook_positions: ['feed', 'right_hand_column', 'instant_article', 'marketplace'],
        instagram_positions: ['stream', 'story', 'explore', 'shop'],
        messenger_positions: ['messenger_inbox'],
        audience_network_positions: ['native', 'banner', 'interstitial']
      },
      {
        // Instagram focused
        publisher_platforms: ['instagram'],
        facebook_positions: [],
        instagram_positions: ['stream', 'story', 'reels', 'explore', 'profile_feed'],
        messenger_positions: [],
        audience_network_positions: []
      }
    ]
    
    // Update each ad group with test placement data
    for (let i = 0; i < adGroups.length; i++) {
      const adGroup = adGroups[i]
      const placementData = placementConfigs[i % placementConfigs.length]
      
      const currentMetadata = (adGroup.metadata as any) || {}
      
      await prisma.adGroup.update({
        where: { id: adGroup.id },
        data: {
          metadata: {
            ...currentMetadata,
            placementData
          }
        }
      })
      
      console.log(`✅ Updated ${adGroup.name || adGroup.externalId}`)
      console.log(`   Platforms: ${placementData.publisher_platforms.join(', ')}`)
      
      if (placementData.facebook_positions.length > 0) {
        console.log(`   Facebook: ${placementData.facebook_positions.join(', ')}`)
      }
      if (placementData.instagram_positions.length > 0) {
        console.log(`   Instagram: ${placementData.instagram_positions.join(', ')}`)
      }
      if (placementData.messenger_positions.length > 0) {
        console.log(`   Messenger: ${placementData.messenger_positions.join(', ')}`)
      }
      if (placementData.audience_network_positions.length > 0) {
        console.log(`   Audience Network: ${placementData.audience_network_positions.join(', ')}`)
      }
      console.log()
    }
    
    console.log('✅ Test placement data added successfully!')
    
  } catch (error) {
    console.error('Error adding test placement data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addTestPlacementData()