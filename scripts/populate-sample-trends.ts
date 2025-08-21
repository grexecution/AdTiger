import { PrismaClient } from "@prisma/client"
import { PerformanceTrackingService } from "../services/performance-tracking"
import { subDays } from "date-fns"

const prisma = new PrismaClient()

async function populateSampleTrends() {
  try {
    console.log("Populating sample historical trends...")
    
    const performanceTracker = new PerformanceTrackingService(prisma)
    
    // Get first account and campaign
    const account = await prisma.account.findFirst()
    if (!account) {
      console.log("No accounts found")
      return
    }
    
    const campaigns = await prisma.campaign.findMany({
      where: { accountId: account.id },
      take: 2 // Only process first 2 campaigns for demo
    })
    
    console.log(`Processing ${campaigns.length} campaigns for demo data...`)
    
    for (const campaign of campaigns) {
      console.log(`\nGenerating 30 days of data for: ${campaign.name}`)
      
      // Generate last 30 days of data
      for (let i = 30; i >= 0; i--) {
        const date = subDays(new Date(), i)
        
        // Generate realistic metrics with some variation
        const baseMetrics = {
          spend: 800 + Math.random() * 400,
          impressions: 50000 + Math.floor(Math.random() * 50000),
          clicks: 800 + Math.floor(Math.random() * 800),
          conversions: 30 + Math.floor(Math.random() * 50),
          revenue: 2000 + Math.random() * 3000
        }
        
        const metrics = {
          ...baseMetrics,
          ctr: (baseMetrics.clicks / baseMetrics.impressions) * 100,
          cpc: baseMetrics.spend / baseMetrics.clicks,
          cpm: (baseMetrics.spend / baseMetrics.impressions) * 1000,
          cvr: (baseMetrics.conversions / baseMetrics.clicks) * 100,
          roas: baseMetrics.revenue / baseMetrics.spend
        }
        
        // Store performance data
        await performanceTracker.storePerformanceData(
          account.id,
          'campaign',
          campaign.id,
          campaign.provider,
          date,
          metrics
        )
        
        process.stdout.write('.')
      }
      
      // Create snapshots
      await performanceTracker.createSnapshot(
        account.id,
        'campaign',
        campaign.id,
        campaign.provider,
        'weekly'
      )
      
      await performanceTracker.createSnapshot(
        account.id,
        'campaign',
        campaign.id,
        campaign.provider,
        'monthly'
      )
      
      console.log(' ✓')
    }
    
    // Show summary
    const insightCount = await prisma.insight.count()
    const trendCount = await prisma.performanceTrend.count()
    const snapshotCount = await prisma.performanceSnapshot.count()
    
    console.log("\n✅ Sample data populated successfully!")
    console.log("\nSummary:")
    console.log(`  Total insights: ${insightCount}`)
    console.log(`  Total trends: ${trendCount}`)
    console.log(`  Total snapshots: ${snapshotCount}`)
    
  } catch (error) {
    console.error("Error populating sample trends:", error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
populateSampleTrends()