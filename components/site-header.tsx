import Link from "next/link"
import { auth } from "@/lib/auth"
import { CommandMenu } from "@/components/command-menu"
import { Icons } from "@/components/icons"
import { MainNav } from "@/components/main-nav"
import { MobileNav } from "@/components/mobile-nav"
import { ModeSwitcher } from "@/components/mode-switcher"
import { UserAccountNav } from "@/components/user-account-nav"
import { Button } from "@/registry/new-york/ui/button"

export async function SiteHeader() {
  const session = await auth()
  
  return (
    <header className="border-grid sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-wrapper">
        <div className="container flex h-14 items-center gap-2 md:gap-4">
          <MainNav />
          <MobileNav />
          <div className="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
            <div className="hidden w-full flex-1 md:flex md:w-auto md:flex-none">
              <CommandMenu />
            </div>
            <nav className="flex items-center gap-2">
              <ModeSwitcher />
              {session?.user ? (
                <UserAccountNav 
                  user={{
                    name: session.user.name,
                    email: session.user.email,
                    image: (session.user as any).image,
                  }}
                />
              ) : (
                <Button asChild size="sm">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}