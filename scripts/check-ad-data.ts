import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAdData() {
  // Count ads
  const adCount = await prisma.ad.count()
  console.log(`Total ads in database: ${adCount}\n`)
  
  // Get a few ads to check their data
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
  
  ads.forEach((ad: any) => {
    console.log(`Ad: ${ad.name}`)
    console.log(`  Status: ${ad.status}`)
    console.log(`  Campaign: ${ad.adGroup?.campaign?.name}`)
    
    const metadata = ad.metadata as any
    const insights = metadata?.insights || {}
    const creative = ad.creative as any
    
    console.log(`  Insights:`)
    console.log(`    Impressions: ${insights.impressions || 0}`)
    console.log(`    Clicks: ${insights.clicks || 0}`)
    console.log(`    CTR: ${insights.ctr || 0}%`)
    console.log(`    Spend: ${insights.spend || 0}`)
    console.log(`    CPC: ${insights.cpc || 0}`)
    
    console.log(`  Creative:`)
    console.log(`    Has image_url: ${!!creative?.image_url}`)
    console.log(`    Has image_hash: ${!!creative?.image_hash}`)
    console.log(`    Has asset_feed_spec: ${!!creative?.asset_feed_spec}`)
    
    const imageUrl = metadata?.imageUrl || creative?.image_url
    console.log(`  Image URL: ${imageUrl ? imageUrl.substring(0, 100) + '...' : 'None'}`)
    
    console.log('---\n')
  })
  
  await prisma.$disconnect()
}

checkAdData().catch(console.error)