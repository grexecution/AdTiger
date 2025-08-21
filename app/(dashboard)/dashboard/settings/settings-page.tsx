"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  User,
  Users,
  Cable,
  Shield,
  Bell,
  Palette,
  Globe,
  CreditCard,
  Key,
  Database,
  ArrowRight
} from "lucide-react"

const settingsCards = [
  {
    title: "Profile Settings",
    description: "Manage your personal information and preferences",
    icon: User,
    href: "/dashboard/settings/profile",
    color: "text-blue-600"
  },
  {
    title: "Account",
    description: "Manage your account settings and team members",
    icon: Users,
    href: "/dashboard/settings/account",
    color: "text-green-600"
  },
  {
    title: "Connections",
    description: "Connect and manage your ad platform accounts",
    icon: Cable,
    href: "/dashboard/settings/connections",
    color: "text-purple-600"
  },
  {
    title: "Security",
    description: "Password, two-factor authentication, and security settings",
    icon: Shield,
    href: "/dashboard/settings/security",
    color: "text-red-600",
    disabled: true
  },
  {
    title: "Notifications",
    description: "Email and in-app notification preferences",
    icon: Bell,
    href: "/dashboard/settings/notifications",
    color: "text-orange-600",
    disabled: true
  },
  {
    title: "Appearance",
    description: "Theme, layout, and display preferences",
    icon: Palette,
    href: "/dashboard/settings/appearance",
    color: "text-pink-600",
    disabled: true
  },
  {
    title: "Billing",
    description: "Manage subscription and payment methods",
    icon: CreditCard,
    href: "/dashboard/settings/billing",
    color: "text-indigo-600",
    disabled: true
  },
  {
    title: "API Keys",
    description: "Manage API keys for integrations",
    icon: Key,
    href: "/dashboard/settings/api-keys",
    color: "text-cyan-600",
    disabled: true
  },
  {
    title: "Data & Privacy",
    description: "Data export, import, and privacy settings",
    icon: Database,
    href: "/dashboard/settings/data",
    color: "text-gray-600",
    disabled: true
  }
]

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card) => {
          const Icon = card.icon
          
          if (card.disabled) {
            return (
              <Card key={card.title} className="relative opacity-50 cursor-not-allowed">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-background ${card.color} bg-opacity-10`}>
                      <Icon className={`h-6 w-6 ${card.color}`} />
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      Coming Soon
                    </span>
                  </div>
                  <CardTitle className="mt-4">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          }
          
          return (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-background ${card.color} bg-opacity-10`}>
                      <Icon className={`h-6 w-6 ${card.color}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="mt-4">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <Link href="/dashboard/settings/profile" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Update Profile Information</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link href="/dashboard/settings/connections" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <Cable className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Connect Ad Accounts</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link href="/dashboard/settings/account" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Invite Team Members</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link href="/dashboard/settings/profile#preferences" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Change Language & Timezone</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}