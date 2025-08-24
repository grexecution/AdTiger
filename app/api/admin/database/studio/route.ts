import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'import { UserRole } from "@prisma/client"

export const dynamic = 'force-dynamic'import { exec } from "child_process"

export const dynamic = 'force-dynamic'import { promisify } from "util"

export const dynamic = 'force-dynamic'
const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    // Start Prisma Studio on a specific port
    const port = 5555
    const studioUrl = `http://localhost:${port}`
    
    // Check if Prisma Studio is already running
    try {
      const response = await fetch(studioUrl)
      if (response.ok) {
        return NextResponse.json({ 
          url: studioUrl,
          status: "running"
        })
      }
    } catch (error) {
      // Studio not running, start it
    }

    // Start Prisma Studio in the background
    exec(`npx prisma studio --port ${port} --browser none`, {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL
      }
    })

    // Wait a moment for it to start
    await new Promise(resolve => setTimeout(resolve, 2000))

    return NextResponse.json({ 
      url: studioUrl,
      status: "started",
      message: "Prisma Studio is starting..."
    })

  } catch (error) {
    console.error("Failed to start Prisma Studio:", error)
    return NextResponse.json(
      { error: "Failed to start database studio" },
      { status: 500 }
    )
  }
}