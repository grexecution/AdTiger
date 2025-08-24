# IMPORTANT: Vercel Database Setup

## You MUST set DATABASE_URL in Vercel

### Step 1: Get a Database (Choose ONE)

#### Option A: Neon (Recommended - Easiest)
1. Go to https://neon.tech
2. Sign up with GitHub
3. Create project "adtiger"
4. Copy the connection string shown (looks like):
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

#### Option B: Supabase
1. Go to https://supabase.com
2. Create project
3. Go to Settings → Database
4. Use the "Connection string" → "URI" tab
5. Copy and replace [YOUR-PASSWORD] with actual password

#### Option C: Vercel Postgres
1. In Vercel dashboard, go to Storage
2. Create Postgres database
3. It will automatically add DATABASE_URL

### Step 2: Add to Vercel

1. Go to your Vercel project
2. Click **Settings** → **Environment Variables**
3. Add new variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Your connection string from Step 1
   - **Environment:** Select all (Production, Preview, Development)
4. Click **Save**

### Step 3: Redeploy

1. Go to **Deployments** tab
2. Click three dots on latest deployment
3. Click **Redeploy**
4. Click **Redeploy** in popup

## Verify It Works

After deployment:
1. Check build logs - should see "✅ Tables created!"
2. Visit your app
3. Try login with: admin@demo.com / admin123

## If It Still Doesn't Work

The DATABASE_URL must:
- Start with `postgresql://` or `postgres://`
- Be a valid PostgreSQL connection
- Be accessible from Vercel's servers

Common issues:
- Wrong password
- Database not created yet
- Connection string has typos
- Using local database URL (localhost) instead of cloud

## Manual Setup (If Automatic Fails)

1. Install Neon CLI or use their web console
2. Run this SQL to create tables:
   ```sql
   -- Get this from: npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
   ```
3. Or locally with cloud database:
   ```bash
   export DATABASE_URL="your-cloud-database-url"
   npx prisma db push
   npx prisma db seed
   ```