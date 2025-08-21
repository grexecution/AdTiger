import { Metadata } from "next"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/registry/new-york/ui/button"
import { 
  Zap, 
  BarChart3, 
  Target, 
  Lightbulb, 
  Shield,
  TrendingUp,
  Users,
  Activity,
  ArrowRight,
  CheckCircle
} from "lucide-react"

const title = "AdTiger - AI Performance Marketer Dashboard"
const description = "Optimize your Meta and Google Ads campaigns with AI-powered insights and automated recommendations"

export const metadata: Metadata = {
  title,
  description,
}

export default async function IndexPage() {
  const session = await auth()
  
  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="container relative">
      {/* Hero Section */}
      <section className="mx-auto flex max-w-[980px] flex-col items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-20">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-12 w-12 text-primary" />
          <h1 className="text-center text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
            AdTiger
          </h1>
        </div>
        <span className="max-w-[750px] text-center text-lg text-muted-foreground sm:text-xl">
          {description}
        </span>
        <div className="flex w-full items-center justify-center space-x-4 py-4 md:pb-10">
          <Button asChild size="lg">
            <Link href="/auth/login">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/auth/login">
              Sign In
            </Link>
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-[980px] py-8 md:py-12 lg:py-24">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Everything you need for performance marketing
          </h2>
          <p className="mt-2 text-muted-foreground">
            Powered by AI, designed for marketers
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={BarChart3}
            title="Analytics Dashboard"
            description="Real-time performance metrics across all your campaigns"
          />
          <FeatureCard
            icon={Target}
            title="Campaign Management"
            description="Manage Meta and Google Ads from a single interface"
          />
          <FeatureCard
            icon={Lightbulb}
            title="AI Recommendations"
            description="Get actionable insights powered by GPT-4"
          />
          <FeatureCard
            icon={TrendingUp}
            title="Anomaly Detection"
            description="Catch performance issues before they impact results"
          />
          <FeatureCard
            icon={Activity}
            title="A/B Testing"
            description="Run experiments with confidence guardrails"
          />
          <FeatureCard
            icon={Shield}
            title="Budget Protection"
            description="Automated safeguards to prevent overspend"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-[980px] py-8 md:py-12 lg:py-24">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            How It Works
          </h2>
        </div>
        
        <div className="grid gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                1
              </div>
            </div>
            <h3 className="mb-2 font-semibold">Connect Your Accounts</h3>
            <p className="text-sm text-muted-foreground">
              Link your Meta and Google Ads accounts with OAuth
            </p>
          </div>
          
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                2
              </div>
            </div>
            <h3 className="mb-2 font-semibold">Define Your Playbooks</h3>
            <p className="text-sm text-muted-foreground">
              Set up optimization rules in simple YAML format
            </p>
          </div>
          
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                3
              </div>
            </div>
            <h3 className="mb-2 font-semibold">Get AI Insights</h3>
            <p className="text-sm text-muted-foreground">
              Receive recommendations with clear explanations
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-[980px] py-8 md:py-12 lg:py-24">
        <div className="rounded-lg border bg-card p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Why AdTiger?
            </h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <BenefitItem text="Multi-tenant architecture for agencies" />
            <BenefitItem text="Provider-agnostic design" />
            <BenefitItem text="Real-time ETL pipeline" />
            <BenefitItem text="YAML-based playbooks" />
            <BenefitItem text="AI explanations, not decisions" />
            <BenefitItem text="Enterprise-grade security" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[980px] py-8 md:py-12 lg:py-24">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
            Ready to optimize your campaigns?
          </h2>
          <p className="mb-8 text-muted-foreground">
            Join marketers who trust AdTiger for performance optimization
          </p>
          <Button asChild size="lg">
            <Link href="/auth/login">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: any
  title: string
  description: string 
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <Icon className="mb-4 h-8 w-8 text-primary" />
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle className="mt-0.5 h-4 w-4 text-primary" />
      <span className="text-sm">{text}</span>
    </div>
  )
}