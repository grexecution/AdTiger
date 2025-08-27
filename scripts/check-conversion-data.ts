#!/usr/bin/env npx tsx

import { prisma } from '@/lib/prisma'

async function checkConversionData() {
  console.log('🎯 Checking for Conversion Data in Ads...\n')
  
  try {
    // Get a few ads with their metadata
    const ads = await prisma.ad.findMany({
      take: 5,
      where: {
        metadata: {
          not: null
        }
      },
      include: {
        adGroup: {
          include: {
            campaign: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })
    
    console.log(`Found ${ads.length} ads with metadata\n`)
    
    ads.forEach((ad, index) => {
      console.log(`\n📊 Ad ${index + 1}: ${ad.name}`)
      console.log(`Campaign: ${ad.adGroup.campaign.name}`)
      console.log(`Provider: ${ad.provider}`)
      console.log(`Status: ${ad.status}`)
      
      const metadata = ad.metadata as any
      
      // Check for insights in metadata
      if (metadata?.insights) {
        console.log('\n📈 Performance Metrics:')
        const insights = metadata.insights
        console.log(`  Impressions: ${insights.impressions || 0}`)
        console.log(`  Clicks: ${insights.clicks || 0}`)
        console.log(`  CTR: ${insights.ctr || 0}%`)
        console.log(`  CPC: $${insights.cpc || 0}`)
        console.log(`  CPM: $${insights.cpm || 0}`)
        console.log(`  Spend: $${insights.spend || 0}`)
        
        // Check for conversion-related metrics
        console.log('\n🎯 Conversion Metrics:')
        console.log(`  Conversions: ${insights.conversions || insights.actions || 'Not available'}`)
        console.log(`  Conversion Value: ${insights.conversion_value || insights.action_values || 'Not available'}`)
        console.log(`  Cost per Conversion: ${insights.cost_per_conversion || insights.cost_per_action || 'Not available'}`)
        console.log(`  Conversion Rate: ${insights.conversion_rate || 'Not available'}`)
        console.log(`  ROAS: ${insights.roas || insights.purchase_roas || 'Not available'}`)
        
        // Check for specific action types
        if (insights.actions || insights.action_types) {
          console.log('\n📋 Action Breakdown:')
          const actions = insights.actions || insights.action_types
          if (Array.isArray(actions)) {
            actions.forEach((action: any) => {
              console.log(`  ${action.action_type || action.type}: ${action.value || action.count}`)
            })
          }
        }
        
        // Check for website conversions
        if (insights.website_conversions || insights.website_purchase_roas) {
          console.log('\n🛒 Website Conversions:')
          console.log(`  Website Conversions: ${insights.website_conversions || 'N/A'}`)
          console.log(`  Website Purchase ROAS: ${insights.website_purchase_roas || 'N/A'}`)
        }
      } else {
        console.log('\n⚠️ No insights data in metadata')
      }
      
      // Check for other conversion-related fields
      if (metadata?.objective) {
        console.log(`\n🎯 Campaign Objective: ${metadata.objective}`)
      }
      
      console.log('\n' + '-'.repeat(60))
    })
    
    // Check Insight table for conversion data
    console.log('\n\n📊 Checking Insight Table for Conversion Metrics...\n')
    
    const insightsWithConversions = await prisma.insight.findMany({
      take: 5,
      orderBy: {
        date: 'desc'
      }
    })
    
    insightsWithConversions.forEach((insight, index) => {
      console.log(`\nInsight ${index + 1} (${insight.date.toISOString().split('T')[0]}):`)
      console.log(`Entity: ${insight.entityType} - ${insight.entityId}`)
      
      const metrics = insight.metrics as any
      console.log('\nAvailable metrics:')
      Object.keys(metrics).forEach(key => {
        if (key.includes('conversion') || key.includes('action') || key.includes('roas') || key.includes('purchase')) {
          console.log(`  ${key}: ${metrics[key]}`)
        }
      })
    })
    
  } catch (error) {
    console.error('❌ Error checking conversion data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkConversionData()