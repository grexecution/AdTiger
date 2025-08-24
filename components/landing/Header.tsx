'use client'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import Link from 'next/link'
import { Flame } from 'lucide-react'

export function Header() {
  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 border-slate-200/50">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-8 w-8 text-orange-500" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">AdFire</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Pricing
            </a>
            <a href="#social-proof" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Testimonials
            </a>
            <a href="#roadmap" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Roadmap
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button 
                variant="outline" 
                size="sm"
                className="hidden sm:inline-flex border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                Sign In
              </Button>
            </Link>
            <Button 
              onClick={scrollToPricing}
              size="sm"
              className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-md font-semibold"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}