# API Setup Guide for AdFire

## 🚀 Complete Implementation Overview

AdFire now supports both **Meta (Facebook & Instagram)** and **Google Ads (Search, YouTube, Display, Shopping)** with a fully integrated settings page where each user can add their own API credentials.

## 📍 Where to Access Settings

1. **Navigate to Settings**: Click on your profile icon in the top right → Settings
2. **Go to Connections Tab**: Settings → Connections
3. **Connect Your Platforms**: Click "Connect" for Meta or Google Ads

## 🔗 Meta (Facebook & Instagram) Setup

### Prerequisites
- Meta Business Manager account with admin access
- Access to Facebook Developer platform

### Step-by-Step Instructions

#### 1. Create a Meta App
1. Go to [Facebook Developers](https://developers.facebook.com/apps)
2. Click **"Create App"**
3. Choose **"Business"** as the app type
4. Enter your app details and create

#### 2. Configure Marketing API
1. In your app dashboard, click **"Add Product"**
2. Find **"Marketing API"** and click **"Set Up"**
3. Follow the setup wizard

#### 3. Get Your Credentials
1. **App ID**: Found in Settings → Basic
2. **App Secret**: Click "Show" in Settings → Basic
3. **Access Token**: 
   - Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer)
   - Select your app
   - Grant permissions: `ads_read`, `ads_management`, `business_management`, `insights`
   - Generate and copy the token

#### 4. Add to AdFire
1. Go to Settings → Connections
2. Click **"Connect"** under Meta
3. Enter your credentials
4. Click **"Test Connection"** to verify
5. Click **"Save Connection"**

### Required Permissions
- `ads_read` - Read campaign data
- `ads_management` - Manage campaigns
- `business_management` - Access business accounts
- `insights` - Read performance metrics

---

## 🔍 Google Ads Setup

### Prerequisites
- Google Ads account
- Google Cloud Console access
- Manager account (optional, for MCC)

### Step-by-Step Instructions

