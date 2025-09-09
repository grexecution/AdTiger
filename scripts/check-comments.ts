import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const ad = await prisma.ad.findFirst({
    where: {
      metadata: {
        path: ['comments'],
        not: 'null'
      }
    },
    select: {
      id: true,
      name: true,
      metadata: true
    }
  })
  
  if (ad) {
    console.log('Found ad with comments:')
    console.log('Ad ID:', ad.id)
    console.log('Ad Name:', ad.name)
    const metadata = ad.metadata as any
    console.log('\nChecking different locations:')
    if (metadata.comments) console.log('✓ metadata.comments exists')
    if (metadata.rawData?.comments) console.log('✓ metadata.rawData.comments exists')
    if (metadata.insights?.comments_data) console.log('✓ metadata.insights.comments_data exists')
    
    // Show the actual comments data
    if (metadata.comments) {
      console.log('\nmetadata.comments:')
      console.log(JSON.stringify(metadata.comments, null, 2))
    }
    if (metadata.rawData?.comments) {
      console.log('\nmetadata.rawData.comments:')
      console.log(JSON.stringify(metadata.rawData.comments, null, 2))
    }
    if (metadata.insights?.comments_data) {
      console.log('\nmetadata.insights.comments_data:')
      console.log(JSON.stringify(metadata.insights.comments_data, null, 2))
    }
  } else {
    console.log('No ads found with comments')
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
  })