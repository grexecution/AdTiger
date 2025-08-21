import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Zap,
  Target,
  TrendingUp,
  Shield,
  Globe,
  Sparkles,
} from "lucide-react"

export default async function HomePage() {
  const session = await auth()
  
  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="flex items-center space-x-2">
            <Target className="h-6 w-6" />
            <span className="text-xl font-bold">AdTiger</span>
          </div>
          <nav className="ml-auto flex items-center space-x-6">
            <Link href="/features" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Pricing
            </Link>
            <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Documentation
            </Link>
            <Link href="/auth/login-v2">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register-v2">
              <Button size="sm">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 space-y-8">
        <div className="mx-auto max-w-4xl text-center space-y-4">
          <Badge variant="outline" className="mb-4">
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered Marketing Intelligence
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Optimize Your Ad Campaigns with{" "}
            <span className="text-primary">AI Intelligence</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            AdTiger analyzes your campaign data across Meta, Google, and TikTok ads, 
            providing actionable recommendations to maximize ROI and reduce wasted spend.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/auth/register-v2">
              <Button size="lg">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg">
                Watch Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container py-24 space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Everything You Need to Scale</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powerful features to help you manage, optimize, and scale your advertising campaigns
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <BrainCircuit className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">AI Recommendations</h3>
            <p className="text-muted-foreground">
              Get intelligent suggestions based on your campaign performance and industry benchmarks
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Advanced Analytics</h3>
            <p className="text-muted-foreground">
              Deep insights into campaign performance with custom metrics and attribution models
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Automated Playbooks</h3>
            <p className="text-muted-foreground">
              Rule-based automation to pause underperforming ads and scale winners
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Multi-Platform</h3>
            <p className="text-muted-foreground">
              Manage Meta, Google, and TikTok campaigns from a single dashboard
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Performance Alerts</h3>
            <p className="text-muted-foreground">
              Real-time notifications for significant changes in campaign performance
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Enterprise Security</h3>
            <p className="text-muted-foreground">
              SOC 2 compliant with role-based access control and audit logs
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <div className="mx-auto max-w-4xl rounded-lg bg-muted p-8 text-center lg:p-12">
          <h2 className="text-3xl font-bold">Ready to Optimize Your Campaigns?</h2>
          <p className="mt-4 text-muted-foreground">
            Join thousands of marketers using AdTiger to improve their ROAS
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/auth/register-v2">
              <Button size="lg">
                Start 14-Day Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container py-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span className="font-semibold">AdTiger</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered performance marketing platform
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-primary">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-primary">Integrations</Link></li>
                <li><Link href="/changelog" className="hover:text-primary">Changelog</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/docs" className="hover:text-primary">Documentation</Link></li>
                <li><Link href="/guides" className="hover:text-primary">Guides</Link></li>
                <li><Link href="/blog" className="hover:text-primary">Blog</Link></li>
                <li><Link href="/support" className="hover:text-primary">Support</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary">About</Link></li>
                <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-primary">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-primary">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            © 2024 AdTiger. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}