#### 1. Apply for API Access
1. Go to [Google Ads API Center](https://ads.google.com/aw/apicenter)
2. Navigate to: Tools & Settings → Setup → API Center
3. Click **"Apply for Access"**
4. Fill out the application (Basic access is usually instant)
5. Copy your **Developer Token**

#### 2. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/projectcreate)
2. Create a new project (e.g., "AdFire Integration")
3. Note your Project ID

#### 3. Enable Google Ads API
1. Go to [API Library](https://console.cloud.google.com/apis/library/googleads.googleapis.com)
2. Select your project
3. Click **"Enable"**

#### 4. Create OAuth2 Credentials
1. Go to [Credentials Page](https://console.cloud.google.com/apis/credentials)
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Choose **"Web application"**
4. Add authorized redirect URI:
   ```
   https://developers.google.com/oauthplayground
   ```
5. Save your **Client ID** and **Client Secret**

#### 5. Generate Refresh Token
1. Go to [OAuth Playground](https://developers.google.com/oauthplayground)
2. Click settings gear → Check **"Use your own OAuth credentials"**
3. Enter your Client ID and Client Secret
4. In Step 1, find and select:
   ```
   https://www.googleapis.com/auth/adwords
   ```
5. Authorize and grant access
6. In Step 2, click **"Exchange authorization code for tokens"**
7. Copy the **Refresh Token**

#### 6. Get Customer IDs
1. Go to [Google Ads](https://ads.google.com)
2. Your Customer ID is in the top right (format: XXX-XXX-XXXX)
3. Remove dashes when entering (e.g., 1234567890)
4. If using a manager account, note both Customer IDs

#### 7. Add to AdFire
1. Go to Settings → Connections
2. Click **"Connect"** under Google Ads
3. Enter all credentials:
   - Developer Token
   - OAuth2 Client ID
   - OAuth2 Client Secret
   - Refresh Token
   - Customer ID
   - Manager Customer ID (optional)
4. Click **"Test Connection"** to verify
5. Click **"Save Connection"**

---

## 🔐 Security & Storage

### How Credentials Are Stored
- All API credentials are **encrypted** before storage
- Uses AES-256-GCM encryption
- Credentials are stored in the `metadata` field as encrypted JSON
- OAuth tokens are refreshed automatically

### Security Best Practices
1. **Never share** your API credentials
2. **Rotate tokens** regularly
3. **Use read-only access** when possible
4. **Monitor API usage** in provider dashboards
5. **Revoke access** for unused connections

---

## 🔄 Syncing Data

### Manual Sync
1. Go to Dashboard → Campaigns
2. Click **"Sync Data"** button (top right)
3. Select provider (Meta or Google)
4. Data syncs in background

### Automatic Sync
- Campaigns sync **every hour** automatically
- Check sync status in the top right panel
- Maximum 3 manual syncs per day per provider

### What Gets Synced

#### Meta (Facebook & Instagram)
- Campaigns
- Ad Sets
- Ads (Image, Video, Carousel)
- Performance metrics
- Platform-specific data (Facebook vs Instagram)

#### Google Ads
- Search Campaigns
- YouTube Video Campaigns
- Display Network Campaigns
- Shopping Campaigns
- Ad Groups
- All ad formats
- Performance metrics

---

## 📊 Viewing Your Data

### Campaign Overview
- Navigate to Dashboard → Campaigns
- Use platform filters to view specific platforms:
  - Facebook
  - Instagram
  - Google Search
  - YouTube
  - Google Display
  - Google Shopping

### Mobile-Optimized Views
All Google ad formats display as they appear on mobile devices:
- **Search Ads**: Mobile SERP layout
- **YouTube Ads**: Video player with skip button
- **Display Ads**: Banner formats
- **Shopping Ads**: Product cards with ratings

---

## 🛠️ Troubleshooting

### Common Issues

#### Meta Connection Issues
- **Invalid Token**: Regenerate token in Graph API Explorer
- **Permissions Error**: Ensure all required permissions are granted
- **Expired Token**: Tokens expire after 60 days, regenerate

#### Google Ads Connection Issues
- **Invalid Developer Token**: Check API Center for correct token
- **OAuth Error**: Regenerate refresh token in OAuth Playground
- **Customer ID Error**: Remove dashes, use numbers only
- **Access Denied**: Ensure API is enabled in Cloud Console

### Testing Connections
1. After entering credentials, always click **"Test Connection"**
2. Check for success message
3. If test fails, verify each credential
4. Check provider's API dashboard for errors

---

## 📱 Support & Help

### In-App Help
- Click the **"?"** icon in Settings → Connections
- Hover over field labels for tooltips
- Check status badges for connection health

### External Resources
- [Meta Business Help Center](https://www.facebook.com/business/help)
- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/start)
- [AdFire Support](mailto:support@adfire.com)

---

## ✅ Quick Checklist

### Meta Setup Checklist
- [ ] Created Meta app in Facebook Developers
- [ ] Added Marketing API product
- [ ] Copied App ID
- [ ] Copied App Secret
- [ ] Generated Access Token with permissions
- [ ] Tested connection in AdFire
- [ ] Saved connection

### Google Ads Setup Checklist
- [ ] Applied for API access (Developer Token)
- [ ] Created Google Cloud project
- [ ] Enabled Google Ads API
- [ ] Created OAuth2 credentials
- [ ] Generated Refresh Token
- [ ] Found Customer ID(s)
- [ ] Tested connection in AdFire
- [ ] Saved connection

---

## 🎯 Next Steps

1. **Connect Your Accounts**: Start with one platform
2. **Run Initial Sync**: Sync your campaign data
3. **Review Campaigns**: Check the campaign overview
4. **Enable AI Recommendations**: Get optimization suggestions
5. **Set Up Alerts**: Configure notification preferences

---

## 🔒 Privacy & Compliance

- AdFire is **SOC 2 Type II** compliant
- All data transmission uses **TLS 1.3**
- Credentials are **encrypted at rest**
- We never access your ad accounts without permission
- You can revoke access anytime from Settings

---

**Need Help?** Contact support@adtiger.com or use the in-app chat.