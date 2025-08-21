import { PrismaClient } from '@prisma/client'
import { decrypt } from '@/lib/encryption'

export interface AccountSyncResult {
  success: boolean
  provider: string
  accountsUpdated: number
  error?: string
}

export class AccountSyncService {
  constructor(private prisma: PrismaClient) {}

  async syncAllProviderAccounts(accountId: string): Promise<AccountSyncResult[]> {
    const results: AccountSyncResult[] = []
    
    try {
      // Get all active connections for this account
      const connections = await this.prisma.providerConnection.findMany({
        where: {
          accountId,
          isActive: true,
        }
      })

      for (const connection of connections) {
        const result = await this.syncProviderAccount(connection)
        results.push(result)
      }

      return results
    } catch (error) {
      console.error('Error syncing all provider accounts:', error)
      throw error
    }
  }

  private async syncProviderAccount(connection: any): Promise<AccountSyncResult> {
    try {
      const metadata = connection.metadata as any
      
      if (connection.provider === 'meta') {
        return await this.syncMetaAccount(connection)
      } else if (connection.provider === 'google') {
        return await this.syncGoogleAccount(connection)
      }

      return {
        success: false,
        provider: connection.provider,
        accountsUpdated: 0,
        error: `Unknown provider: ${connection.provider}`
      }
    } catch (error: any) {
      return {
        success: false,
        provider: connection.provider,
        accountsUpdated: 0,
        error: error.message
      }
    }
  }

  private async syncMetaAccount(connection: any): Promise<AccountSyncResult> {
    try {
      const metadata = connection.metadata as any
      
      // In production, you would decrypt and use the actual API credentials
      // For demo, we'll use mock data
      const mockMetaAccounts = [
        {
          id: 'act_123456789',
          name: 'Main Ad Account',
          currency: 'USD',
          timezone: 'America/New_York',
          status: 'ACTIVE'
        }
      ]

      let accountsUpdated = 0

      for (const metaAccount of mockMetaAccounts) {
        // Upsert ad account
        await this.prisma.adAccount.upsert({
          where: {
            accountId_provider_externalId: {
              accountId: connection.accountId,
              provider: 'meta',
              externalId: metaAccount.id
            }
          },
          update: {
            name: metaAccount.name,
            currency: metaAccount.currency,
            timezone: metaAccount.timezone,
            status: metaAccount.status.toLowerCase(),
            metadata: metaAccount,
            updatedAt: new Date()
          },
          create: {
            accountId: connection.accountId,
            provider: 'meta',
            externalId: metaAccount.id,
            name: metaAccount.name,
            currency: metaAccount.currency,
            timezone: metaAccount.timezone,
            status: metaAccount.status.toLowerCase(),
            metadata: metaAccount
          }
        })
        accountsUpdated++
      }

      // Update connection metadata with account info
      await this.prisma.providerConnection.update({
        where: { id: connection.id },
        data: {
          metadata: {
            ...metadata,
            accountName: mockMetaAccounts[0]?.name,
            currency: mockMetaAccounts[0]?.currency,
            timezone: mockMetaAccounts[0]?.timezone,
          },
          lastSyncAt: new Date(),
          status: 'CONNECTED'
        }
      })

      return {
        success: true,
        provider: 'meta',
        accountsUpdated
      }
    } catch (error: any) {
      console.error('Error syncing Meta account:', error)
      return {
        success: false,
        provider: 'meta',
        accountsUpdated: 0,
        error: error.message
      }
    }
  }

  private async syncGoogleAccount(connection: any): Promise<AccountSyncResult> {
    try {
      const metadata = connection.metadata as any
      
      // In production, you would decrypt and use the actual API credentials
      // For demo, we'll use mock data
      const mockGoogleAccounts = [
        {
          id: '1234567890',
          name: 'Google Ads Account',
          currency: 'USD',
          timezone: 'America/New_York',
          status: 'ENABLED'
        }
      ]

      let accountsUpdated = 0

      for (const googleAccount of mockGoogleAccounts) {
        // Upsert ad account
        await this.prisma.adAccount.upsert({
          where: {
            accountId_provider_externalId: {
              accountId: connection.accountId,
              provider: 'google',
              externalId: googleAccount.id
            }
          },
          update: {
            name: googleAccount.name,
            currency: googleAccount.currency,
            timezone: googleAccount.timezone,
            status: googleAccount.status.toLowerCase(),
            metadata: googleAccount,
            updatedAt: new Date()
          },
          create: {
            accountId: connection.accountId,
            provider: 'google',
            externalId: googleAccount.id,
            name: googleAccount.name,
            currency: googleAccount.currency,
            timezone: googleAccount.timezone,
            status: googleAccount.status.toLowerCase(),
            metadata: googleAccount
          }
        })
        accountsUpdated++
      }

      // Update connection metadata with account info
      await this.prisma.providerConnection.update({
        where: { id: connection.id },
        data: {
          metadata: {
            ...metadata,
            accountName: mockGoogleAccounts[0]?.name,
            currency: mockGoogleAccounts[0]?.currency,
            timezone: mockGoogleAccounts[0]?.timezone,
          },
          lastSyncAt: new Date(),
          status: 'CONNECTED'
        }
      })

      return {
        success: true,
        provider: 'google',
        accountsUpdated
      }
    } catch (error: any) {
      console.error('Error syncing Google account:', error)
      return {
        success: false,
        provider: 'google',
        accountsUpdated: 0,
        error: error.message
      }
    }
  }

  async getAccountStats(accountId: string) {
    const [campaigns, ads, adAccounts] = await Promise.all([
      this.prisma.campaign.count({ where: { accountId } }),
      this.prisma.ad.count({ where: { accountId } }),
      this.prisma.adAccount.count({ where: { accountId } })
    ])

    return {
      campaigns,
      ads,
      adAccounts
    }
  }
}