import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'import { getMetaOAuthUrl } from "@/lib/meta-auth"

export const dynamic = 'force-dynamic'import { nanoid } from "nanoid"

export const dynamic = 'force-dynamic'
export async function GET() {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  // Generate a state parameter for CSRF protection
  // In production, you should store this in a database or session
  const state = nanoid()
  
  // For now, we'll encode the user data in the state
  // In production, use a proper session store
  const encodedState = Buffer.from(
    JSON.stringify({
      userId: session.user.id,
      accountId: session.user.accountId,
      state: state,
    })
  ).toString("base64")
  
  const authUrl = getMetaOAuthUrl(encodedState)
  
  return NextResponse.redirect(authUrl)
}