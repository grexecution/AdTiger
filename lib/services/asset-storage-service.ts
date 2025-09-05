import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

export class AssetStorageService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Download and store an image asset
   */
  async downloadAndStoreAsset(params: {
    accountId: string
    provider: string
    entityType: string
    entityId: string
    assetType: string
    imageUrl: string
    hash?: string
    accessToken?: string
  }): Promise<{ assetId: string; changed: boolean; previousHash?: string }> {
    const { accountId, provider, entityType, entityId, assetType, imageUrl, hash, accessToken } = params

    try {
      // Check if we already have this asset
      const existingAsset = await this.prisma.assetStorage.findFirst({
        where: {
          accountId,
          provider,
          entityId,
          assetType
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Download the image
      console.log(`Downloading image from: ${imageUrl.substring(0, 100)}...`)
      
      // Add headers for Facebook CDN
      const headers: HeadersInit = {
        'User-Agent': 'Mozilla/5.0 (compatible; AdTiger/1.0)',
        'Accept': 'image/*'
      }
      
      let response: Response
      
      // For Facebook CDN URLs, try to use Graph API if we have a hash and token
      if ((imageUrl.includes('scontent') || imageUrl.includes('fbcdn.net')) && hash && accessToken) {
        // Try using the Graph API picture endpoint instead
        // Get the ad account ID from the first ad account in credentials
        const connection = await this.prisma.connection.findFirst({
          where: { accountId, provider }
        })
        const creds = connection?.credentials as any
        const adAccountId = creds?.selectedAccountIds?.[0] || 'act_4133193336958647'
        const graphUrl = `https://graph.facebook.com/v21.0/${adAccountId}/adimages?hashes=${JSON.stringify([hash])}&access_token=${accessToken}`
        console.log('Trying Graph API for image hash:', hash)
        
        const graphResponse = await fetch(graphUrl)
        const graphData = await graphResponse.json()
        
        console.log('Graph API response:', JSON.stringify(graphData, null, 2))
        
        if (graphData.data?.[0]?.url) {
          // Use the URL from Graph API
          const betterUrl = graphData.data[0].url
          console.log('Got URL from Graph API:', betterUrl.substring(0, 100) + '...')
          response = await fetch(betterUrl, { headers })
        } else if (graphData.error) {
          console.error('Graph API error:', graphData.error)
          // Fall back to original URL
          response = await fetch(imageUrl, { headers })
        } else {
          console.log('No URL in Graph API response, falling back to original')
          // Fall back to original URL
          response = await fetch(imageUrl, { headers })
        }
      } else if (imageUrl.includes('graph.facebook.com') && accessToken) {
        const separator = imageUrl.includes('?') ? '&' : '?'
        const urlWithToken = `${imageUrl}${separator}access_token=${accessToken}`
        response = await fetch(urlWithToken, { headers })
      } else {
        response = await fetch(imageUrl, { headers })
      }

      if (!response.ok) {
        console.error(`Failed to download image: ${response.status} ${response.statusText}`)
        throw new Error(`Failed to download image: ${response.status}`)
      }

      // Get image data
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Calculate hash if not provided
      const imageHash = hash || crypto.createHash('md5').update(buffer).digest('hex')
      
      // Get image metadata
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const size = buffer.length
      
      // Try to get dimensions (basic implementation - could be enhanced with image processing library)
      let width: number | undefined
      let height: number | undefined
      
      // Simple JPEG dimension detection (very basic)
      if (contentType === 'image/jpeg' || contentType === 'image/jpg') {
        // JPEG dimensions are stored in SOF0 marker
        // This is a simplified approach - for production use sharp or similar library
        const hexString = buffer.toString('hex', 0, Math.min(buffer.length, 1000))
        const sof0Match = hexString.match(/ffc0..(.{4})(.{4})/i)
        if (sof0Match) {
          height = parseInt(sof0Match[1], 16)
          width = parseInt(sof0Match[2], 16)
        }
      }

      // Check if asset has changed
      const hasChanged = !existingAsset || existingAsset.hash !== imageHash
      let previousHash: string | undefined
      
      if (hasChanged) {
        if (existingAsset) {
          // Asset changed - track the change
          previousHash = existingAsset.hash || undefined
          console.log(`Asset changed for ${entityType} ${entityId}: ${previousHash} -> ${imageHash}`)
          
          // Create change history
          await this.prisma.changeHistory.create({
            data: {
              accountId,
              provider,
              entityType: 'asset',
              entityId,
              externalId: entityId,
              changeType: 'asset_update',
              fieldName: `${assetType}_hash`,
              oldValue: previousHash,
              newValue: imageHash,
              detectedAt: new Date()
            }
          })
        }
        
        // Store the new asset
        const newAsset = await this.prisma.assetStorage.create({
          data: {
            accountId,
            provider,
            entityType,
            entityId,
            assetType,
            originalUrl: imageUrl,
            hash: imageHash,
            mimeType: contentType,
            size,
            width: width || null,
            height: height || null,
            data: buffer,
            previousHash: existingAsset?.hash || null,
            changedAt: existingAsset ? new Date() : null,
            changeCount: existingAsset ? (existingAsset.changeCount + 1) : 0,
            metadata: {
              downloadedAt: new Date().toISOString(),
              sourceUrl: imageUrl
            }
          }
        })
        
        console.log(`✅ Stored new asset: ${newAsset.id} (${size} bytes)`)
        return { assetId: newAsset.id, changed: true, previousHash }
      } else {
        // Asset hasn't changed, just update lastCheckedAt
        await this.prisma.assetStorage.update({
          where: { id: existingAsset.id },
          data: {
            lastCheckedAt: new Date()
          }
        })
        
        console.log(`✓ Asset unchanged: ${existingAsset.id}`)
        return { assetId: existingAsset.id, changed: false }
      }
    } catch (error) {
      console.error(`Error downloading asset from ${imageUrl}:`, error)
      throw error
    }
  }

  /**
   * Get stored asset data
   */
  async getStoredAsset(params: {
    accountId: string
    entityId: string
    assetType: string
  }): Promise<{ data: Buffer; mimeType: string } | null> {
    const asset = await this.prisma.assetStorage.findFirst({
      where: {
        accountId: params.accountId,
        entityId: params.entityId,
        assetType: params.assetType
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        data: true,
        mimeType: true
      }
    })
    
    if (!asset) return null
    
    return {
      data: asset.data,
      mimeType: asset.mimeType
    }
  }

  /**
   * Get asset change history
   */
  async getAssetChangeHistory(params: {
    accountId: string
    entityId: string
    assetType: string
  }): Promise<Array<{
    hash: string
    changedAt: Date
    previousHash: string | null
  }>> {
    const assets = await this.prisma.assetStorage.findMany({
      where: {
        accountId: params.accountId,
        entityId: params.entityId,
        assetType: params.assetType
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        hash: true,
        changedAt: true,
        previousHash: true,
        createdAt: true
      }
    })
    
    return assets.map(asset => ({
      hash: asset.hash || '',
      changedAt: asset.changedAt || asset.createdAt,
      previousHash: asset.previousHash
    }))
  }
}