import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Simple encryption for demo (use proper encryption in production)
function encrypt(text: string): string {
  const algorithm = 'aes-256-gcm'
  const key = crypto.scryptSync(process.env.AUTH_SECRET || 'default-key', 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return JSON.stringify({
    encrypted,
    authTag: authTag.toString('hex'),
    iv: iv.toString('hex')
  })
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
    const { clientId, clientSecret, refreshToken, developerToken, customerId, managerCustomerId } = body

    if (!clientId || !clientSecret || !refreshToken || !developerToken || !customerId) {
      return NextResponse.json(
        { error: 'Missing required credentials' },
        { status: 400 }
      )
    }

    // Store encrypted credentials in metadata
    const encryptedCredentials = {
      clientId: encrypt(clientId),
      clientSecret: encrypt(clientSecret),
      refreshToken: encrypt(refreshToken),
      developerToken: encrypt(developerToken),
      customerId: encrypt(customerId),
      managerCustomerId: managerCustomerId ? encrypt(managerCustomerId) : null,
      encryptedAt: new Date().toISOString()
    }

    // Create or update Google connection
    const connection = await prisma.providerConnection.upsert({
      where: {
        accountId_provider_externalAccountId: {
          accountId: user.accountId,
          provider: 'GOOGLE',
          externalAccountId: customerId,
        }
      },
      update: {
        isActive: true,
        status: 'CONNECTED',
        metadata: {
          ...encryptedCredentials,
          accountName: 'Google Ads Account',
          customerId,
          managerCustomerId,
          isManagerAccount: !!managerCustomerId,
          enabledAccounts: [],
          connectedAt: new Date().toISOString(),
        },
        refreshToken: refreshToken, // Store for OAuth refresh (encrypted in production)
        updatedAt: new Date()
      },
      create: {
        accountId: user.accountId,
        provider: 'GOOGLE',
        externalAccountId: customerId,
        isActive: true,
        status: 'CONNECTED',
        metadata: {
          ...encryptedCredentials,
          accountName: 'Google Ads Account',
          customerId,
          managerCustomerId,
          isManagerAccount: !!managerCustomerId,
          enabledAccounts: [],
          connectedAt: new Date().toISOString(),
        },
        refreshToken: refreshToken,
      }
    })

    // Create or update ad account
    await prisma.adAccount.upsert({
      where: {
        accountId_provider_externalId: {
          accountId: user.accountId,
          provider: 'google',
          externalId: customerId,
        }
      },
      update: {
        name: 'Google Ads Account',
        status: 'active',
      },
      create: {
        accountId: user.accountId,
        provider: 'google',
        externalId: customerId,
        name: 'Google Ads Account',
        currency: 'USD',
        timezone: 'America/New_York',
        status: 'active',
      }
    })

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      message: 'Google Ads connection saved successfully'
    })

  } catch (error) {
    console.error('Google connection error:', error)
    return NextResponse.json(
      { error: 'Failed to save connection' },
      { status: 500 }
    )
  }
}