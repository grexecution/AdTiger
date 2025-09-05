import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCampaignsAPI() {
  try {
    // Get user
    const user = await prisma.user.findFirst({
      include: { account: true }
    })
    
    if (!user) {
      console.log('No user found')
      return
    }
    
    // Get campaigns like the API does
    const campaigns = await prisma.campaign.findMany({
      where: {
        accountId: user.accountId || undefined
      },
      include: {
        adGroups: {
          include: {
            ads: {
              take: 10
            }
          }
        },
        insights: {
          where: {
            window: "day"
          },
          orderBy: {
            date: "desc"
          },
          take: 1
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    })
    
    console.log('Found', campaigns.length, 'campaigns')
    
    // Check first campaign with ads
    const campaignWithAds = campaigns.find(c => 
      c.adGroups.some(ag => ag.ads.length > 0)
    )
    
    if (campaignWithAds) {
      console.log('\nCampaign:', campaignWithAds.name)
      const campaignMetadata = campaignWithAds.metadata as any
      console.log('Campaign insights:', campaignMetadata?.insights)
      
      const adGroup = campaignWithAds.adGroups.find(ag => ag.ads.length > 0)
      if (adGroup && adGroup.ads[0]) {
        const ad = adGroup.ads[0]
        console.log('\nAd:', ad.name)
        const adMetadata = ad.metadata as any
        const creative = ad.creative as any
        
        console.log('Ad insights:', adMetadata?.insights)
        console.log('Has creative:', !!creative)
        console.log('Has asset_feed_spec:', !!creative?.asset_feed_spec)
        console.log('Has images:', !!creative?.asset_feed_spec?.images)
        
        if (creative?.asset_feed_spec?.images?.[0]) {
          console.log('First image:', {
            url: creative.asset_feed_spec.images[0].url?.substring(0, 50) + '...',
            hash: creative.asset_feed_spec.images[0].hash,
            hasUrl128: !!creative.asset_feed_spec.images[0].url_128
          })
        }
        
        // What the API would return
        const apiResponse = {
          id: ad.id,
          name: ad.name,
          status: ad.status,
          type: creative?.type || 'display',
          creative: ad.creative,
          metadata: ad.metadata
        }
        
        console.log('\nAPI would return:')
        console.log('- Has creative:', !!apiResponse.creative)
        console.log('- Has metadata:', !!apiResponse.metadata)
        console.log('- Metadata insights:', (apiResponse.metadata as any)?.insights ? 'Present' : 'Missing')
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCampaignsAPI()