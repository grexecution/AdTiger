#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAds() {
  // Count ads
  const adCount = await prisma.ad.count()
  console.log(`Total ads in database: ${adCount}`)
  
  // Get a sample of ads
  const ads = await prisma.ad.findMany({
    take: 5,
    include: {
      adGroup: {
        include: {
          campaign: true
        }
      }
    }
  })
  
  console.log('\nSample ads:')
  ads.forEach(ad => {
    console.log(`- ${ad.name} (${ad.status}) in ${ad.adGroup.name} → ${ad.adGroup.campaign.name}`)
  })
  
  // Check campaigns with ad groups and ads
  const campaigns = await prisma.campaign.findMany({
    include: {
      adGroups: {
        include: {
          ads: true
        }
      }
    }
  })
  
  console.log('\nCampaign structure:')
  campaigns.forEach(campaign => {
    console.log(`\n${campaign.name}:`)
    campaign.adGroups.forEach(adGroup => {
      console.log(`  - ${adGroup.name}: ${adGroup.ads.length} ads`)
      adGroup.ads.forEach(ad => {
        console.log(`    • ${ad.name} (${ad.status})`)
      })
    })
  })
  
  await prisma.$disconnect()
}

checkAds()