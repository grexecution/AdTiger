import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
// Mock data for managed accounts - in production, fetch from Google Ads API
const mockManagedAccounts = [
  {
    id: 'acc_001',
    name: 'Main Brand - Search Campaigns',
    customerId: '1234567890',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    status: 'ENABLED',
    type: 'SEARCH',
    campaigns: 12,
    budget: 50000,
    enabled: true
  },
  {
    id: 'acc_002',
    name: 'E-Commerce - Shopping',
    customerId: '2345678901',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    status: 'ENABLED',
    type: 'SHOPPING',
    campaigns: 8,
    budget: 30000,
    enabled: true
  },
  {
    id: 'acc_003',
    name: 'Brand Awareness - YouTube',
    customerId: '3456789012',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    status: 'ENABLED',
    type: 'VIDEO',
    campaigns: 5,
    budget: 25000,
    enabled: false
  },
  {
    id: 'acc_004',
    name: 'Remarketing - Display',
    customerId: '4567890123',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    status: 'ENABLED',
    type: 'DISPLAY',
    campaigns: 6,
    budget: 15000,
    enabled: true
  },
  {
    id: 'acc_005',
    name: 'Test Account - All Types',
    customerId: '5678901234',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    status: 'PAUSED',
    type: 'SEARCH',
    campaigns: 2,
    budget: 1000,
    enabled: false
  },
  {
    id: 'acc_006',
    name: 'Partner Account - Search',
    customerId: '6789012345',
    currency: 'USD',
    timezone: 'America/New_York',
    status: 'ENABLED',
    type: 'SEARCH',
    campaigns: 15,
    budget: 75000,
    enabled: true
  },
  {
    id: 'acc_007',
    name: 'Seasonal Campaigns',
    customerId: '7890123456',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    status: 'PAUSED',
    type: 'SHOPPING',
    campaigns: 3,
    budget: 20000,
    enabled: false
  },
  {
    id: 'acc_008',
    name: 'Mobile App - UAC',
    customerId: '8901234567',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    status: 'ENABLED',
    type: 'VIDEO',
    campaigns: 4,
    budget: 10000,
    enabled: true
  }
]

export async function GET(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true },
    })

    if (!user?.accountId) {
      return NextResponse.json(
        { error: 'No account found' },
        { status: 400 }
      )
    }

    // Get the connection - check both 'google' and 'GOOGLE' providers
    const connection = await prisma.providerConnection.findFirst({
      where: {
        id: params.connectionId,
        accountId: user.accountId || "no-match",
        provider: {
          in: ['google', 'GOOGLE']
        }
      }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // Get enabled accounts from metadata
    const metadata = connection.metadata as any
    const enabledAccounts = metadata?.enabledAccounts || []

    // Mark accounts as enabled based on saved preferences
    const accountsWithStatus = mockManagedAccounts.map(account => ({
      ...account,
      enabled: enabledAccounts.includes(account.customerId)
    }))

    // In production, you would:
    // 1. Decrypt credentials from connection.metadata
    // 2. Use Google Ads API to fetch managed accounts
    // 3. Filter based on user's selection

    return NextResponse.json({
      accounts: accountsWithStatus,
      isManagerAccount: true,
      totalAccounts: accountsWithStatus.length,
      enabledCount: accountsWithStatus.filter(a => a.enabled).length
    })

  } catch (error) {
    console.error('Error fetching managed accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch managed accounts' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true },
    })

    if (!user?.accountId) {
      return NextResponse.json(
        { error: 'No account found' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { enabledAccounts } = body

    if (!Array.isArray(enabledAccounts)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Get the connection - check both 'google' and 'GOOGLE' providers
    const connection = await prisma.providerConnection.findFirst({
      where: {
        id: params.connectionId,
        accountId: user.accountId || "no-match",
        provider: {
          in: ['google', 'GOOGLE']
        }
      }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // Update metadata with enabled accounts
    const currentMetadata = (connection.metadata || {}) as any
    const updatedMetadata = {
      ...currentMetadata,
      enabledAccounts,
      isManagerAccount: true,
      lastUpdated: new Date().toISOString()
    }

    await prisma.providerConnection.update({
      where: { id: connection.id },
      data: {
        metadata: updatedMetadata
      }
    })

    // Create or update ad accounts for enabled accounts
    for (const accountId of enabledAccounts) {
      const account = mockManagedAccounts.find(a => a.customerId === accountId)
      if (account) {
        await prisma.adAccount.upsert({
          where: {
            accountId_provider_externalId: {
              accountId: user.accountId || "no-match",
              provider: 'google',
              externalId: account.customerId
            }
          },
          update: {
            name: account.name,
            currency: account.currency,
            timezone: account.timezone,
            status: account.status.toLowerCase(),
            metadata: {
              ...account,
              enabled: true,
              syncEnabled: true
            }
          },
          create: {
            accountId: user.accountId || "no-match",
            provider: 'google',
            externalId: account.customerId,
            name: account.name,
            currency: account.currency,
            timezone: account.timezone,
            status: account.status.toLowerCase(),
            metadata: {
              ...account,
              enabled: true,
              syncEnabled: true
            }
          }
        })
      }
    }

    // Mark disabled accounts
    const disabledAccountIds = mockManagedAccounts
      .filter(a => !enabledAccounts.includes(a.customerId))
      .map(a => a.customerId)

    for (const accountId of disabledAccountIds) {
      await prisma.adAccount.updateMany({
        where: {
          accountId: user.accountId || "no-match",
          provider: 'google',
          externalId: accountId
        },
        data: {
          metadata: {
            enabled: false,
            syncEnabled: false
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Updated settings for ${enabledAccounts.length} accounts`,
      enabledAccounts
    })

  } catch (error) {
    console.error('Error updating managed accounts:', error)
    return NextResponse.json(
      { error: 'Failed to update managed accounts' },
      { status: 500 }
    )
  }
}