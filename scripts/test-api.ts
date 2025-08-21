#!/usr/bin/env npx tsx

async function testAPI() {
  try {
    // First get campaigns
    const response = await fetch('http://localhost:3333/api/campaigns', {
      headers: {
        'Cookie': 'authjs.session-token=your-session-token' // This would need a real session
      }
    })
    
    if (!response.ok) {
      console.log('Response status:', response.status)
      const text = await response.text()
      console.log('Response:', text)
      return
    }
    
    const data = await response.json()
    console.log('Total campaigns:', data.campaigns?.length || 0)
    
    if (data.campaigns && data.campaigns.length > 0) {
      const firstCampaign = data.campaigns[0]
      console.log('\nFirst campaign:', firstCampaign.name)
      console.log('Ad Groups:', firstCampaign.adGroups?.length || 0)
      
      if (firstCampaign.adGroups && firstCampaign.adGroups.length > 0) {
        const firstAdGroup = firstCampaign.adGroups[0]
        console.log('\nFirst Ad Group:', firstAdGroup.name)
        console.log('Ads in this ad group:', firstAdGroup.ads?.length || 0)
        
        if (firstAdGroup.ads && firstAdGroup.ads.length > 0) {
          console.log('Sample ads:')
          firstAdGroup.ads.forEach((ad: any) => {
            console.log(`  - ${ad.name} (${ad.status})`)
          })
        }
      }
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

testAPI()