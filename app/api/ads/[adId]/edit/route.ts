import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ChangeTrackingService } from '@/services/change-tracking'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const editSchema = z.object({
  editType: z.enum(['targeting', 'creative', 'conversion', 'status', 'name', 'budget']),
  changes: z.array(z.object({
    fieldName: z.string(),
    oldValue: z.any(),
    newValue: z.any(),
  })),
  applyToPlatform: z.boolean().optional().default(false),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { adId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, accountId: true, role: true },
    })

    if (!user?.accountId) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }

    // Get the ad
    const ad = await prisma.ad.findFirst({
      where: {
        id: params.adId,
        accountId: user.accountId,
      },
      include: {
        adGroup: {
          select: {
            id: true,
            externalId: true,
            metadata: true,
          },
        },
      },
    })

    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const { editType, changes, applyToPlatform } = editSchema.parse(body)

    const changeTracker = new ChangeTrackingService(prisma)
    const trackedChanges: any[] = []

    // Track changes based on edit type
    switch (editType) {
      case 'targeting':
        // Targeting changes are stored in AdGroup metadata
        if (ad.adGroup) {
          const oldTargeting = (ad.adGroup.metadata as any)?.targeting || {}
          const newTargeting = { ...oldTargeting }

          for (const change of changes) {
            // Update targeting field
            const fieldPath = change.fieldName.split('.')
            let current = newTargeting
            for (let i = 0; i < fieldPath.length - 1; i++) {
              if (!current[fieldPath[i]]) current[fieldPath[i]] = {}
              current = current[fieldPath[i]]
            }
            current[fieldPath[fieldPath.length - 1]] = change.newValue

            // Track the change
            const tracked = await changeTracker.trackAdminEdit(
              user.accountId,
              user.id,
              'ad_group',
              ad.adGroup.id,
              ad.adGroup.externalId,
              ad.provider,
              'targeting_updated',
              change.fieldName,
              change.oldValue,
              change.newValue,
              undefined,
              ad.adGroup.id,
              ad.id
            )
            trackedChanges.push(tracked)
          }

          // Update AdGroup metadata if applying changes
          if (applyToPlatform) {
            await prisma.adGroup.update({
              where: { id: ad.adGroup.id },
              data: {
                metadata: {
                  ...(ad.adGroup.metadata as any || {}),
                  targeting: newTargeting,
                  lastEditedAt: new Date().toISOString(),
                  lastEditedBy: user.id,
                },
              },
            })
          }
        }
        break

      case 'creative':
        for (const change of changes) {
          const tracked = await changeTracker.trackAdminEdit(
            user.accountId,
            user.id,
            'ad',
            ad.id,
            ad.externalId,
            ad.provider,
            'creative_updated',
            change.fieldName,
            change.oldValue,
            change.newValue,
            undefined,
            ad.adGroupId,
            ad.id
          )
          trackedChanges.push(tracked)
        }

        if (applyToPlatform) {
          const newCreative = { ...(ad.creative as any || {}) }
          for (const change of changes) {
            const fieldPath = change.fieldName.split('.')
            let current = newCreative
            for (let i = 0; i < fieldPath.length - 1; i++) {
              if (!current[fieldPath[i]]) current[fieldPath[i]] = {}
              current = current[fieldPath[i]]
            }
            current[fieldPath[fieldPath.length - 1]] = change.newValue
          }

          await prisma.ad.update({
            where: { id: ad.id },
            data: {
              creative: newCreative,
              metadata: {
                ...(ad.metadata as any || {}),
                lastEditedAt: new Date().toISOString(),
                lastEditedBy: user.id,
              },
            },
          })
        }
        break

      case 'conversion':
        for (const change of changes) {
          const tracked = await changeTracker.trackAdminEdit(
            user.accountId,
            user.id,
            'ad',
            ad.id,
            ad.externalId,
            ad.provider,
            'conversion_tracking_updated',
            change.fieldName,
            change.oldValue,
            change.newValue,
            undefined,
            ad.adGroupId,
            ad.id
          )
          trackedChanges.push(tracked)
        }

        if (applyToPlatform) {
          await prisma.ad.update({
            where: { id: ad.id },
            data: {
              metadata: {
                ...(ad.metadata as any || {}),
                conversionTracking: changes.reduce((acc, c) => ({
                  ...acc,
                  [c.fieldName]: c.newValue,
                }), {}),
                lastEditedAt: new Date().toISOString(),
                lastEditedBy: user.id,
              },
            },
          })
        }
        break

      case 'status':
      case 'name':
      case 'budget':
        for (const change of changes) {
          const tracked = await changeTracker.trackAdminEdit(
            user.accountId,
            user.id,
            'ad',
            ad.id,
            ad.externalId,
            ad.provider,
            editType === 'status' ? 'status_change' : 'updated',
            change.fieldName,
            change.oldValue,
            change.newValue,
            undefined,
            ad.adGroupId,
            ad.id
          )
          trackedChanges.push(tracked)
        }

        if (applyToPlatform) {
          const updateData: any = {
            metadata: {
              ...(ad.metadata as any || {}),
              lastEditedAt: new Date().toISOString(),
              lastEditedBy: user.id,
            },
          }

          for (const change of changes) {
            if (change.fieldName === 'name') updateData.name = change.newValue
            else if (change.fieldName === 'status') updateData.status = change.newValue
          }

          await prisma.ad.update({
            where: { id: ad.id },
            data: updateData,
          })
        }
        break
    }

    return NextResponse.json({
      success: true,
      trackedChanges: trackedChanges.map(c => ({
        id: c.id,
        changeType: c.changeType,
        fieldName: c.fieldName,
        detectedAt: c.detectedAt,
      })),
      appliedToPlatform: applyToPlatform,
      message: applyToPlatform 
        ? 'Changes tracked and applied to local database. Sync with platform to push changes.'
        : 'Changes tracked. Set applyToPlatform: true to apply changes.',
    })

  } catch (error) {
    console.error('Admin edit tracking error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve edit history for an ad
export async function GET(
  request: NextRequest,
  { params }: { params: { adId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountId: true },
    })

    if (!user?.accountId) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }

    // Get the ad
    const ad = await prisma.ad.findFirst({
      where: {
        id: params.adId,
        accountId: user.accountId,
      },
    })

    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    // Get admin edits for this ad
    const edits = await prisma.changeHistory.findMany({
      where: {
        accountId: user.accountId,
        adId: ad.id,
        changeSource: 'ADMIN_EDIT',
      },
      orderBy: {
        detectedAt: 'desc',
      },
      take: 100,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      adId: ad.id,
      adName: ad.name,
      totalEdits: edits.length,
      edits: edits.map(e => ({
        id: e.id,
        changeType: e.changeType,
        fieldName: e.fieldName,
        oldValue: e.oldValue,
        newValue: e.newValue,
        detectedAt: e.detectedAt,
        user: e.user,
      })),
    })

  } catch (error) {
    console.error('Get admin edits error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


