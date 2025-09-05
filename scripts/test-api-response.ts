async function testCampaignsAPI() {
  try {
    const response = await fetch('http://localhost:3333/api/campaigns')
    
    if (!response.ok) {
      console.error('API Error:', response.status)
      return
    }
    
    const data = await response.json()
    
    // Find a campaign with ads
    const campaignWithAds = data.campaigns?.find((c: any) => 
      c.adGroups?.some((ag: any) => ag.ads?.length > 0)
    )
    
    if (campaignWithAds) {
      console.log('Campaign:', campaignWithAds.name)
      console.log('Campaign metrics:', campaignWithAds.metrics)
      
      const adGroup = campaignWithAds.adGroups.find((ag: any) => ag.ads?.length > 0)
      if (adGroup && adGroup.ads[0]) {
        const ad = adGroup.ads[0]
        console.log('\nAd:', ad.name)
        console.log('Ad metadata:', ad.metadata)
        console.log('Ad metadata.insights:', ad.metadata?.insights)
        console.log('Ad creative:', ad.creative ? 'Present' : 'Missing')
        
        if (ad.creative?.asset_feed_spec?.images?.[0]) {
          console.log('First image URL:', ad.creative.asset_feed_spec.images[0].url)
        }
      }
    } else {
      console.log('No campaigns with ads found')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

testCampaignsAPI()