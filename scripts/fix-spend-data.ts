import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixSpendData() {
  console.log('Fixing spend data by multiplying by 100...\n')
  
  // Fix ads with incorrect spend data
  const adsToFix = await prisma.ad.findMany({
    where: {
      metadata: {
        path: ['insights', 'spend'],
        gt: 0
      }
    }
  })
  
  console.log(`Found ${adsToFix.length} ads to fix\n`)
  
  let fixedCount = 0
  for (const ad of adsToFix) {
    const metadata = ad.metadata as any
    if (metadata?.insights) {
      const oldSpend = metadata.insights.spend || 0
      const oldCpc = metadata.insights.cpc || 0
      const oldCpm = metadata.insights.cpm || 0
      
      // Multiply by 100 to correct the values
      metadata.insights.spend = oldSpend * 100
      metadata.insights.cpc = oldCpc * 100
      metadata.insights.cpm = oldCpm * 100
      
      await prisma.ad.update({
        where: { id: ad.id },
        data: { metadata }
      })
      
      if (ad.name?.includes('Zahnarzt')) {
        console.log(`Fixed "${ad.name}":`)
        console.log(`  Spend: ${oldSpend.toFixed(2)} → ${metadata.insights.spend.toFixed(2)}`)
        console.log(`  CPC: ${oldCpc.toFixed(4)} → ${metadata.insights.cpc.toFixed(2)}`)
        console.log(`  Clicks: ${metadata.insights.clicks}`)
        console.log(`  Calculated CPC: ${(metadata.insights.spend / metadata.insights.clicks).toFixed(2)}\n`)
      }
      
      fixedCount++
    }
  }
  
  console.log(`\n✅ Fixed ${fixedCount} ads`)
  
  // Also fix campaign insights
  const campaignsToFix = await prisma.campaign.findMany({
    where: {
      metadata: {
        path: ['insights', 'spend'],
        gt: 0
      }
    }
  })
  
  console.log(`\nFound ${campaignsToFix.length} campaigns to fix`)
  
  let campaignFixedCount = 0
  for (const campaign of campaignsToFix) {
    const metadata = campaign.metadata as any
    if (metadata?.insights) {
      metadata.insights.spend = (metadata.insights.spend || 0) * 100
      metadata.insights.cpc = (metadata.insights.cpc || 0) * 100
      metadata.insights.cpm = (metadata.insights.cpm || 0) * 100
      
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { metadata }
      })
      
      campaignFixedCount++
    }
  }
  
  console.log(`✅ Fixed ${campaignFixedCount} campaigns`)
  
  // Also fix adGroups
  const adGroupsToFix = await prisma.adGroup.findMany({
    where: {
      metadata: {
        path: ['insights', 'spend'],
        gt: 0
      }
    }
  })
  
  console.log(`\nFound ${adGroupsToFix.length} ad groups to fix`)
  
  let adGroupFixedCount = 0
  for (const adGroup of adGroupsToFix) {
    const metadata = adGroup.metadata as any
    if (metadata?.insights) {
      metadata.insights.spend = (metadata.insights.spend || 0) * 100
      metadata.insights.cpc = (metadata.insights.cpc || 0) * 100
      metadata.insights.cpm = (metadata.insights.cpm || 0) * 100
      
      await prisma.adGroup.update({
        where: { id: adGroup.id },
        data: { metadata }
      })
      
      adGroupFixedCount++
    }
  }
  
  console.log(`✅ Fixed ${adGroupFixedCount} ad groups`)
  
  console.log('\n🎉 All spend data has been corrected!')
}

fixSpendData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())