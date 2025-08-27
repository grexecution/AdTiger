#!/usr/bin/env npx tsx

import { prisma } from '@/lib/prisma'

async function checkZahnwohlConversions() {
  console.log('🦷 Checking Zahnwohl Penzing Conversion Data...\n')
  
  try {
    // Search for Zahnwohl/Penzing/Zahnarzt related campaigns and ads
    const campaigns = await prisma.campaign.findMany({
      where: {
        OR: [
          { name: { contains: 'Zahnwohl', mode: 'insensitive' } },
          { name: { contains: 'Penzing', mode: 'insensitive' } },
          { name: { contains: 'Zahnarzt', mode: 'insensitive' } },
          { name: { contains: 'Wien', mode: 'insensitive' } },
          { name: { contains: 'AT_Wien', mode: 'insensitive' } }
        ]
      },
      include: {
        adGroups: {
          include: {
            ads: true
          }
        }
      }
    })
    
    console.log(`Found ${campaigns.length} related campaigns\n`)
    
    // Check each campaign
    for (const campaign of campaigns) {
      console.log(`\n📊 Campaign: ${campaign.name}`)
      console.log(`Provider: ${campaign.provider}`)
      console.log(`Status: ${campaign.status}`)
      console.log(`External ID: ${campaign.externalId}`)
      
      const metadata = campaign.metadata as any
      if (metadata) {
        console.log('\n📈 Campaign Metadata:')
        console.log('Raw metadata keys:', Object.keys(metadata))
        
        if (metadata.insights) {
          console.log('\nInsights data:')
          const insights = metadata.insights
          console.log(`  Spend: €${insights.spend || 0}`)
          console.log(`  Impressions: ${insights.impressions || 0}`)
          console.log(`  Clicks: ${insights.clicks || 0}`)
          console.log(`  CTR: ${insights.ctr || 0}%`)
          
          // Check for conversions
          console.log('\n🎯 Conversion Metrics:')
          console.log(`  conversions: ${insights.conversions || 'NOT FOUND'}`)
          console.log(`  cost_per_conversion: ${insights.cost_per_conversion || 'NOT FOUND'}`)
          console.log(`  purchase_roas: ${insights.purchase_roas || 'NOT FOUND'}`)
          console.log(`  website_purchase_roas: ${insights.website_purchase_roas || 'NOT FOUND'}`)
          
          // Check for actions array
          if (insights.actions) {
            console.log('\n📋 Actions Array:')
            if (Array.isArray(insights.actions)) {
              insights.actions.forEach((action: any) => {
                console.log(`  ${action.action_type}: ${action.value}`)
              })
            } else {
              console.log('  Actions is not an array:', insights.actions)
            }
          }
          
          // Check for rawActions
          if (insights.rawActions) {
            console.log('\n📋 Raw Actions:')
            if (Array.isArray(insights.rawActions)) {
              insights.rawActions.forEach((action: any) => {
                console.log(`  ${action.action_type}: ${action.value}`)
              })
            }
          }
          
          // Check all keys for conversion-related data
          console.log('\n🔍 All insight keys containing "conv" or "action":')
          Object.keys(insights).forEach(key => {
            if (key.toLowerCase().includes('conv') || key.toLowerCase().includes('action') || key.toLowerCase().includes('lead')) {
              console.log(`  ${key}: ${JSON.stringify(insights[key])}`)
            }
          })
        }
      }
      
      // Check ads for this campaign
      console.log(`\n📱 Checking ${campaign.adGroups.reduce((acc, ag) => acc + ag.ads.length, 0)} ads in this campaign:`)
      
      for (const adGroup of campaign.adGroups) {
        for (const ad of adGroup.ads) {
          if (ad.name.toLowerCase().includes('zahn') || ad.name.toLowerCase().includes('dein')) {
            console.log(`\n  Ad: ${ad.name}`)
            const adMetadata = ad.metadata as any
            if (adMetadata?.insights) {
              const insights = adMetadata.insights
              console.log(`    Clicks: ${insights.clicks || 0}`)
              console.log(`    Conversions: ${insights.conversions || 'NOT FOUND'}`)
              console.log(`    Actions: ${insights.actions ? JSON.stringify(insights.actions) : 'NOT FOUND'}`)
              console.log(`    Raw Actions: ${insights.rawActions ? JSON.stringify(insights.rawActions) : 'NOT FOUND'}`)
              
              // Check all conversion-related fields
              Object.keys(insights).forEach(key => {
                if (key.toLowerCase().includes('conv') || key.toLowerCase().includes('action') || key.toLowerCase().includes('lead') || key.toLowerCase().includes('result')) {
                  console.log(`    ${key}: ${JSON.stringify(insights[key])}`)
                }
              })
            }
          }
        }
      }
      
      console.log('\n' + '='.repeat(80))
    }
    
    // Also check Insights table
    console.log('\n\n📊 Checking Insights Table for Zahnwohl data...\n')
    
    const campaignIds = campaigns.map(c => c.id)
    const insights = await prisma.insight.findMany({
      where: {
        campaignId: {
          in: campaignIds
        }
      },
      take: 10,
      orderBy: {
        date: 'desc'
      }
    })
    
    console.log(`Found ${insights.length} insight records\n`)
    
    insights.forEach((insight, idx) => {
      console.log(`\nInsight ${idx + 1} (${insight.date.toISOString().split('T')[0]}):`)
      console.log(`Entity: ${insight.entityType} - ${insight.entityId}`)
      
      const metrics = insight.metrics as any
      console.log('Metrics keys:', Object.keys(metrics))
      
      // Check for conversion data
      if (Object.keys(metrics).length > 0) {
        console.log('Conversion-related metrics:')
        Object.keys(metrics).forEach(key => {
          if (key.toLowerCase().includes('conv') || key.toLowerCase().includes('action') || key.toLowerCase().includes('lead') || key.toLowerCase().includes('result')) {
            console.log(`  ${key}: ${JSON.stringify(metrics[key])}`)
          }
        })
      }
    })
    
  } catch (error) {
    console.error('❌ Error checking conversions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkZahnwohlConversions()