import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find the Dein Zahnarzt ad
  const ad = await prisma.ad.findFirst({
    where: {
      name: 'Dein Zahnarzt'
    },
    select: {
      id: true,
      name: true,
      metadata: true
    }
  })
  
  if (ad) {
    console.log('Ad Name:', ad.name)
    const metadata = ad.metadata as any
    if (metadata?.comments) {
      console.log('Comments found:', metadata.comments.length, 'comments')
      console.log('Comments structure:')
      metadata.comments.forEach((comment: any, idx: number) => {
        console.log(`Comment ${idx + 1}:`)
        console.log('  - User:', comment.from?.name || 'Unknown')
        console.log('  - Message:', comment.message)
        console.log('  - Likes:', comment.like_count)
        if (comment.comments?.data) {
          console.log('  - Replies:', comment.comments.data.length)
        }
      })
    } else {
      console.log('No comments in metadata')
      console.log('Metadata keys:', Object.keys(metadata || {}))
    }
  } else {
    console.log('Ad "Dein Zahnarzt" not found')
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
  })