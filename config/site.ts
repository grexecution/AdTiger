export const siteConfig = {
  name: "AdTiger",
  url: "https://adtiger.io",
  ogImage: "https://adtiger.io/og.jpg",
  description:
    "AI-powered performance marketing dashboard that helps marketers optimize their ad campaigns across multiple platforms with intelligent recommendations and automated insights.",
  links: {
    twitter: "https://twitter.com/adtiger",
    github: "https://github.com/adtiger",
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
