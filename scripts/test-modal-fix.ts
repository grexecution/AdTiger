import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testModalFix() {
  // Fetch campaigns with ads and creatives (like the API does now)
  const campaigns = await prisma.campaign.findMany({
    take: 1,
    include: {
      adGroups: {
        include: {
          ads: {
            take: 3
            // creative is a JSON field, automatically included
          }
        }
      }
    }
  })
  
  console.log('Testing modal fix - API now includes creative data:\n')
  
  for (const campaign of campaigns) {
    console.log(`Campaign: ${campaign.name}`)
    
    for (const adGroup of campaign.adGroups) {
      for (const ad of adGroup.ads) {
        console.log(`\n  Ad: ${ad.name}`)
        console.log(`  Has creative: ${ad.creative ? '✅ YES' : '❌ NO'}`)
        
        if (ad.creative) {
          const creative = ad.creative as any
          const hasPermalink = creative.asset_feed_spec?.images?.[0]?.permalink_url
          const hasUrl = creative.asset_feed_spec?.images?.[0]?.url
          
          console.log(`  Has permalink_url: ${hasPermalink ? '✅ YES' : '❌ NO'}`)
          console.log(`  Has regular url: ${hasUrl ? '✅ YES' : '❌ NO'}`)
          
          if (hasPermalink) {
            console.log(`  Permalink: ${hasPermalink.substring(0, 80)}...`)
          }
          
          // Test what the modal would use
          const imageUrl = creative.asset_feed_spec?.images?.[0]?.permalink_url || 
                           creative.asset_feed_spec?.images?.[0]?.url ||
                           'No URL found'
          
          console.log(`  Modal will use: ${imageUrl.substring(0, 80)}...`)
        }
      }
    }
  }
  
  await prisma.$disconnect()
}

testModalFix().catch(console.error)