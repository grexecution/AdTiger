import { Queue } from 'bullmq'
import { metaSyncQueue, insightsQueue, recommendationsQueue } from '@/lib/queue/queues'
import { prisma } from '@/lib/prisma'
import { format, subDays } from 'date-fns'

interface ScheduledJob {
  name: string
  queue: Queue
  pattern: string
  getJobData: () => Promise<any[]>
}

// Define scheduled jobs
const scheduledJobs: ScheduledJob[] = [
  {
    name: 'full-insights-sync',
    queue: insightsQueue,
    pattern: '0 3 * * *', // Every day at 3 AM
    getJobData: async () => {
      // Get all active Meta connections
      const connections = await prisma.providerConnection.findMany({
        where: {
          provider: 'meta',
          isActive: true,
        },
        include: {
          account: {
            include: {
              adAccounts: {
                where: { provider: 'meta' },
              },
            },
          },
        },
      })

      const jobs = []
      const endDate = format(new Date(), 'yyyy-MM-dd')
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')

      for (const connection of connections) {
        for (const adAccount of connection.account.adAccounts) {
          // Create jobs for each level
          const levels = ['account', 'campaign', 'adset', 'ad'] as const
          
          for (const level of levels) {
            jobs.push({
              name: `full-insights-${adAccount.id}-${level}`,
              data: {
                accountId: connection.accountId,
                adAccountId: adAccount.id,
                provider: 'meta',
                level,
                dateRange: {
                  start: startDate,
                  end: endDate,
                },
                syncType: 'full',
              },
              opts: {
                jobId: `full-insights-${adAccount.id}-${level}-${endDate}`,
              },
            })
          }
        }
      }

      return jobs
    },
  },
  {
    name: 'delta-insights-sync',
    queue: insightsQueue,
    pattern: '*/30 * * * *', // Every 30 minutes
    getJobData: async () => {
      const connections = await prisma.providerConnection.findMany({
        where: {
          provider: 'meta',
          isActive: true,
        },
        include: {
          account: {
            include: {
              adAccounts: {
                where: { provider: 'meta' },
              },
            },
          },
        },
      })

      const jobs = []
      const endDate = format(new Date(), 'yyyy-MM-dd')
      const startDate = format(subDays(new Date(), 1), 'yyyy-MM-dd') // Last 24 hours

      for (const connection of connections) {
        for (const adAccount of connection.account.adAccounts) {
          // For delta sync, focus on campaign and ad level
          const levels = ['campaign', 'ad'] as const
          
          for (const level of levels) {
            jobs.push({
              name: `delta-insights-${adAccount.id}-${level}`,
              data: {
                accountId: connection.accountId,
                adAccountId: adAccount.id,
                provider: 'meta',
                level,
                dateRange: {
                  start: startDate,
                  end: endDate,
                },
                syncType: 'delta',
              },
              opts: {
                jobId: `delta-insights-${adAccount.id}-${level}-${new Date().getTime()}`,
              },
            })
          }
        }
      }

      return jobs
    },
  },
  {
    name: 'generate-recommendations',
    queue: recommendationsQueue,
    pattern: '5 4 * * *', // Every day at 4:05 AM (after full sync completes)
    getJobData: async () => {
      const accounts = await prisma.account.findMany({
        where: {
          adAccounts: {
            some: {
              provider: 'meta',
            },
          },
        },
      })

      const jobs = []

      for (const account of accounts) {
        jobs.push({
          name: `recommendations-${account.id}`,
          data: {
            accountId: account.id,
            playbookIds: [
              'ctr-optimization',
              'budget-management',
              'audience-optimization',
            ],
          },
          opts: {
            jobId: `recommendations-${account.id}-${format(new Date(), 'yyyy-MM-dd')}`,
          },
        })
      }

      return jobs
    },
  },
  {
    name: 'entity-sync',
    queue: metaSyncQueue,
    pattern: '0 2 * * *', // Every day at 2 AM (before insights sync)
    getJobData: async () => {
      const connections = await prisma.providerConnection.findMany({
        where: {
          provider: 'meta',
          isActive: true,
        },
      })

      const jobs = []

      for (const connection of connections) {
        jobs.push({
          name: `entity-sync-${connection.id}`,
          data: {
            accountId: connection.accountId,
            providerConnectionId: connection.id,
            syncType: 'full',
            entityTypes: ['adAccounts', 'campaigns', 'adGroups', 'ads'],
          },
          opts: {
            jobId: `entity-sync-${connection.id}-${format(new Date(), 'yyyy-MM-dd')}`,
          },
        })
      }

      return jobs
    },
  },
]

