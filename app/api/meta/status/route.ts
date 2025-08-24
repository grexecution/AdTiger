import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export async function GET() {
  const isConfigured = !!(
    process.env.META_APP_ID && 
    process.env.META_APP_SECRET &&
    process.env.META_APP_ID !== "your-meta-app-id" &&
    process.env.META_APP_SECRET !== "your-meta-app-secret"
  )
  
  return NextResponse.json({
    configured: isConfigured,
    hasAppId: !!process.env.META_APP_ID,
    hasAppSecret: !!process.env.META_APP_SECRET,
  })
}