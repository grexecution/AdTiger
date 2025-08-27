"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePathname, useRouter } from "next/navigation"
import { 
  User, 
  Building, 
  Link, 
  Bell, 
  Shield, 
  CreditCard,
  Settings
} from "lucide-react"

const settingsTabs = [
  {
    value: "profile",
    label: "Profile",
    icon: User,
    href: "/dashboard/settings",
    description: "Manage your personal information"
  },
  {
    value: "account",
    label: "Account",
    icon: Building,
    href: "/dashboard/settings/account",
    description: "Account settings and preferences"
  },
  {
    value: "connections",
    label: "Connections",
    icon: Link,
    href: "/dashboard/settings/connections",
    description: "Manage platform integrations"
  },
  {
    value: "notifications",
    label: "Notifications",
    icon: Bell,
    href: "/dashboard/settings/notifications",
    description: "Email and notification preferences"
  },
  {
    value: "security",
    label: "Security",
    icon: Shield,
    href: "/dashboard/settings/security",
    description: "Password and security settings"
  },
  {
    value: "billing",
    label: "Billing",
    icon: CreditCard,
    href: "/dashboard/settings/billing",
    description: "Subscription and payment methods"
  }
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  
  // Determine active tab based on pathname
  const activeTab = settingsTabs.find(tab => pathname === tab.href)?.value || "profile"

  return (
    <div className="flex-1 space-y-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
        <Settings className="h-8 w-8 text-muted-foreground" />
      </div>

      <Tabs value={activeTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto p-1">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                onClick={() => router.push(tab.href)}
                className="flex flex-col gap-1 py-2 data-[state=active]:bg-background"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{tab.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="mt-6">
          {children}
        </div>
      </Tabs>
    </div>
  )
}