import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/(dashboard)/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Search } from "@/app/(dashboard)/dashboard/components/search"
import { ThemeToggle } from "@/app/(dashboard)/components/theme-toggle"
import { UserNav } from "@/app/(dashboard)/dashboard/components/user-nav"
import { PageTransition } from "@/components/page-transition"

export const metadata: Metadata = {
  title: "Dashboard - AdTiger",
  description: "AI Performance Marketing Dashboard",
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/auth/login")
  }
  
  return (
    <>
      <PageTransition />
      <SidebarProvider defaultOpen={true}>
        <AppSidebar variant="inset" />
        <SidebarInset className="peer-data-[variant=inset]:m-2 peer-data-[variant=inset]:ml-0 peer-data-[variant=inset]:rounded-xl peer-data-[variant=inset]:shadow">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b">
            <div className="flex w-full items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-1 lg:gap-2">
                <SidebarTrigger className="-ml-1 lg:hidden" />
                <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
                <Search />
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <UserNav />
              </div>
            </div>
          </header>
          <div className="h-full p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}