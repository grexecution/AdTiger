import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

const publicRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/error",
  "/auth/verify",
  "/api/auth",
]

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if it's a public route or static asset
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  ) || pathname === "/"
  
  // Get session
  const session = await auth()
  
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
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}