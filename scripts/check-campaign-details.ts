import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCampaignDetails() {
  // Get a campaign with ads
  const campaign = await prisma.campaign.findFirst({
    where: {
      name: 'AT_Wien_Prospecting_Leads_[08-2025]'
    },
    include: {
      adGroups: {
        include: {
          ads: {
            take: 2
          }
        }
      }
    }
  })
  
  if (!campaign) {
    console.log('Campaign not found')
    return
  }
  
  console.log('Campaign:', campaign.name)
  console.log('  Status:', campaign.status)
  console.log('  Metadata insights:', (campaign.metadata as any)?.insights)
  
  campaign.adGroups.forEach(adGroup => {
    console.log('\nAdGroup:', adGroup.name)
    console.log('  Metadata insights:', (adGroup.metadata as any)?.insights)
    
    adGroup.ads.forEach(ad => {
      console.log('\n  Ad:', ad.name)
      const metadata = ad.metadata as any
      const creative = ad.creative as any
      
      console.log('    Metadata insights:', metadata?.insights)
      console.log('    Metadata imageUrl:', metadata?.imageUrl)
      console.log('    Creative:', {
        hasImageUrl: !!creative?.image_url,
        hasAssetFeedSpec: !!creative?.asset_feed_spec,
        hasObjectStorySpec: !!creative?.object_story_spec
      })
      
      if (creative?.asset_feed_spec?.images?.[0]) {
        console.log('    Asset feed image:', creative.asset_feed_spec.images[0])
      }
    })
  })
  
  await prisma.$disconnect()
}

checkCampaignDetails().catch(console.error)