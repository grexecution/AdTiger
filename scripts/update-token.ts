import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FRESH_TOKEN = 'EAA1AhiZCl0uYBPflphty7rZA27lnyRrPHkTNPKggFj0iaiXiFNFnaFN6MWu4tTqu5WFgj9tnsZA6A57TWob3oVm93JdpTWFJBBZChgKJQyI01CqSDggZCxC4UgVmf4cdPakHg1MbYfuWiBV6QTamhzLPSC1DXJiePmwwmURFjLee74cVnRJhhcvcrSl6ZCbkLKM60Vi2vUhXW2T6w2esqRSJc1wToz8zPqFpvEdbB1yP8ZD'

async function updateToken() {
  const updated = await prisma.providerConnection.updateMany({
    where: {
      provider: 'meta',
      isActive: true
    },
    data: {
      accessToken: FRESH_TOKEN,
      updatedAt: new Date()
    }
  })
  
  console.log(`Updated ${updated.count} Meta connections with fresh token`)
  await prisma.$disconnect()
}

updateToken().catch(console.error)