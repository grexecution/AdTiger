import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyData() {
  // Check a specific ad to see ALL its data
  const ad = await prisma.ad.findFirst({
    where: {
      name: 'Mundhygiene'
    },
    include: {
      adGroup: {
        include: {
          campaign: true
        }
      }
    }
  })
  
  if (!ad) {
    console.log('Ad not found')
    return
  }
  
  console.log('=== FULL AD DATA ===')
  console.log('Ad ID:', ad.id)
  console.log('Ad Name:', ad.name)
  console.log('Status:', ad.status)
  console.log('\n--- METADATA ---')
  console.log(JSON.stringify(ad.metadata, null, 2))
  console.log('\n--- CREATIVE ---')
  console.log(JSON.stringify(ad.creative, null, 2))
  console.log('\n--- CAMPAIGN ---')
  console.log('Campaign:', ad.adGroup?.campaign?.name)
  console.log('Campaign metadata:', JSON.stringify(ad.adGroup?.campaign?.metadata, null, 2))
  
  await prisma.$disconnect()
}

verifyData().catch(console.error)