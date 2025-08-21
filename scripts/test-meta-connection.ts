import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const META_APP_ID = process.env.META_APP_ID
const META_APP_SECRET = process.env.META_APP_SECRET

console.log('Testing Meta Configuration...')
console.log('=====================================')

// Check if credentials are loaded
if (META_APP_ID && META_APP_SECRET && META_APP_ID !== 'your-meta-app-id') {
  console.log('✅ Meta App ID:', META_APP_ID.substring(0, 8) + '...')
  console.log('✅ Meta App Secret:', META_APP_SECRET.substring(0, 8) + '...')
  
  // Test creating OAuth URL (this is what the connection flow will use)
  const redirectUri = 'http://localhost:3333/api/auth/callback/meta'
  const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=ads_management,ads_read,business_management,read_insights&response_type=code`
  
  console.log('\n📌 OAuth URL would be:')
  console.log(oauthUrl.substring(0, 100) + '...')
  
  console.log('\n✅ Meta configuration is properly loaded!')
  console.log('You can now test the connection at: http://localhost:3333/dashboard/connections')
} else {
  console.error('❌ Meta credentials not found in environment!')
  console.error('Please check your .env.local file')
  process.exit(1)
}