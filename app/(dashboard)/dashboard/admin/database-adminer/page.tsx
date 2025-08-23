import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UserRole } from "@prisma/client"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Database, ExternalLink, AlertCircle, Shield } from "lucide-react"
import Link from "next/link"

export default async function AdminDatabaseAdminerPage() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard")
  }

  // Parse database URL to get connection details
  const dbUrl = process.env.DATABASE_URL || ""
  const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):?([^@]*)@([^:]+):(\d+)\/([^?]+)/)
  
  const dbConfig = urlParts ? {
    username: urlParts[1],
    password: urlParts[2] || "",
    host: urlParts[3],
    port: urlParts[4],
    database: urlParts[5]
  } : null

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <AdminHeader />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Management Options
          </CardTitle>
          <CardDescription>
            Choose your preferred database management tool
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prisma Studio Option */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Prisma Studio (Recommended)</h3>
                <p className="text-sm text-muted-foreground">
                  Built-in database GUI optimized for Prisma schemas
                </p>
              </div>
              <Button asChild>
                <Link href="/dashboard/admin/database">
                  Open Prisma Studio
                </Link>
              </Button>
            </div>
            <div className="text-sm space-y-1">
              <p>✅ No additional setup required</p>
              <p>✅ Understands Prisma relationships</p>
              <p>✅ Safe data editing with validation</p>
            </div>
          </div>

          {/* Direct SQL Option */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Direct Database Access</h3>
                <p className="text-sm text-muted-foreground">
                  Use external tools like TablePlus, DBeaver, or pgAdmin
                </p>
              </div>
            </div>
            
            {dbConfig ? (
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  <strong>Connection Details:</strong>
                  <div className="mt-2 space-y-1 font-mono text-xs">
                    <div>Host: {dbConfig.host}</div>
                    <div>Port: {dbConfig.port}</div>
                    <div>Database: {dbConfig.database}</div>
                    <div>Username: {dbConfig.username}</div>
                    <div>Password: {dbConfig.password ? "•".repeat(8) : "(no password)"}</div>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Database connection details not available
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <a href="https://tableplus.com/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  TablePlus
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://dbeaver.io/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  DBeaver
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://www.pgadmin.org/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  pgAdmin
                </a>
              </Button>
            </div>
          </div>

          {/* Docker Adminer Option */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Adminer (Docker)</h3>
                <p className="text-sm text-muted-foreground">
                  Lightweight phpMyAdmin alternative
                </p>
              </div>
            </div>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Run Adminer with Docker:</strong>
                <div className="mt-2 p-2 bg-muted rounded font-mono text-xs">
                  docker run -p 8080:8080 -e ADMINER_DEFAULT_SERVER=host.docker.internal adminer
                </div>
                <p className="mt-2 text-sm">
                  Then access at <a href="http://localhost:8080" target="_blank" rel="noopener noreferrer" className="underline">http://localhost:8080</a>
                </p>
              </AlertDescription>
            </Alert>
          </div>

          {/* Terminal Option */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Terminal Access</h3>
                <p className="text-sm text-muted-foreground">
                  Direct database access via psql
                </p>
              </div>
            </div>
            
            <div className="p-2 bg-muted rounded font-mono text-xs">
              psql {dbUrl}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}