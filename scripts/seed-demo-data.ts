import { prisma } from "@/lib/prisma"
import { SubscriptionTier } from "@prisma/client"

async function seedDemoData() {
  console.log("🌱 Seeding demo campaign data...")

  try {
    // Get the demo accounts
    const proAccount = await prisma.account.findFirst({
      where: { subscriptionTier: SubscriptionTier.PRO }
    })
    
    const freeAccount = await prisma.account.findFirst({
      where: { subscriptionTier: SubscriptionTier.FREE }
    })

    if (!proAccount || !freeAccount) {
      console.error("Demo accounts not found. Run seed-demo-users.ts first.")
      return
    }

    // Create provider connections
    const proMetaConnection = await prisma.providerConnection.upsert({
      where: {
        accountId_provider_externalAccountId: {
          accountId: proAccount.id,
          provider: "meta",
          externalAccountId: "meta-pro-account"
        }
      },
      update: {},
      create: {
        accountId: proAccount.id,
        provider: "meta",
        externalAccountId: "meta-pro-account",
        status: "CONNECTED",
        isActive: true,
      }
    })

    const freeMetaConnection = await prisma.providerConnection.upsert({
      where: {
        accountId_provider_externalAccountId: {
          accountId: freeAccount.id,
          provider: "meta",
          externalAccountId: "meta-free-account"
        }
      },
      update: {},
      create: {
        accountId: freeAccount.id,
        provider: "meta",
        externalAccountId: "meta-free-account",
        status: "CONNECTED",
        isActive: true,
      }
    })

    // Create ad accounts
    const proAdAccount = await prisma.adAccount.upsert({
      where: {
        accountId_provider_externalId: {
          accountId: proAccount.id,
          provider: "meta",
          externalId: "act_123456789"
        }
      },
      update: {},
      create: {
        accountId: proAccount.id,
        provider: "meta",
        externalId: "act_123456789",
        name: "Pro Company Ad Account",
        currency: "USD",
        timezone: "America/New_York",
        status: "ACTIVE"
      }
    })

    const freeAdAccount = await prisma.adAccount.upsert({
      where: {
        accountId_provider_externalId: {
          accountId: freeAccount.id,
          provider: "meta",
          externalId: "act_987654321"
        }
      },
      update: {},
      create: {
        accountId: freeAccount.id,
        provider: "meta",
        externalId: "act_987654321",
        name: "Free Company Ad Account",
        currency: "USD",
        timezone: "America/New_York",
        status: "ACTIVE"
      }
    })

    // Create campaigns for Pro account
    const proCampaign1 = await prisma.campaign.upsert({
      where: {
        accountId_provider_externalId: {
          accountId: proAccount.id,
          provider: "meta",
          externalId: "campaign_pro_1"
        }
      },
      update: {},
      create: {
        accountId: proAccount.id,
        adAccountId: proAdAccount.id,
        provider: "meta",
        channel: "facebook",
        externalId: "campaign_pro_1",
        name: "Summer Sale Campaign",
        status: "ACTIVE",
        objective: "CONVERSIONS",
        budgetAmount: 5000,
        budgetCurrency: "USD"
      }
    })

    const proCampaign2 = await prisma.campaign.upsert({
      where: {
        accountId_provider_externalId: {
          accountId: proAccount.id,
          provider: "meta",
          externalId: "campaign_pro_2"
        }
      },
      update: {},
      create: {
        accountId: proAccount.id,
        adAccountId: proAdAccount.id,
        provider: "meta",
        channel: "instagram",
        externalId: "campaign_pro_2",
        name: "Brand Awareness Push",
        status: "ACTIVE",
        objective: "BRAND_AWARENESS",
        budgetAmount: 3000,
        budgetCurrency: "USD"
      }
    })

    // Create campaigns for Free account
    const freeCampaign = await prisma.campaign.upsert({
      where: {
        accountId_provider_externalId: {
          accountId: freeAccount.id,
          provider: "meta",
          externalId: "campaign_free_1"
        }
      },
      update: {},
      create: {
        accountId: freeAccount.id,
        adAccountId: freeAdAccount.id,
        provider: "meta",
        channel: "facebook",
        externalId: "campaign_free_1",
        name: "Basic Traffic Campaign",
        status: "ACTIVE",
        objective: "LINK_CLICKS",
        budgetAmount: 500,
        budgetCurrency: "USD"
      }
    })

    // Create ad groups
    const proAdGroup1 = await prisma.adGroup.create({
      data: {
        accountId: proAccount.id,
        campaignId: proCampaign1.id,
        provider: "meta",
        channel: "facebook",
        externalId: "adset_pro_1",
        name: "Target Audience 18-35",
        status: "ACTIVE",
        budgetAmount: 2500,
        budgetCurrency: "USD"
      }
    })

    const proAdGroup2 = await prisma.adGroup.create({
      data: {
        accountId: proAccount.id,
        campaignId: proCampaign1.id,
        provider: "meta",
        channel: "facebook",
        externalId: "adset_pro_2",
        name: "Target Audience 35-50",
        status: "ACTIVE",
        budgetAmount: 2500,
        budgetCurrency: "USD"
      }
    })

    const freeAdGroup = await prisma.adGroup.create({
      data: {
        accountId: freeAccount.id,
        campaignId: freeCampaign.id,
        provider: "meta",
        channel: "facebook",
        externalId: "adset_free_1",
        name: "Broad Audience",
        status: "ACTIVE",
        budgetAmount: 500,
        budgetCurrency: "USD"
      }
    })

    // Create ads
    await prisma.ad.createMany({
      data: [
        {
          accountId: proAccount.id,
          adGroupId: proAdGroup1.id,
          provider: "meta",
          channel: "facebook",
          externalId: "ad_pro_1",
          name: "Summer Sale - Young Adults",
          status: "ACTIVE",
          creative: {
            headline: "50% Off Summer Collection",
            body: "Shop now and save big!",
            image_url: "https://example.com/image1.jpg"
          }
        },
        {
          accountId: proAccount.id,
          adGroupId: proAdGroup2.id,
          provider: "meta",
          channel: "facebook",
          externalId: "ad_pro_2",
          name: "Summer Sale - Professionals",
          status: "ACTIVE",
          creative: {
            headline: "Premium Summer Deals",
            body: "Exclusive offers for you",
            image_url: "https://example.com/image2.jpg"
          }
        },
        {
          accountId: freeAccount.id,
          adGroupId: freeAdGroup.id,
          provider: "meta",
          channel: "facebook",
          externalId: "ad_free_1",
          name: "Check Out Our Store",
          status: "ACTIVE",
          creative: {
            headline: "Visit Our Store",
            body: "Great products waiting for you",
            image_url: "https://example.com/image3.jpg"
          }
        }
      ]
    })

    // Create some insights
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    await prisma.insight.createMany({
      data: [
        {
          accountId: proAccount.id,
          provider: "meta",
          entityType: "campaign",
          entityId: proCampaign1.id,
          campaignId: proCampaign1.id,
          date: yesterday,
          window: "1d",
          metrics: {
            impressions: 15000,
            clicks: 450,
            spend: 125.50,
            conversions: 23,
            ctr: 3.0,
            cpc: 0.28,
            cpm: 8.37
          }
        },
        {
          accountId: proAccount.id,
          provider: "meta",
          entityType: "campaign",
          entityId: proCampaign2.id,
          campaignId: proCampaign2.id,
          date: yesterday,
          window: "1d",
          metrics: {
            impressions: 25000,
            clicks: 250,
            spend: 85.00,
            conversions: 5,
            ctr: 1.0,
            cpc: 0.34,
            cpm: 3.40
          }
        },
        {
          accountId: freeAccount.id,
          provider: "meta",
          entityType: "campaign",
          entityId: freeCampaign.id,
          campaignId: freeCampaign.id,
          date: yesterday,
          window: "1d",
          metrics: {
            impressions: 5000,
            clicks: 75,
            spend: 15.00,
            conversions: 2,
            ctr: 1.5,
            cpc: 0.20,
            cpm: 3.00
          }
        }
      ]
    })

    console.log("✅ Demo data created successfully!")
    console.log("Created:")
    console.log("- 2 Provider connections")
    console.log("- 2 Ad accounts")
    console.log("- 3 Campaigns")
    console.log("- 3 Ad groups")
    console.log("- 3 Ads")
    console.log("- 3 Insights")
    console.log("\nPro account has: 2 campaigns with full data")
    console.log("Free account has: 1 campaign with basic data")

  } catch (error) {
    console.error("❌ Error seeding demo data:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedDemoData()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })