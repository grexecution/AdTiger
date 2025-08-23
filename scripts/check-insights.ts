#!/usr/bin/env npx tsx

import { prisma } from '@/lib/prisma'

async function checkInsights() {
  console.log('📊 Checking Insight table data...\n')
  
  try {
    // Count total insights
    const totalCount = await prisma.insight.count()
    console.log(`Total insights: ${totalCount}`)
    
    if (totalCount > 0) {
      // Get date range
      const insights = await prisma.insight.findMany({
        select: { date: true },
        orderBy: { date: 'asc' }
      })
      
      const earliest = insights[0]?.date
      const latest = insights[insights.length - 1]?.date
      
      console.log(`Date range: ${earliest?.toISOString().split('T')[0]} to ${latest?.toISOString().split('T')[0]}`)
      
      // Group by provider
      const providers = await prisma.insight.groupBy({
        by: ['provider'],
        _count: true
      })
      
      console.log('\nBreakdown by provider:')
      providers.forEach(p => {
        console.log(`  ${p.provider}: ${p._count} records`)
      })
      
      // Group by entity type
      const entityTypes = await prisma.insight.groupBy({
        by: ['entityType'],
        _count: true
      })
      
      console.log('\nBreakdown by entity type:')
      entityTypes.forEach(e => {
        console.log(`  ${e.entityType}: ${e._count} records`)
      })
      
      // Sample recent insights
      const recentInsights = await prisma.insight.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        include: {
          campaign: { select: { name: true } },
          ad: { select: { name: true } }
        }
      })
      
      console.log('\n📈 Recent insights:')
      recentInsights.forEach(insight => {
        const metrics = insight.metrics as any
        const entityName = insight.campaign?.name || insight.ad?.name || 'Unknown'
        console.log(`  ${insight.date.toISOString().split('T')[0]} - ${entityName}:`)
        console.log(`    Impressions: ${metrics.impressions || 0} | Clicks: ${metrics.clicks || 0} | Spend: $${metrics.spend?.toFixed(2) || 0}`)
      })
    } else {
      console.log('\n⚠️ No insights found in database!')
      console.log('This means historical data hasn\'t been synced yet.')
      console.log('\nTo populate insights:')
      console.log('1. Make sure you have an active Meta connection')
      console.log('2. Run: npx tsx scripts/fetch-historical-insights.ts')
      console.log('3. Or trigger a sync from the dashboard')
    }
    
  } catch (error) {
    console.error('❌ Error checking insights:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkInsights()