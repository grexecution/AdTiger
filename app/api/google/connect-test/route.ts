import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
/**
 * Connect a test Google Ads account
 * This creates a mock connection for demonstration purposes
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's account
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

    // Create or update test Google connection
    const connection = await prisma.providerConnection.upsert({
      where: {
        accountId_provider_externalAccountId: {
          accountId: user.accountId || "no-match",
          provider: 'GOOGLE',
          externalAccountId: 'test_google_account',
        }
      },
      update: {
        isActive: true,
        status: 'CONNECTED',
        lastSyncAt: new Date(),
        nextSyncAt: new Date(Date.now() + 60 * 60 * 1000), // Next hour
        metadata: {
          accountName: 'Demo Google Ads Account',
          customerId: '1234567890',
          currency: 'USD',
          timeZone: 'America/New_York',
          testAccount: true,
          connectedAt: new Date().toISOString(),
          note: 'Test Google Ads connection for demo purposes'
        }
      },
      create: {
        accountId: user.accountId || "no-match",
        provider: 'GOOGLE',
        externalAccountId: 'test_google_account',
        isActive: true,
        status: 'CONNECTED',
        lastSyncAt: new Date(),
        nextSyncAt: new Date(Date.now() + 60 * 60 * 1000),
        metadata: {
          accountName: 'Demo Google Ads Account',
          customerId: '1234567890',
          currency: 'USD',
          timeZone: 'America/New_York',
          testAccount: true,
          connectedAt: new Date().toISOString(),
          note: 'Test Google Ads connection for demo purposes'
        }
      }
    })

    // Create test ad account
    await prisma.adAccount.upsert({
      where: {
        accountId_provider_externalId: {
          accountId: user.accountId || "no-match",
          provider: 'google',
          externalId: 'test_google_ad_account',
        }
      },
      update: {
        name: 'Demo Google Ads Account',
        currency: 'USD',
        timezone: 'America/New_York',
        status: 'active',
        metadata: {
          customerId: '1234567890',
          testAccount: true
        }
      },
      create: {
        accountId: user.accountId || "no-match",
        provider: 'google',
        externalId: 'test_google_ad_account',
        name: 'Demo Google Ads Account',
        currency: 'USD',
        timezone: 'America/New_York',
        status: 'active',
        metadata: {
          customerId: '1234567890',
          testAccount: true
        }
      }
    })

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        provider: connection.provider,
        status: connection.status,
        lastSyncAt: connection.lastSyncAt,
        nextSyncAt: connection.nextSyncAt,
        metadata: connection.metadata
      }
    })

  } catch (error) {
    console.error('Google connect test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}