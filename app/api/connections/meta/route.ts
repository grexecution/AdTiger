import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
// Simple base64 encoding for demo (use proper encryption in production)
function encrypt(text: string): string {
  // For demo purposes, just use base64 encoding
  // In production, use proper encryption
  return Buffer.from(text).toString('base64')
}

export async function POST(request: NextRequest) {
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
    const { appId, appSecret, accessToken, adAccountId } = body

    if (!appId || !appSecret || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required credentials' },
        { status: 400 }
      )
    }

    // Store encrypted credentials in metadata
    const encryptedCredentials = {
      appId: encrypt(appId),
      appSecret: encrypt(appSecret),
      accessToken: encrypt(accessToken),
      adAccountId: adAccountId ? encrypt(adAccountId) : null,
      encryptedAt: new Date().toISOString()
    }

    // Create or update Meta connection
    const connection = await prisma.providerConnection.upsert({
      where: {
        accountId_provider_externalAccountId: {
          accountId: user.accountId || "no-match",
          provider: 'META',
          externalAccountId: adAccountId || 'default_meta_account',
        }
      },
      update: {
        isActive: true,
        status: 'CONNECTED',
        metadata: {
          ...encryptedCredentials,
          accountName: 'Meta Business Account',
          connectedAt: new Date().toISOString(),
        },
        accessToken: accessToken, // Store for quick access (encrypted in production)
        updatedAt: new Date()
      },
      create: {
        accountId: user.accountId || "no-match",
        provider: 'META',
        externalAccountId: adAccountId || 'default_meta_account',
        isActive: true,
        status: 'CONNECTED',
        metadata: {
          ...encryptedCredentials,
          accountName: 'Meta Business Account',
          connectedAt: new Date().toISOString(),
        },
        accessToken: accessToken,
      }
    })

    // Create or update ad account
    await prisma.adAccount.upsert({
      where: {
        accountId_provider_externalId: {
          accountId: user.accountId || "no-match",
          provider: 'meta',
          externalId: adAccountId || 'default_meta_account',
        }
      },
      update: {
        name: 'Meta Business Account',
        status: 'active',
      },
      create: {
        accountId: user.accountId || "no-match",
        provider: 'meta',
        externalId: adAccountId || 'default_meta_account',
        name: 'Meta Business Account',
        currency: 'USD',
        timezone: 'America/New_York',
        status: 'active',
      }
    })

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      message: 'Meta connection saved successfully'
    })

  } catch (error) {
    console.error('Meta connection error:', error)
    return NextResponse.json(
      { error: 'Failed to save connection' },
      { status: 500 }
    )
  }
}