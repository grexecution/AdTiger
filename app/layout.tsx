import "@/styles/globals.css"
import { Metadata, Viewport } from "next"

import { META_THEME_COLORS, siteConfig } from "@/config/site"
import { fontMono, fontSans } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { Analytics } from "@/components/analytics"
import { ThemeProvider } from "@/components/providers"
import { AuthProvider } from "@/components/providers/auth-provider"
import { Toaster as DefaultToaster } from "@/registry/default/ui/toaster"
import { Toaster as NewYorkSonner } from "@/components/ui/sonner"
import { Toaster as NewYorkToaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: {
    default: "AdFire - AI Autopilot for Performance Marketing | Automate Meta & Google Ads",
    template: `%s | AdFire - AI Marketing Automation`,
  },
  metadataBase: new URL(siteConfig.url),
  description: "Stop doing manual ad optimization. AdFire's AI autopilot automatically manages your Meta & Google ads 24/7. Increase ROAS by 47% on average. Start free automation today.",
  keywords: [
    "AI marketing automation",
    "automated ad optimization",
    "performance marketing software",
    "Meta ads automation",
    "Google ads autopilot",
    "Facebook ads AI",
    "Instagram ads automation",
    "ROAS optimization tool",
    "campaign automation platform",
    "ad management software",
    "marketing AI assistant",
    "PPC automation",
    "programmatic advertising",
    "digital marketing automation",
    "ad spend optimization"
  ],
  authors: [
    {
      name: "AdFire",
      url: "https://adfire.io",
    },
  ],
  creator: "AdFire",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: "AdFire - AI Autopilot for Performance Marketing",
    description: "Stop doing manual ad optimization. AdFire's AI autopilot automatically manages your Meta & Google ads 24/7. Increase ROAS by 47% on average.",
    siteName: "AdFire",
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AdFire - AI Autopilot for Performance Marketing",
    description: "Stop doing manual ad optimization. AdFire's AI autopilot automatically manages your Meta & Google ads 24/7. Increase ROAS by 47%.",
    images: [siteConfig.ogImage],
    creator: "@adfire",
    site: "@adfire",
  },
  alternates: {
    canonical: siteConfig.url,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: `${siteConfig.url}/site.webmanifest`,
}

export const viewport: Viewport = {
  themeColor: META_THEME_COLORS.light,
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
              try {
                // Always use light theme
                localStorage.theme = 'light';
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
              } catch (_) {}
            `,
            }}
          />
        </head>
        <body
          className={cn(
            "min-h-svh bg-background font-sans antialiased",
            fontSans.variable,
            fontMono.variable
          )}
        >
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              disableTransitionOnChange
              enableColorScheme
            >
              <div vaul-drawer-wrapper="" style={{ background: '#f2f2f2' }}>
                <div className="relative flex min-h-svh flex-col">
                  {children}
                </div>
              </div>
              <Analytics />
              <NewYorkToaster />
              <DefaultToaster />
              <NewYorkSonner />
            </ThemeProvider>
          </AuthProvider>
        </body>
      </html>
    </>
  )
}
