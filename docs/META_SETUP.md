# Meta (Facebook) API Setup Guide

## Quick Start for Development

### 1. Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Click "Create App"
3. Choose **"Other"** for app type (not Business)
4. Select **"Business"** as the app category
5. Enter your app details

### 2. Configure Basic Settings

In your app dashboard:

1. **Settings → Basic**:
   - Copy your **App ID** and **App Secret**
   - Add **App Domains**: `localhost` (for development)
   - Add **Site URL**: `http://localhost:3333`

2. **Add Facebook Login**:
   - Dashboard → Add Product → Facebook Login → Set Up
   - Settings → Client OAuth Login: **ON**
   - Settings → Web OAuth Login: **ON**
   - Valid OAuth Redirect URIs: Leave empty (auto-allowed in dev mode)

### 3. Request Marketing API Access

This is required for accessing ad accounts:

1. **Dashboard → Add Product → Marketing API → Set Up**
2. **Tools → Graph API Explorer**:
   - Select your app
   - Click "Get Token" → "Get User Access Token"
   - Select permissions:
     - `ads_management`
     - `ads_read`
     - `business_management`
     - `pages_read_engagement`
     - `read_insights`
3. **Submit for App Review** (for production):
   - App Review → Permissions and Features
   - Request the permissions listed above

### 4. Development Testing

While waiting for Marketing API access:

1. **Add yourself as a test user**:
   - Roles → Test Users → Add Test Users
   - Or use your own account (as admin)

2. **Create a System User** (alternative):
   - Business Settings → Users → System Users
   - Create a system user
   - Generate a token with required permissions

### 5. Environment Variables

Add to your `.env.local`:

```env
# Meta/Facebook API
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here
NEXT_PUBLIC_META_APP_ID=your_app_id_here

# Optional: For testing without OAuth flow
META_ACCESS_TOKEN=your_access_token_here
META_BUSINESS_ID=your_business_id_here
```

## Common Issues

### "Cannot get application info due to a system error"

This usually means:
- App type doesn't support the requested features
- Marketing API not added to the app
- App is too new (wait a few minutes)
- Credentials are incorrect

### "Invalid Client ID"

- Check META_APP_ID is correct
- Ensure no extra spaces or quotes
- Verify in Meta App Dashboard

### No Ad Accounts Found

- Need Marketing API access approved
- User needs to be admin of ad accounts
- Business verification may be required

## Testing Without Full Access

For development without Marketing API approval:

1. Use the Graph API Explorer to generate a user token
2. Add the token to META_ACCESS_TOKEN in `.env.local`
3. Use the manual connection method in the app

## Production Requirements

Before going to production:

1. Complete Business Verification
2. Submit app for review with required permissions
3. Implement proper token refresh logic
4. Set up webhook subscriptions for real-time updates