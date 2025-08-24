# 🔥 AdFire - AI Performance Marketing Dashboard

AdFire is an AI-powered performance marketing dashboard that helps marketers optimize their ad campaigns across multiple platforms with automated insights and recommendations.

## 🚀 Features

- **Multi-Platform Support**: Connect Meta (Facebook/Instagram) Ads with Google and TikTok coming soon
- **Real-time Analytics**: Interactive dashboards with performance metrics and trends
- **AI Recommendations**: Get data-driven suggestions to optimize your campaigns
- **Campaign Management**: View and manage all your campaigns in one place
- **Automated Sync**: Keep your data up-to-date with scheduled syncs
- **Feedback Loop**: Rate recommendations to improve AI suggestions over time

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Meta App credentials (for Facebook/Instagram Ads)

## 🛠️ Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/adtiger.git
cd adtiger
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your configuration:
- Database URL (PostgreSQL)
- Auth secret (generate with `openssl rand -base64 32`)
- Meta App credentials

4. **Set up the database:**
```bash
npx prisma db push
```

5. **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3333](http://localhost:3333) to see the application.

## 🚢 Deployment to Vercel

1. **Push to GitHub:**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Deploy on Vercel:**
- Connect your GitHub repository to Vercel
- Add environment variables in Vercel dashboard
- Deploy!

### Required Environment Variables for Vercel:

```
DATABASE_URL
AUTH_SECRET
NEXTAUTH_URL (set to your production URL)
META_APP_ID
META_APP_SECRET
```

## 🔧 Configuration

### Meta Ads Setup

1. Create a Meta App at [developers.facebook.com](https://developers.facebook.com)
2. Add Marketing API to your app
3. Get your App ID and App Secret
4. Add OAuth redirect URI: `https://yourdomain.com/api/meta/callback`
5. Request necessary permissions (ads_management, ads_read, business_management, read_insights)

## 📚 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI**: shadcn/ui with Tailwind CSS
- **Charts**: Recharts
- **Deployment**: Vercel

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js and AI