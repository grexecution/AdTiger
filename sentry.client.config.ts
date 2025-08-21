import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    ignoreErrors: [
      "top.GLOBALS",
      "Network request failed",
      "NetworkError",
      "Failed to fetch",
    ],
    beforeSend(event, hint) {
      if (event.exception) {
        const error = hint.originalException
        if (error && error.toString && error.toString().includes("extension://")) {
          return null
        }
      }
      return event
    },
  })
}