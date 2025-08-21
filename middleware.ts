import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

const publicRoutes = [
  "/auth/login",
  "/auth/login-v2",
  "/auth/register",
  "/auth/register-v2",
  "/auth/error",
  "/auth/verify",
  "/api/auth",
]

const protectedRoutes = [
  "/dashboard",
  "/settings",
  "/campaigns",
  "/recommendations",
  "/insights",
  "/api",
]

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
  const session = await auth()
  
  if (isProtectedRoute && !session) {
    const loginUrl = new URL("/auth/login-v2", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  if (pathname.startsWith("/api") && session?.user?.accountId) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-account-id", session.user.accountId)
    requestHeaders.set("x-user-id", session.user.id)
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
  
  if (session && pathname.startsWith("/auth/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}