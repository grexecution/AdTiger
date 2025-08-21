"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Icons } from "@/components/icons"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/registry/new-york/ui/navigation-menu"
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
  Activity
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

export function MainNav() {
  const pathname = usePathname()

  return (
    <div className="mr-4 hidden md:flex">
      <Link href="/" className="mr-4 flex items-center gap-2 lg:mr-6">
        <Zap className="h-6 w-6 text-primary" />
        <span className="hidden font-bold lg:inline-block">
          AdTiger
        </span>
      </Link>
      
      <NavigationMenu>
        <NavigationMenuList>
          {/* Analytics Dropdown */}
          <NavigationMenuItem>
            <NavigationMenuTrigger>Analytics</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                {analyticsItems.map((item) => (
                  <ListItem
                    key={item.href}
                    title={item.title}
                    href={item.href}
                    icon={item.icon}
                  >
                    {item.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Optimization Dropdown */}
          <NavigationMenuItem>
            <NavigationMenuTrigger>Optimization</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                {optimizationItems.map((item) => (
                  <ListItem
                    key={item.href}
                    title={item.title}
                    href={item.href}
                    icon={item.icon}
                  >
                    {item.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Direct Links */}
          <NavigationMenuItem>
            <Link href="/recommendations" legacyBehavior passHref>
              <NavigationMenuLink className={cn(
                "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                pathname === "/recommendations" && "bg-accent/50"
              )}>
                Recommendations
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>

          {/* Settings Dropdown */}
          <NavigationMenuItem>
            <NavigationMenuTrigger>Settings</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                {settingsItems.map((item) => (
                  <ListItem
                    key={item.href}
                    title={item.title}
                    href={item.href}
                    icon={item.icon}
                  >
                    {item.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}

const ListItem = ({ 
  className, 
  title, 
  children, 
  icon: Icon, 
  ...props 
}: {
  className?: string
  title: string
  children: React.ReactNode
  icon?: any
  href: string
}) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            <div className="text-sm font-medium leading-none">{title}</div>
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}