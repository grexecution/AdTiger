import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper to detect changes between old and new data
function detectChanges(oldData: any, newData: any, fields: string[]): Array<{field: string, oldValue: any, newValue: any}> {
  const changes: Array<{field: string, oldValue: any, newValue: any}> = []
  
  for (const field of fields) {
    const oldValue = oldData?.[field]
    const newValue = newData?.[field]
    
    // Skip if both undefined/null
    if (oldValue === undefined && newValue === undefined) continue
    if (oldValue === null && newValue === null) continue
    
    // Check for actual change
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ field, oldValue, newValue })
    }
  }
  
  return changes
}

async function demonstrateHistoricalSync() {
  try {
    // Get a sample ad to demonstrate
    const ad = await prisma.ad.findFirst({
      where: {
        name: 'Mundhygiene'
      }
    })
    
    if (!ad) {
      console.log('Ad not found')
      return
    }
    
    const currentMetadata = ad.metadata as any
    const currentInsights = currentMetadata?.insights || {}
    
    console.log('Current ad state:')
    console.log('- Impressions:', currentInsights.impressions)
    console.log('- Clicks:', currentInsights.clicks)
    console.log('- Spend:', currentInsights.spend)
    
    // Simulate new data from API
    const newInsights = {
      ...currentInsights,
      impressions: (currentInsights.impressions || 0) + 10,
      clicks: (currentInsights.clicks || 0) + 2,
      spend: (currentInsights.spend || 0) + 0.5
    }
    
    // Detect changes
    const insightChanges = detectChanges(currentInsights, newInsights, ['impressions', 'clicks', 'spend', 'ctr', 'cpc'])
    
    if (insightChanges.length > 0) {
      console.log('\nDetected changes:')
      for (const change of insightChanges) {
        console.log(`- ${change.field}: ${change.oldValue} -> ${change.newValue}`)
        
        // Create history entry for each change
        await prisma.changeHistory.create({
          data: {
            accountId: ad.accountId,
            entityType: 'ad',
            entityId: ad.id,
            externalId: ad.externalId,
            provider: ad.provider,
            changeType: 'metric_update',
            fieldName: `insights.${change.field}`,
            oldValue: change.oldValue,
            newValue: change.newValue,
            adId: ad.id,
            detectedAt: new Date()
          }
        })
      }
      
      // Update ad with new data
      await prisma.ad.update({
        where: { id: ad.id },
        data: {
          metadata: {
            ...currentMetadata,
            insights: newInsights,
            lastSyncedAt: new Date().toISOString()
          }
        }
      })
      
      console.log('\n✅ Updated ad and created history entries')
    } else {
      console.log('\nNo changes detected - skipping update')
    }
    
    // Show history
    const history = await prisma.changeHistory.findMany({
      where: {
        adId: ad.id
      },
      orderBy: {
        detectedAt: 'desc'
      },
      take: 5
    })
    
    console.log('\nRecent history for this ad:')
    for (const entry of history) {
      console.log(`- ${entry.detectedAt.toISOString()}: ${entry.fieldName} changed from ${entry.oldValue} to ${entry.newValue}`)
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

demonstrateHistoricalSync()