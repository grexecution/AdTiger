"use client"

import * as React from "react"
import { useSession, signOut } from "next-auth/react"
import {
  LayoutDashboard,
  FileText,
  Cable,
  Settings,
  Users,
  User,
  AlertCircle,
  Command,
  Plus,
  Mail,
  SquareArrowUpRight,
  LogOut,
  Shield,
  Database,
  Activity,
  Megaphone,
  TrendingUp,
  BrainCircuit,
  ChartBar,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"

// Customer navigation items - available to all logged in users
const customerItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    badge: undefined as string | undefined,
  },
  {
    title: "Campaigns",
    url: "/dashboard/campaigns",
    icon: Megaphone,
    badge: undefined as string | undefined,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: ChartBar,
    badge: undefined as string | undefined,
  },
  {
    title: "Insights",
    url: "/dashboard/recommendations",
    icon: BrainCircuit,
    badge: undefined as string | undefined,
  },
]

// Settings items - available to customers
const settingsItems = [
  {
    title: "Connections",
    url: "/dashboard/settings/connections",
    icon: Cable,
    badge: undefined as string | undefined,
  },
  {
    title: "Account",
    url: "/dashboard/settings/account",
    icon: Settings,
    badge: undefined as string | undefined,
  },
  {
    title: "Profile",
    url: "/dashboard/settings/profile",
    icon: User,
    badge: undefined as string | undefined,
  },
]

// Admin navigation items
const adminItems = [
  {
    title: "Admin Dashboard",
    url: "/dashboard/admin",
    icon: Shield,
    badge: undefined as string | undefined,
  },
  {
    title: "User Management",
    url: "/dashboard/admin/users",
    icon: Users,
    badge: undefined as string | undefined,
  },
  {
    title: "Database Studio",
    url: "/dashboard/admin/database",
    icon: Database,
    badge: "Prisma" as string | undefined,
  },
  {
    title: "Database Tools",
    url: "/dashboard/admin/database-adminer",
    icon: Database,
    badge: undefined as string | undefined,
  },
  {
    title: "System Health",
    url: "/dashboard/admin/health",
    icon: Activity,
    badge: undefined as string | undefined,
  },
]

// Coming soon features - organized by priority
const comingSoonItems = [
  {
    title: "Reports",
    url: "/dashboard/reports",
    icon: FileText,
    badge: "Soon",
    disabled: true,
  },
  {
    title: "Alerts",
    url: "/dashboard/alerts",
    icon: AlertCircle,
    badge: "Soon",
    disabled: true,
  },
]

const miscItems = [
  {
    title: "Documentation",
    url: "/docs",
    icon: SquareArrowUpRight,
    badge: "Soon",
    disabled: true,
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export function AppSidebar({ ...props }: AppSidebarProps) {
  const { state } = useSidebar()
  const { data: session, status } = useSession()
  
  // Get user info from session
  const userEmail = session?.user?.email || ""
  const userName = session?.user?.name || (session?.user?.email ? session.user.email.split('@')[0] : "")
  const userRole = session?.user?.role || ""
  const isAdmin = userRole === "ADMIN"
  const userInitials = userName
    ? userName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : ""

  const handleSignOut = () => {
    signOut({
      callbackUrl: "/auth/login",
      redirect: true
    })
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm" className="h-8 !p-1.5">
              <a href="/dashboard">
                <Command className="h-4 w-4" />
                <span className="text-base font-semibold">AdTiger</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="w-full text-sm flex flex-col gap-2">
            <SidebarMenu>
              <SidebarMenuItem className="flex items-center gap-2">
                <SidebarMenuButton 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear h-8 text-sm"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Quick Create</span>
                </SidebarMenuButton>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9 shrink-0 group-data-[collapsible=icon]:opacity-0"
                >
                  <Mail className="h-4 w-4" />
                  <span className="sr-only">Inbox</span>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? "Navigation" : "Main"}</SidebarGroupLabel>
          <SidebarGroupContent className="w-full text-sm flex flex-col gap-2">
            <SidebarMenu>
              {customerItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    size="sm"
                    className="h-8 text-sm"
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <SidebarMenuBadge className="ml-auto">
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* Settings Section - Only visible to customers */}
        {!isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent className="w-full text-sm flex flex-col gap-2">
              <SidebarMenu>
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      className="h-8 text-sm"
                    >
                      <a href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.badge && (
                          <SidebarMenuBadge className="ml-auto">
                            {item.badge}
                          </SidebarMenuBadge>
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {/* Admin Section - Only visible to admin users */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-red-600">Admin</SidebarGroupLabel>
            <SidebarGroupContent className="w-full text-sm flex flex-col gap-2">
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      className="h-8 text-sm"
                    >
                      <a href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.badge && (
                          <SidebarMenuBadge className="ml-auto">
                            {item.badge}
                          </SidebarMenuBadge>
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        <SidebarGroup>
          <SidebarGroupLabel>Coming Soon</SidebarGroupLabel>
          <SidebarGroupContent className="w-full text-sm flex flex-col gap-2">
            <SidebarMenu>
              {comingSoonItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    disabled={item.disabled}
                    size="sm"
                    className="h-8 text-sm"
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <SidebarMenuBadge className="ml-auto">
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Misc</SidebarGroupLabel>
          <SidebarGroupContent className="w-full text-sm flex flex-col gap-2">
            <SidebarMenu>
              {miscItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    disabled={item.disabled}
                    size="sm"
                    className="h-8 text-sm"
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {status === "loading" ? (
              <SidebarMenuButton size="lg" className="h-12 text-sm" disabled>
                <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                <div className="grid flex-1 gap-1">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                </div>
              </SidebarMenuButton>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="h-12 text-sm group-data-[collapsible=icon]:p-0! data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={undefined} alt={userName} />
                      <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium flex items-center gap-1">
                        {userName || "Loading..."}
                        {isAdmin && (
                          <Shield className="h-3 w-3 text-red-600" />
                        )}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{userEmail || "Loading..."}</span>
                    </div>
                    <MoreVertical className="ml-auto h-4 w-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg" side="bottom" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/dashboard/settings/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/dashboard/settings/account">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Account</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/dashboard/settings/connections">
                    <Cable className="mr-2 h-4 w-4" />
                    <span>Connections</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}