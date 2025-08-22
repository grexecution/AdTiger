import { prisma } from '../lib/prisma'

async function updateCurrency() {
  const accounts = await prisma.account.findMany()
  console.log('Found accounts:', accounts.length)
  
  if (accounts.length > 0) {
    const account = accounts[0]
    await prisma.account.update({
      where: { id: account.id },
      data: { currency: 'EUR' }
    })
    console.log('Updated account currency to EUR')
  }
  
  await prisma.$disconnect()
}

updateCurrency()