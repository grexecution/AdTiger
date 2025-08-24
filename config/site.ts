export const siteConfig = {
  name: "AdFire",
  url: "https://adfire.io",
  ogImage: "https://adfire.io/og.jpg",
  description:
    "AI-powered performance marketing dashboard that helps marketers optimize their ad campaigns across multiple platforms with intelligent recommendations and automated insights.",
  links: {
    twitter: "https://twitter.com/adfire",
    github: "https://github.com/adfire",
    support: "/support",
    docs: "/docs",
    privacy: "/privacy",
  },
  features: {
    campaigns: "Campaign Management",
    recommendations: "AI Recommendations",
    insights: "Performance Insights",
    reports: "Custom Reports",
    connections: "Platform Connections",
    analytics: "Advanced Analytics",
  },
}

export type SiteConfig = typeof siteConfig

export const META_THEME_COLORS = {
  light: "#ffffff",
  dark: "#09090b",
}
