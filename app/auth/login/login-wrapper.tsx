"use client"

import { useSearchParams } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { UserAuthForm } from "./user-auth-form"

export function LoginWrapper() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  return (
    <>
      {error === "DatabaseError" && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Database Connection Error</AlertTitle>
          <AlertDescription>
            Unable to connect to the database. Please ensure the database is properly configured and running.
            {process.env.NODE_ENV === "development" && (
              <div className="mt-2 text-xs">
                For local development: Make sure PostgreSQL is running on localhost:5432
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      <UserAuthForm />
    </>
  )
}