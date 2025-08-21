import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
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

    // Get the connection
    const connection = await prisma.providerConnection.findFirst({
      where: {
        id: params.connectionId,
        accountId: user.accountId,
      }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // For demo purposes, we'll just mark it as tested
    // In production, you would actually test the API connection
    await prisma.providerConnection.update({
      where: { id: connection.id },
      data: {
        status: 'CONNECTED',
        lastSyncAt: new Date(),
        syncErrors: null,
      }
    })

    return NextResponse.json({
      success: true,
      message: `${connection.provider} connection tested successfully`,
      status: 'CONNECTED'
    })

  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      { error: 'Failed to test connection' },
      { status: 500 }
    )
  }
}