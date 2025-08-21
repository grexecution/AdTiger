import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AIRecommendationService } from '@/services/ai-recommendations'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      console.error('Unauthorized cron request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🤖 Starting daily AI recommendations generation...')

    // Get all accounts
    const accounts = await prisma.account.findMany({
      select: { id: true, name: true }
    })

    const recommendationService = new AIRecommendationService(prisma)
    const results = {
      total: 0,
      byAccount: {} as Record<string, number>,
      errors: [] as string[]
    }

    // Generate recommendations for each account
    for (const account of accounts) {
      try {
        console.log(`Generating recommendations for account ${account.name}...`)
        
        const recommendations = await recommendationService.generateRecommendations(account.id)
        
        results.byAccount[account.name] = recommendations.length
        results.total += recommendations.length
        
        console.log(`✅ Generated ${recommendations.length} recommendations for ${account.name}`)
      } catch (error) {
        const errorMsg = `Failed to generate recommendations for account ${account.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(errorMsg)
        results.errors.push(errorMsg)
      }
    }

    // Clean up old recommendations (older than 30 days and not acted upon)
    const deleteOldRecommendations = await prisma.recommendation.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        status: 'proposed'
      }
    })

    console.log(`🧹 Cleaned up ${deleteOldRecommendations.count} old recommendations`)

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      results,
      cleanup: {
        deletedOldRecommendations: deleteOldRecommendations.count
      }
    }

    console.log('🎉 Daily recommendations generation completed:', response)

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Daily recommendations cron failed:', error)

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Manual trigger endpoint for testing
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { accountId } = body

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID required' },
        { status: 400 }
      )
    }

    const recommendationService = new AIRecommendationService(prisma)
    const recommendations = await recommendationService.generateRecommendations(accountId)

    return NextResponse.json({
      success: true,
      recommendations: recommendations.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Manual recommendation generation failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}