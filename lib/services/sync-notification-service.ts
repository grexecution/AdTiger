import { PrismaClient } from '@prisma/client'
import { SyncHealthReport } from './sync-health-service'

export interface NotificationPayload {
  title: string
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  data?: any
}

export class SyncNotificationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Send sync completion notification
   */
  async notifySyncCompletion(
    accountId: string,
    syncHistoryId: string,
    status: 'SUCCESS' | 'FAILED' | 'CANCELLED',
    summary: {
      campaignsSync: number
      adGroupsSync: number
      adsSync: number
      insightsSync: number
      duration: number
    }
  ): Promise<void> {
    // Check if notifications are enabled for this account
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { accountId },
    })

    if (!settings || !settings.emailEnabled) {
      return
    }

    const payload: NotificationPayload = {
      title: `Sync ${status === 'SUCCESS' ? 'Completed' : status === 'FAILED' ? 'Failed' : 'Cancelled'}`,
      message: this.buildSyncSummaryMessage(status, summary),
      type: status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'error' : 'warning',
      data: {
        syncHistoryId,
        summary,
      },
    }

    await this.queueNotification(accountId, 'sync_completion', payload, settings)
  }

  /**
   * Send access issue alert
   */
  async notifyAccessIssues(
    accountId: string,
    provider: string,
    accessIssues: SyncHealthReport['accessIssues']
  ): Promise<void> {
    if (accessIssues.length === 0) return

    const settings = await this.prisma.notificationSettings.findUnique({
      where: { accountId },
    })

    if (!settings || !settings.emailEnabled) {
      return
    }

    const criticalIssues = accessIssues.filter(
      i => i.type === 'token_expired' || i.type === 'permission_denied'
    )

    if (criticalIssues.length === 0) return

    const payload: NotificationPayload = {
      title: 'Urgent: Access Issues Detected',
      message: this.buildAccessIssuesMessage(provider, accessIssues),
      type: 'error',
      data: {
        provider,
        issues: accessIssues,
      },
    }

    await this.queueNotification(accountId, 'access_issues', payload, settings)
  }

  /**
   * Send sync failure alert
   */
  async notifySyncFailure(
    accountId: string,
    provider: string,
    errorMessage: string,
    syncHistoryId: string
  ): Promise<void> {
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { accountId },
    })

    if (!settings || !settings.emailEnabled) {
      return
    }

    const payload: NotificationPayload = {
      title: `${provider} Sync Failed`,
      message: `The sync for your ${provider} account failed with error: ${errorMessage}. Please check your connection and try again.`,
      type: 'error',
      data: {
        provider,
        errorMessage,
        syncHistoryId,
      },
    }

    await this.queueNotification(accountId, 'sync_failure', payload, settings)
  }

  /**
   * Send weekly digest of detected changes
   */
  async sendWeeklyDigest(accountId: string): Promise<void> {
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { accountId },
    })

    if (!settings || !settings.emailEnabled || settings.frequency !== 'weekly') {
      return
    }

    // Get changes from the past week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const changes = await this.prisma.changeHistory.findMany({
      where: {
        accountId,
        detectedAt: {
          gte: weekAgo,
        },
      },
      orderBy: {
        detectedAt: 'desc',
      },
      take: 100,
      include: {
        campaign: {
          select: { name: true },
        },
        adGroup: {
          select: { name: true },
        },
        ad: {
          select: { name: true },
        },
        user: {
          select: { name: true },
        },
      },
    })

    if (changes.length === 0) {
      return
    }

    // Categorize changes
    const changesByType: Record<string, number> = {}
    const adminChanges = changes.filter(c => c.changeSource === 'ADMIN_EDIT')
    const platformChanges = changes.filter(c => c.changeSource === 'PLATFORM_SYNC')

    for (const change of changes) {
      changesByType[change.changeType] = (changesByType[change.changeType] || 0) + 1
    }

    const payload: NotificationPayload = {
      title: 'Weekly Ad Performance Digest',
      message: this.buildWeeklyDigestMessage(changes.length, changesByType, adminChanges.length, platformChanges.length),
      type: 'info',
      data: {
        totalChanges: changes.length,
        changesByType,
        adminChangesCount: adminChanges.length,
        platformChangesCount: platformChanges.length,
        topChanges: changes.slice(0, 10),
      },
    }

    await this.queueNotification(accountId, 'weekly_digest', payload, settings)
  }

  /**
   * Queue notification for delivery
   */
  private async queueNotification(
    accountId: string,
    type: string,
    payload: NotificationPayload,
    settings: any
  ): Promise<void> {
    // Determine channels to send to
    const channels: string[] = []
    if (settings.emailEnabled) channels.push('email')
    if (settings.slackEnabled) channels.push('slack')
    if (settings.webhookEnabled) channels.push('webhook')

    // Check quiet hours
    if (settings.quietHoursEnabled) {
      const now = new Date()
      const currentHour = now.getHours()
      const quietStart = parseInt(settings.quietHoursStart?.split(':')[0] || '22')
      const quietEnd = parseInt(settings.quietHoursEnd?.split(':')[0] || '7')

      const isQuietTime = quietStart > quietEnd
        ? currentHour >= quietStart || currentHour < quietEnd
        : currentHour >= quietStart && currentHour < quietEnd

      if (isQuietTime && payload.type !== 'error') {
        // Delay non-critical notifications until after quiet hours
        const scheduledFor = new Date()
        scheduledFor.setHours(quietEnd, 0, 0, 0)
        if (scheduledFor < now) {
          scheduledFor.setDate(scheduledFor.getDate() + 1)
        }

        for (const channel of channels) {
          await this.prisma.notificationQueue.create({
            data: {
              accountId,
              type,
              channel,
              subject: payload.title,
              content: {
                message: payload.message,
                type: payload.type,
                data: payload.data,
              },
              status: 'pending',
              scheduledFor,
            },
          })
        }
        return
      }
    }

    // Queue immediately
    for (const channel of channels) {
      await this.prisma.notificationQueue.create({
        data: {
          accountId,
          type,
          channel,
          subject: payload.title,
          content: {
            message: payload.message,
            type: payload.type,
            data: payload.data,
          },
          status: 'pending',
          scheduledFor: new Date(),
        },
      })
    }
  }

  /**
   * Build sync summary message
   */
  private buildSyncSummaryMessage(
    status: string,
    summary: {
      campaignsSync: number
      adGroupsSync: number
      adsSync: number
      insightsSync: number
      duration: number
    }
  ): string {
    if (status !== 'SUCCESS') {
      return `The sync did not complete successfully. Please check the sync logs for more details.`
    }

    const durationMinutes = Math.floor(summary.duration / 60000)
    const durationSeconds = Math.floor((summary.duration % 60000) / 1000)

    return `Sync completed successfully in ${durationMinutes}m ${durationSeconds}s. Synced: ${summary.campaignsSync} campaigns, ${summary.adGroupsSync} ad groups, ${summary.adsSync} ads, and ${summary.insightsSync} insights.`
  }

  /**
   * Build access issues message
   */
  private buildAccessIssuesMessage(provider: string, issues: SyncHealthReport['accessIssues']): string {
    const issuesList = issues.map(i => `• ${i.message}`).join('\n')
    return `We detected access issues with your ${provider} account:\n\n${issuesList}\n\nPlease reconnect your account to resolve these issues.`
  }

  /**
   * Build weekly digest message
   */
  private buildWeeklyDigestMessage(
    totalChanges: number,
    changesByType: Record<string, number>,
    adminChanges: number,
    platformChanges: number
  ): string {
    const changeTypesList = Object.entries(changesByType)
      .map(([type, count]) => `• ${type.replace(/_/g, ' ')}: ${count}`)
      .join('\n')

    return `This week, we detected ${totalChanges} changes to your ads:\n\n${changeTypesList}\n\nAdmin Changes: ${adminChanges}\nPlatform Changes: ${platformChanges}\n\nView your dashboard for detailed insights.`
  }

  /**
   * Process pending notifications
   */
  async processPendingNotifications(limit: number = 50): Promise<number> {
    const now = new Date()
    
    const pending = await this.prisma.notificationQueue.findMany({
      where: {
        status: 'pending',
        scheduledFor: {
          lte: now,
        },
      },
      take: limit,
      orderBy: {
        scheduledFor: 'asc',
      },
    })

    let processed = 0

    for (const notification of pending) {
      try {
        // Mark as processing
        await this.prisma.notificationQueue.update({
          where: { id: notification.id },
          data: { status: 'processing' },
        })

        // Send notification based on channel
        await this.sendNotification(notification)

        // Mark as sent
        await this.prisma.notificationQueue.update({
          where: { id: notification.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        })

        processed++
      } catch (error) {
        // Mark as failed
        await this.prisma.notificationQueue.update({
          where: { id: notification.id },
          data: {
            status: 'failed',
            failedAt: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
            attempts: notification.attempts + 1,
          },
        })
      }
    }

    return processed
  }

  /**
   * Send notification via specific channel
   */
  private async sendNotification(notification: any): Promise<void> {
    // In a real implementation, this would send via email, Slack, webhook, etc.
    // For now, we just log it
    console.log(`Sending notification via ${notification.channel}:`, {
      to: notification.accountId,
      subject: notification.subject,
      content: notification.content,
    })

    // TODO: Implement actual email/Slack/webhook sending
    // For email: Use a service like SendGrid, AWS SES, or Resend
    // For Slack: Use incoming webhooks
    // For webhook: Make HTTP POST request to custom webhook URL
  }
}


