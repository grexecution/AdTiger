"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()
  
  const routes = [
    {
      href: "/dashboard",
      label: "Overview",
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/campaigns",
      label: "Campaigns",
      active: pathname.startsWith("/dashboard/campaigns"),
    },
    {
      href: "/dashboard/performance",
      label: "Performance",
      active: pathname.startsWith("/dashboard/performance"),
    },
    {
      href: "/dashboard/recommendations",
      label: "Recommendations",
      active: pathname.startsWith("/dashboard/recommendations"),
    },
  ]

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            route.active
              ? "text-black dark:text-white"
              : "text-muted-foreground"
          )}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  )
}