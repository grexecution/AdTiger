import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSyncErrors() {
  const history = await prisma.syncHistory.findFirst({
    where: { status: 'FAILED' },
    orderBy: { startedAt: 'desc' }
  })
  
  console.log('Latest failed sync:')
  console.log('  Date:', history?.startedAt)
  console.log('  Error:', history?.errorMessage || 'No error message')
  console.log('  Category:', history?.errorCategory || 'N/A')
  console.log('  Campaigns synced:', history?.campaignsSync || 0)
  console.log('  Ads synced:', history?.adsSync || 0)
  
  await prisma.$disconnect()
}

checkSyncErrors().catch(console.error)