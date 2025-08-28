import { PrismaClient } from '@prisma/client'

async function checkSyncHistory() {
  const prisma = new PrismaClient()
  
  const history = await prisma.syncHistory.findMany({
    orderBy: { startedAt: 'desc' },
    take: 5
  })
  
  console.log('Recent sync history:')
  history.forEach(h => {
    console.log(`- ${h.startedAt.toISOString()}: ${h.provider} ${h.syncType} - ${h.status} (duration: ${h.duration}ms)`)
    if (h.metadata) {
      const meta = h.metadata as any
      if (meta.source) console.log(`  Source: ${meta.source}`)
      if (meta.accountsProcessed !== undefined) console.log(`  Accounts processed: ${meta.accountsProcessed}`)
      if (meta.successful !== undefined) console.log(`  Successful: ${meta.successful}, Failed: ${meta.failed}`)
    }
  })
  
  await prisma.$disconnect()
}

checkSyncHistory().catch(console.error)