// Scheduler class
export class JobScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private running = false

  async start() {
    if (this.running) {
      console.log('Scheduler already running')
      return
    }

    console.log('🚀 Starting job scheduler...')
    this.running = true

    for (const job of scheduledJobs) {
      // Schedule based on cron pattern
      const interval = this.parseCronToInterval(job.pattern)
      
      if (interval) {
        // Run immediately on start if needed
        if (this.shouldRunOnStart(job.pattern)) {
          this.executeJob(job).catch(console.error)
        }

        // Set up recurring execution
        const intervalId = setInterval(async () => {
          if (this.shouldRunNow(job.pattern)) {
            await this.executeJob(job)
          }
        }, interval)

        this.intervals.set(job.name, intervalId)
        console.log(`✅ Scheduled job: ${job.name} with pattern: ${job.pattern}`)
      }
    }
  }

  async stop() {
    console.log('🛑 Stopping job scheduler...')
    
    // Clear all intervals
    for (const [name, intervalId] of this.intervals) {
      clearInterval(intervalId)
      console.log(`❌ Stopped job: ${name}`)
    }
    
    this.intervals.clear()
    this.running = false
  }

  private async executeJob(job: ScheduledJob) {
    try {
      console.log(`🔄 Executing scheduled job: ${job.name}`)
      
      const jobDataArray = await job.getJobData()
      
      if (jobDataArray.length === 0) {
        console.log(`ℹ️ No jobs to schedule for ${job.name}`)
        return
      }

      // Add jobs to queue
      const bulkJobs = jobDataArray.map(jobData => ({
        name: jobData.name,
        data: jobData.data,
        opts: jobData.opts || {},
      }))

      await job.queue.addBulk(bulkJobs)
      console.log(`✅ Added ${bulkJobs.length} jobs for ${job.name}`)
      
    } catch (error) {
      console.error(`❌ Error executing job ${job.name}:`, error)
    }
  }

  private parseCronToInterval(pattern: string): number | null {
    // Simple cron parser for common patterns
    if (pattern === '*/30 * * * *') {
      return 30 * 60 * 1000 // 30 minutes
    } else if (pattern.startsWith('0 ') || pattern.startsWith('5 ')) {
      return 60 * 1000 // Check every minute for daily jobs
    }
    return null
  }

  private shouldRunOnStart(pattern: string): boolean {
    // Don't run daily jobs on start, only frequent ones
    return pattern.includes('*/');
  }

  private shouldRunNow(pattern: string): boolean {
    const now = new Date()
    const parts = pattern.split(' ')
    
    // Parse cron pattern (minute hour day month weekday)
    const [minute, hour, day, month, weekday] = parts

    // For */30 pattern (every 30 minutes)
    if (minute === '*/30') {
      return now.getMinutes() % 30 === 0 && now.getSeconds() < 5
    }

    // For specific time patterns
    if (minute !== '*' && parseInt(minute) !== now.getMinutes()) {
      return false
    }

    if (hour !== '*' && parseInt(hour) !== now.getHours()) {
      return false
    }

    // For daily jobs, check if we're within the first few seconds of the minute
    if (now.getSeconds() > 5) {
      return false
    }

    return true
  }

  // Manual trigger methods for testing
  async triggerFullSync() {
    const job = scheduledJobs.find(j => j.name === 'full-insights-sync')
    if (job) {
      await this.executeJob(job)
    }
  }

  async triggerDeltaSync() {
    const job = scheduledJobs.find(j => j.name === 'delta-insights-sync')
    if (job) {
      await this.executeJob(job)
    }
  }

  async triggerRecommendations() {
    const job = scheduledJobs.find(j => j.name === 'generate-recommendations')
    if (job) {
      await this.executeJob(job)
    }
  }

  async triggerEntitySync() {
    const job = scheduledJobs.find(j => j.name === 'entity-sync')
    if (job) {
      await this.executeJob(job)
    }
  }
}

// Export singleton instance
export const scheduler = new JobScheduler()