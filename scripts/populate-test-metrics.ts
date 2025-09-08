#!/usr/bin/env tsx

// Script to populate test metrics for ads that don't have any
// Use this ONLY for testing - real data should come from sync

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function populateTestMetrics() {
  console.log('🔧 Populating test metrics for ads without data...\n')
  
  // Get ads without metrics
  const adsWithoutMetrics = await prisma.ad.findMany({
    where: {
      OR: [
        { metadata: { equals: null } },
        { metadata: { path: ['insights'], equals: null } }
      ]
    }
  })
  
  console.log(`Found ${adsWithoutMetrics.length} ads without metrics`)
  
  for (const ad of adsWithoutMetrics) {
    // Generate realistic test metrics
    const impressions = Math.floor(Math.random() * 10000) + 1000
    const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01))
    const spend = clicks * (Math.random() * 2 + 0.5)
    const ctr = (clicks / impressions) * 100
    const cpc = spend / clicks
    const cpm = (spend / impressions) * 1000
    
    const testMetrics = {
      impressions,
      clicks,
      spend: Math.round(spend * 100) / 100,
      ctr: Math.round(ctr * 100) / 100,
      cpc: Math.round(cpc * 100) / 100,
      cpm: Math.round(cpm * 100) / 100,
      likes: Math.floor(Math.random() * 50),
      comments: Math.floor(Math.random() * 20),
      shares: Math.floor(Math.random() * 10),
      conversions: Math.floor(Math.random() * 5),
      currency: 'EUR'
    }
    
    await prisma.ad.update({
      where: { id: ad.id },
      data: {
        metadata: {
          ...(ad.metadata as any || {}),
          insights: testMetrics
        }
      }
    })
    
    console.log(`✅ Updated ${ad.name} with test metrics`)
  }
  
  console.log('\n✅ Test metrics populated!')
  console.log('⚠️  Remember: This is test data. Run a real sync for production data.')
}

populateTestMetrics()
  .catch(console.error)
  .finally(() => prisma.$disconnect())