"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Database, Loader2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react"

export function DatabaseStudio() {
  const [studioUrl, setStudioUrl] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "starting" | "running" | "error">("idle")
  const [error, setError] = useState("")

  const startStudio = async () => {
    setLoading(true)
    setError("")
    setStatus("starting")
    
    try {
      const response = await fetch("/api/admin/database/studio")
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to start studio")
      }
      
      setStudioUrl(data.url)
      setStatus("running")
      
      // Open in new tab after a delay
      setTimeout(() => {
        window.open(data.url, "_blank")
      }, 2000)
      
    } catch (err) {
      console.error("Failed to start Prisma Studio:", err)
      setError(err instanceof Error ? err.message : "Failed to start database studio")
      setStatus("error")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case "running":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Running</Badge>
      case "starting":
        return <Badge className="bg-yellow-100 text-yellow-800"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Starting</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>
      default:
        return <Badge variant="outline">Not Started</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Prisma Studio
              </CardTitle>
              <CardDescription>
                Visual database management interface with full CRUD capabilities
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Prisma Studio Features:</strong>
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>Browse all tables and data</li>
                <li>Create, read, update, and delete records</li>
                <li>Filter and sort data</li>
                <li>Export data to CSV/JSON</li>
                <li>Manage relationships between tables</li>
                <li>Real-time data updates</li>
              </ul>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === "running" && studioUrl && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Prisma Studio is running at{" "}
                <a 
                  href={studioUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-mono underline"
                >
                  {studioUrl}
                </a>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={startStudio} 
              disabled={loading || status === "running"}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting Studio...
                </>
              ) : status === "running" ? (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Open Studio
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Start Prisma Studio
                </>
              )}
            </Button>

            {status === "running" && (
              <Button 
                variant="outline"
                onClick={() => window.open(studioUrl, "_blank")}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
            )}

            {status === "error" && (
              <Button 
                variant="outline"
                onClick={startStudio}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            )}
          </div>

          {status === "starting" && (
            <div className="text-sm text-muted-foreground">
              <p>Starting Prisma Studio... This may take a few seconds.</p>
              <p>A new tab will open automatically when ready.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alternative: Manual Access</CardTitle>
          <CardDescription>
            You can also run Prisma Studio manually from your terminal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <code className="text-sm">
              DATABASE_URL="postgresql://gregorwallner@localhost:5432/adtiger?schema=public" npx prisma studio
            </code>
          </div>
          <p className="text-sm text-muted-foreground">
            Run this command in your project directory to open Prisma Studio at{" "}
            <span className="font-mono">http://localhost:5555</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}