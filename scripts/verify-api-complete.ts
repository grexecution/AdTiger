import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyAPIData() {
  try {
    // Get user
    const user = await prisma.user.findFirst({
      include: { account: true }
    })
    
    if (!user) {
      console.log('No user found')
      return
    }
    
    // Get campaigns exactly like the API does
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
    
    console.log(`\n✅ Found ${campaigns.length} campaigns\n`)
    
    // Check campaigns with ads
    const campaignsWithAds = campaigns.filter(c => 
      c.adGroups.some(ag => ag.ads.length > 0)
    )
    
    console.log(`✅ ${campaignsWithAds.length} campaigns have ads\n`)
    
    // Check ads with complete data
    let totalAds = 0
    let adsWithImages = 0
    let adsWithMetrics = 0
    let adsWithCreative = 0
    
    for (const campaign of campaignsWithAds) {
      for (const adGroup of campaign.adGroups) {
        for (const ad of adGroup.ads) {
          totalAds++
          
          const creative = ad.creative as any
          const metadata = ad.metadata as any
          const insights = metadata?.insights
          
          // Check for creative
          if (creative && Object.keys(creative).length > 0) {
            adsWithCreative++
          }
          
          // Check for images
          const hasImage = creative?.asset_feed_spec?.images?.[0]?.url || 
                         creative?.asset_feed_spec?.images?.[0]?.hash ||
                         creative?.image_url || 
                         creative?.image_hash ||
                         creative?.object_story_spec?.link_data?.picture
          
          if (hasImage) {
            adsWithImages++
          }
          
          // Check for metrics
          if (insights && (insights.impressions > 0 || insights.clicks > 0 || insights.spend > 0)) {
            adsWithMetrics++
          }
        }
      }
    }
    
    console.log('📊 Data Completeness Report:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Total ads: ${totalAds}`)
    console.log(`✅ Ads with creative data: ${adsWithCreative} (${Math.round(adsWithCreative/totalAds * 100)}%)`)
    console.log(`✅ Ads with images: ${adsWithImages} (${Math.round(adsWithImages/totalAds * 100)}%)`)
    console.log(`✅ Ads with metrics: ${adsWithMetrics} (${Math.round(adsWithMetrics/totalAds * 100)}%)`)
    
    if (adsWithImages < totalAds * 0.9) {
      console.log('\n⚠️  WARNING: Less than 90% of ads have images!')
      console.log('This might indicate a problem with image fetching in the sync.')
    }
    
    if (adsWithMetrics < totalAds * 0.8) {
      console.log('\n⚠️  WARNING: Less than 80% of ads have metrics!')
      console.log('This might indicate incomplete insights sync.')
    }
    
    // Sample some ads without images
    if (adsWithImages < totalAds) {
      console.log('\n🔍 Sampling ads without images:')
      let sampled = 0
      for (const campaign of campaignsWithAds) {
        for (const adGroup of campaign.adGroups) {
          for (const ad of adGroup.ads) {
            const creative = ad.creative as any
            const hasImage = creative?.asset_feed_spec?.images?.[0]?.url || 
                           creative?.asset_feed_spec?.images?.[0]?.hash ||
                           creative?.image_url || 
                           creative?.image_hash ||
                           creative?.object_story_spec?.link_data?.picture
            
            if (!hasImage && sampled < 3) {
              console.log(`\n  Ad: ${ad.name}`)
              console.log(`  Has creative: ${!!creative}`)
              console.log(`  Creative keys: ${creative ? Object.keys(creative).join(', ') : 'none'}`)
              sampled++
            }
          }
        }
      }
    }
    
    // Check historical data
    const changeHistory = await prisma.changeHistory.count({
      where: {
        accountId: user.accountId || undefined,
        entityType: 'ad'
      }
    })
    
    console.log(`\n📈 Historical Tracking:`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`Total change history entries: ${changeHistory}`)
    
    if (changeHistory > 0) {
      console.log('✅ Historical tracking is working!')
    } else {
      console.log('⚠️  No historical data yet - run sync multiple times to build history')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyAPIData()