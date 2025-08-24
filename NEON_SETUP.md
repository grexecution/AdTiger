# Neon Database Setup for Production

## Local Development
Your local development uses PostgreSQL on localhost. Make sure it's running:
```bash
# macOS with Homebrew
brew services start postgresql@15

# Create local database
createdb adtiger

# Push schema
npx prisma db push

# Seed demo data
npx prisma db seed
```

## Production Setup with Neon

### 1. Create Neon Database
1. Go to https://neon.tech
2. Sign up/Login with GitHub
3. Click **"Create a project"**
4. Name it: `adtiger`
5. Region: Choose closest to your users
6. Click **"Create project"**

### 2. Get Connection String
After creation, Neon shows your connection string:
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

Example:
```
postgresql://alex:AbC123dEf@ep-cool-darkness-123456.us-east-2.aws.neon.tech/adtiger?sslmode=require
```

### 3. Add to Vercel Environment Variables

Go to your Vercel project → Settings → Environment Variables

Add these variables:

**DATABASE_URL** (Production only):
```
[Your Neon connection string]
```

**AUTH_SECRET** (All environments):
```
[Your existing AUTH_SECRET]
```

### 4. Initialize Database

After adding environment variables, you need to create tables and seed data.

**Option A: Using Neon SQL Editor**
1. Go to Neon dashboard → SQL Editor
2. Run this command to get the schema SQL:
```bash
# On your local machine
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > neon-schema.sql
```
3. Copy the contents of `neon-schema.sql`
4. Paste and run in Neon SQL Editor

**Option B: Using Local Prisma**
```bash
# Set Neon URL temporarily
export DATABASE_URL="[Your Neon connection string]"

# Push schema
npx prisma db push

# Seed with demo users
npx prisma db seed
```

### 5. Verify Deployment

1. Redeploy on Vercel (it will use the new DATABASE_URL)
2. Visit your app
3. Login with demo credentials:
   - admin@demo.com / admin123
   - pro@demo.com / demo123
   - free@demo.com / demo123

## Environment Variables Summary

### Local (.env.local)
```env
DATABASE_URL="postgresql://[your-user]@localhost:5432/adtiger?schema=public"
AUTH_SECRET="[your-secret]"
```

### Production (Vercel)
```env
DATABASE_URL="postgresql://[neon-connection-string]"
AUTH_SECRET="[same-secret-as-local]"
```

## Troubleshooting

### "Can't connect to database" on Vercel
- Check DATABASE_URL is set correctly in Vercel
- Make sure you selected "Production" environment
- Verify Neon project is active (not suspended)

### "No tables found" error
- Run `npx prisma db push` with Neon DATABASE_URL
- Or use Neon SQL Editor to create tables manually

### Login not working
- Ensure AUTH_SECRET is set in Vercel
- Clear browser cookies
- Check demo users exist in database

## Database Management

### View Data
- Use Neon dashboard → Tables
- Or connect with any PostgreSQL client

### Reset Database
```bash
# With Neon URL
export DATABASE_URL="[neon-url]"
npx prisma db push --force-reset
npx prisma db seed
```