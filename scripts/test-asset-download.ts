import { PrismaClient } from '@prisma/client'
import { AssetStorageService } from '@/lib/services/asset-storage-service'

const prisma = new PrismaClient()

async function testAssetDownload() {
  try {
    const assetService = new AssetStorageService(prisma)
    
    // Get a sample ad with images
    const ad = await prisma.ad.findFirst({
      where: { 
        name: 'Mundhygiene',
        accountId: 'demo-pro-account'
      }
    })
    
    if (!ad) {
      console.log('Ad not found')
      return
    }
    
    const creative = ad.creative as any
    const imageUrl = creative?.asset_feed_spec?.images?.[0]?.url
    const imageHash = creative?.asset_feed_spec?.images?.[0]?.hash
    
    console.log('Testing asset download for ad:', ad.id)
    console.log('Image URL:', imageUrl?.substring(0, 100) + '...')
    console.log('Image hash:', imageHash)
    
    if (imageUrl) {
      // Get access token
      const connection = await prisma.connection.findFirst({
        where: { 
          provider: 'meta',
          accountId: 'demo-pro-account'
        }
      })
      
      const credentials = connection?.credentials as any
      const accessToken = credentials?.accessToken
      
      console.log('\nDownloading image...')
      const result = await assetService.downloadAndStoreAsset({
        accountId: 'demo-pro-account',
        provider: 'meta',
        entityType: 'ad',
        entityId: ad.id,
        assetType: 'main_image',
        imageUrl,
        hash: imageHash,
        accessToken
      })
      
      console.log('\nResult:', result)
      
      // Check if it's stored
      const storedAsset = await prisma.assetStorage.findFirst({
        where: {
          entityId: ad.id,
          assetType: 'main_image'
        }
      })
      
      if (storedAsset) {
        console.log('\n✅ Asset successfully stored!')
        console.log('- Size:', storedAsset.size, 'bytes')
        console.log('- Type:', storedAsset.mimeType)
        console.log('- Dimensions:', storedAsset.width, 'x', storedAsset.height)
        console.log('- Change count:', storedAsset.changeCount)
        
        // Test serving the asset
        console.log('\nAsset URL would be: /api/assets/' + ad.id + '?type=main_image')
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAssetDownload()