import { PrismaClient } from "@prisma/client"
import { MetaSyncService } from "../services/sync/meta-sync"
import { subDays } from "date-fns"

const prisma = new PrismaClient()

async function populateHistoricalData() {
  try {
    console.log("Starting historical data population...")
    
    // Get all accounts
    const accounts = await prisma.account.findMany()
    
    for (const account of accounts) {
      console.log(`Processing account ${account.id}...`)
      
      // Initialize sync service
      const metaSync = new MetaSyncService(prisma)
      
      // Get all campaigns for the account
      const campaigns = await prisma.campaign.findMany({
        where: { accountId: account.id },
        include: {
          adGroups: {
            include: {
              ads: true
            }
          }
        }
      })
      
      console.log(`Found ${campaigns.length} campaigns`)
      
      for (const campaign of campaigns) {
        console.log(`  Syncing insights for campaign: ${campaign.name}`)
        
        // Sync campaign insights for last 90 days
        await metaSync.syncInsights(
          account.id,
          'campaign',
          campaign.id,
          {
            start: subDays(new Date(), 90),
            end: new Date()
          }
        )
        
        // Sync insights for each ad group
        for (const adGroup of campaign.adGroups) {
          console.log(`    Syncing insights for ad group: ${adGroup.name}`)
          
          await metaSync.syncInsights(
            account.id,
            'ad_group',
            adGroup.id,
            {
              start: subDays(new Date(), 90),
              end: new Date()
            }
          )
          
          // Sync insights for each ad
          for (const ad of adGroup.ads) {
            console.log(`      Syncing insights for ad: ${ad.name}`)
            
            await metaSync.syncInsights(
              account.id,
              'ad',
              ad.id,
              {
                start: subDays(new Date(), 90),
                end: new Date()
              }
            )
          }
        }
      }
    }
    
    console.log("Historical data population completed!")
    
    // Show summary
    const insightCount = await prisma.insight.count()
    const trendCount = await prisma.performanceTrend.count()
    const snapshotCount = await prisma.performanceSnapshot.count()
    
    console.log("\nSummary:")
    console.log(`  Total insights: ${insightCount}`)
    console.log(`  Total trends: ${trendCount}`)
    console.log(`  Total snapshots: ${snapshotCount}`)
    
  } catch (error) {
    console.error("Error populating historical data:", error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
populateHistoricalData()