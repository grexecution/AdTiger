import { PrismaClient } from '@prisma/client'
import { convertCurrency } from '@/lib/currency'

const prisma = new PrismaClient()

async function testSync() {
  try {
    // Get the Meta connection
    const connection = await prisma.connection.findFirst({
      where: {
        provider: 'meta',
        status: 'active'
      }
    })
    
    if (!connection) {
      console.error('No active Meta connection found')
      process.exit(1)
    }
    
    const credentials = connection.credentials as any
    const metadata = connection.metadata as any
    const accessToken = credentials?.accessToken || metadata?.accessToken
    
    if (!accessToken) {
      console.error('No access token found')
      process.exit(1)
    }
    
    // Get selected accounts
    let selectedAccountIds: string[] = []
    
    if (credentials?.selectedAccountIds) {
      selectedAccountIds = credentials.selectedAccountIds
    } else if (credentials?.selectedAccounts) {
      selectedAccountIds = credentials.selectedAccounts.map((acc: any) => 
        typeof acc === 'string' ? acc : acc.id
      )
    }
    
    console.log('Found', selectedAccountIds.length, 'accounts to sync')
    console.log('Token starts with:', accessToken.substring(0, 20))
    
    // Test fetching from first account
    if (selectedAccountIds.length > 0) {
      const accountId = selectedAccountIds[0]
      console.log('\nTesting account:', accountId)
      
      // Try to fetch campaigns
      const url = `https://graph.facebook.com/v21.0/${accountId}/campaigns?` + new URLSearchParams({
        access_token: accessToken,
        fields: 'id,name,status',
        limit: '5'
      })
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.error) {
        console.error('API Error:', data.error)
      } else if (data.data) {
        console.log('Found', data.data.length, 'campaigns')
        data.data.forEach((c: any) => {
          console.log(' -', c.name, '(', c.status, ')')
        })
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSync()