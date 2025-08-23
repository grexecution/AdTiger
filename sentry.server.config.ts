import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    environment: process.env.NODE_ENV,
    ignoreErrors: [
      "Invalid credentials",
      "Unauthorized",
    ],
    beforeSend(event, hint) {
      if (process.env.NODE_ENV === "development") {
        console.error("Sentry Event:", event)
        return null
      }
      
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers["authorization"]
          delete event.request.headers["x-api-key"]
        }
        
        if (event.request.cookies) {
          delete event.request.cookies["session"]
          delete event.request.cookies["auth-token"]
        }
      }
      
      return event
    },
  })
}