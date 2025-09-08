"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  BrainCircuit,
  Cable,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  Settings,
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Activity,
  Zap,
  Calendar,
  FolderOpen,
  AlertCircle,
  ChevronRight,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

interface NavSection {
  title: string
  items: NavItem[]
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  disabled?: boolean
  subItems?: {
    title: string
    href: string
  }[]
}

const navSections: NavSection[] = [
  {
    title: "Main",
    items: [
      {
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Campaigns",
        href: "/dashboard/campaigns",
        icon: Megaphone,
        subItems: [
          { title: "All Campaigns", href: "/dashboard/campaigns" },
          { title: "Active", href: "/dashboard/campaigns/active" },
          { title: "Paused", href: "/dashboard/campaigns/paused" },
          { title: "Ended", href: "/dashboard/campaigns/ended" },
        ],
      },
      {
        title: "Ad Sets",
        href: "/dashboard/adsets",
        icon: FolderOpen,
      },
      {
        title: "Ads",
        href: "/dashboard/ads",
        icon: Target,
      },
    ],
  },
  {
    title: "Intelligence",
    items: [
      {
        title: "Recommendations",
        href: "/dashboard/recommendations",
        icon: BrainCircuit,
        badge: "New",
      },
      {
        title: "Insights",
        href: "/dashboard/insights",
        icon: Lightbulb,
      },
      {
        title: "Alerts",
        href: "/dashboard/alerts",
        icon: AlertCircle,
        badge: 3,
      },
      {
        title: "Playbooks",
        href: "/dashboard/playbooks",
        icon: Zap,
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Schedule",
        href: "/dashboard/schedule",
        icon: Calendar,
      },
      {
        title: "Connections",
        href: "/dashboard/connections",
        icon: Cable,
        subItems: [
          { title: "Overview", href: "/dashboard/connections" },
          { title: "Meta", href: "/dashboard/connections/meta" },
          { title: "Google", href: "/dashboard/connections/google" },
          { title: "TikTok", href: "/dashboard/connections/tiktok" },
        ],
      },
      {
        title: "Team",
        href: "/dashboard/team",
        icon: Users,
      },
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
]

export function SidebarNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(["Main", "Intelligence"])

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  return (
    <nav className={cn("space-y-6 py-4", className)}>
      {navSections.map((section) => (
        <div key={section.title} className="space-y-1">
          <button
            onClick={() => toggleSection(section.title)}
            className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            {section.title}
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform",
                expandedSections.includes(section.title) && "rotate-90"
              )}
            />
          </button>
          {expandedSections.includes(section.title) && (
            <div className="space-y-1">
              {section.items.map((item) => (
                <div key={item.href}>
                  {item.subItems ? (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant={pathname.startsWith(item.href) ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start",
                            item.disabled && "opacity-50 cursor-not-allowed"
                          )}
                          disabled={item.disabled}
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.title}
                          {item.badge && (
                            <Badge variant="outline" className="ml-auto">
                              {item.badge}
                            </Badge>
                          )}
                          <ChevronRight className="ml-auto h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 px-4">
                        {item.subItems.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              "block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                              pathname === subItem.href && "bg-accent"
                            )}
                          >
                            {subItem.title}
                          </Link>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <Link href={item.href}>
                      <Button
                        variant={pathname === item.href ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start",
                          item.disabled && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={item.disabled}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                        {item.badge && (
                          <Badge 
                            variant={typeof item.badge === "number" ? "destructive" : "outline"} 
                            className="ml-auto"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}