"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useUserRole } from "@/hooks/use-user-role"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { 
  BarChart3, 
  Target, 
  Lightbulb, 
  BookOpen, 
  Settings2, 
  Database,
  TrendingUp,
  Users,
  Zap,
  Link2,
  Bell,
  Shield,
  Calendar,
  TestTube,
  Activity,
  ChevronDown
} from "lucide-react"

const analyticsItems = [
  {
    title: "Dashboard",
    href: "/dashboard/analytics",
    description: "Overview of key performance metrics",
    icon: BarChart3,
  },
  {
    title: "Campaigns",
    href: "/campaigns",
    description: "Manage and monitor campaigns",
    icon: Target,
  },
  {
    title: "Ad Groups",
    href: "/ad-groups", 
    description: "Ad group performance and management",
    icon: Users,
  },
  {
    title: "Ads",
    href: "/ads",
    description: "Individual ad performance",
    icon: Activity,
  },
]

const optimizationItems = [
  {
    title: "Recommendations",
    href: "/recommendations",
    description: "AI-powered optimization suggestions",
    icon: Lightbulb,
  },
  {
    title: "Playbooks",
    href: "/settings/playbooks",
    description: "Optimization rules and strategies",
    icon: BookOpen,
  },
  {
    title: "Anomalies",
    href: "/anomalies",
    description: "Detect unusual performance changes",
    icon: TrendingUp,
  },
  {
    title: "Experiments",
    href: "/experiments",
    description: "A/B testing and experiments",
    icon: TestTube,
  },
]

const settingsItems = [
  {
    title: "Integrations",
    href: "/settings/integrations",
    description: "Connect Meta and Google Ads",
    icon: Link2,
  },
  {
    title: "ETL Pipeline",
    href: "/settings/etl",
    description: "Data sync and job monitoring",
    icon: Database,
  },
  {
    title: "Account Settings",
    href: "/settings/account",
    description: "Profile and preferences",
    icon: Settings2,
  },
  {
    title: "Notifications",
    href: "/settings/notifications",
    description: "Alerts and notification channels",
    icon: Bell,
  },
]

const adminItems = [
  {
    title: "Admin Dashboard",
    href: "/dashboard/admin",
    description: "System administration overview",
    icon: Shield,
  },
  {
    title: "User Management",
    href: "/dashboard/admin/users",
    description: "Manage all users and accounts",
    icon: Users,
  },
  {
    title: "Database Explorer",
    href: "/dashboard/admin/database",
    description: "Visual database interface",
    icon: Database,
  },
]

export function MainNav() {
  const pathname = usePathname()
  const { isAdmin } = useUserRole()

  return (
    <div className="mr-4 hidden md:flex items-center space-x-6">
      <Link href="/" className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-primary" />
        <span className="font-bold">AdTiger</span>
      </Link>
      
      <nav className="flex items-center space-x-4">
        {/* Dashboard Link */}
        <Link href="/dashboard" className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/dashboard" ? "text-foreground" : "text-foreground/60"
        )}>
          Dashboard
        </Link>

        {/* Campaigns Link */}
        <Link href="/dashboard/campaigns" className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname.startsWith("/dashboard/campaigns") ? "text-foreground" : "text-foreground/60"
        )}>
          Campaigns
        </Link>

        {/* Recommendations Link */}
        <Link href="/dashboard/recommendations" className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname.startsWith("/dashboard/recommendations") ? "text-foreground" : "text-foreground/60"
        )}>
          Recommendations
        </Link>

        {/* Settings Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              Settings
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {settingsItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} className="flex items-center">
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Admin Dropdown - Only visible to admins */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-red-600">
                <Shield className="h-4 w-4" />
                Admin
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Admin Panel</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {adminItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="flex items-center">
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
    </div>
  )
}

