import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

const publicRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/error",
  "/auth/verify",
  "/api/auth",
  "/api/cron", // Allow cron jobs with their own auth
  "/api/image-proxy", // Allow image proxy for Facebook CDN access
]

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if it's a public route or static asset
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  ) || pathname === "/"
  
  let session = null
  
  try {
    // Get session - this will fail if database is not connected
    session = await auth()
  } catch (error) {
    // Database connection error - redirect to login with error
    console.error("Database connection error in middleware:", error)
    
    // Only redirect to error if not already on an auth page
    if (!pathname.startsWith("/auth/")) {
      const errorUrl = new URL("/auth/login", request.url)
      errorUrl.searchParams.set("error", "DatabaseError")
      return NextResponse.redirect(errorUrl)
    }
    
    // Let auth pages through even with database error
    return NextResponse.next()
  }
  
  // If not authenticated and not on a public route, redirect to login
  if (!session && !isPublicRoute) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // If authenticated and trying to access auth pages, redirect to dashboard
  if (session && pathname.startsWith("/auth/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  
  // If authenticated and on root, redirect to dashboard
  if (session && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  
  // Add account headers for API routes
  if (pathname.startsWith("/api") && session?.user) {
    const requestHeaders = new Headers(request.headers)
    if (session.user.accountId) {
      requestHeaders.set("x-account-id", session.user.accountId)
    }
    requestHeaders.set("x-user-id", session.user.id)
    requestHeaders.set("x-user-role", session.user.role)
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt (robots file)
     * - sitemap.xml (sitemap file)
     * - site.webmanifest (PWA manifest)
     * - images/icons in public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|site.webmanifest|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico).*)",
  ],
}