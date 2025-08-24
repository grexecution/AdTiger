# Vercel Deployment Setup

## Required Environment Variables

You MUST set these environment variables in Vercel for the app to work properly:

### 1. AUTH_SECRET (CRITICAL!)
Generate a secure random string for NextAuth session encryption:
```bash
openssl rand -base64 32
```
Set this value as `AUTH_SECRET` in Vercel environment variables.

### 2. NEXTAUTH_URL
Set to your Vercel deployment URL:
- Production: `https://your-app.vercel.app`
- Preview: Can use the same or leave empty for auto-detection

### 3. Database
Set your PostgreSQL connection string:
```
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

### 4. Optional Services
- `BULLMQ_REDIS_URL` - If you want to use queue features (not required for basic functionality)
- `META_APP_ID`, `META_APP_SECRET` - For Meta Ads integration
- `OPENAI_API_KEY` - For AI features

## Setting Environment Variables in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with the appropriate value
4. Make sure to select the correct environments (Production, Preview, Development)
5. Redeploy after adding variables

## Common Issues

### "Auto logged in" or "Can't log out"
This happens when `AUTH_SECRET` is not set. The auth system creates invalid sessions without it.

### "Cannot access login page"
The middleware redirects authenticated users away from auth pages. If you have an invalid session due to missing `AUTH_SECRET`, you'll be stuck in a redirect loop.

### Fix Steps:
1. Set `AUTH_SECRET` in Vercel
2. Clear your browser cookies for the domain
3. Redeploy the application
4. Try accessing the site again

## Testing Authentication

After setting up environment variables:

1. Visit `/auth/login`
2. Use demo credentials:
   - admin@demo.com / admin123
   - pro@demo.com / demo123
   - free@demo.com / demo123
3. Verify logout works properly