'use client'

import { Check, Star, Zap, Crown, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export function PricingSection() {
  const plans = [
    {
      name: "Free Automation",
      price: "€0",
      period: "forever",
      description: "Experience AI automation with basic campaign management",
      icon: Star,
      features: [
        "Connect 1 ad account",
        "Basic AI auto-optimization", 
        "Automated daily reports",
        "Auto budget protection",
        "Community support",
        "7-day automation history"
      ],
      cta: "Start Free Automation",
      popular: false,
      gradient: "from-slate-600 to-slate-700"
    },
    {
      name: "Pro Autopilot",
      price: "€49",
      period: "/month",
      description: "Full AI automation for serious performance marketers",
      icon: Zap,
      features: [
        "Unlimited automated accounts",
        "Advanced AI auto-optimization",
        "Real-time automatic adjustments",
        "Auto audience scaling",
        "Priority automation support",
        "90-day automation history",
        "Automated custom reporting",
        "AI creative rotation",
        "Auto cross-platform sync"
      ],
      cta: "Start Pro Autopilot",
      popular: true,
      gradient: "from-slate-700 to-slate-800"
    },
    {
      name: "Agency Automation",
      price: "€149",
      period: "/month",
      description: "Enterprise automation for agencies managing multiple clients",
      icon: Crown,
      features: [
        "Everything in Pro Autopilot",
        "White-label automated reports",
        "Multi-client automation dashboard",
        "Team automation workflows",
        "Dedicated automation specialist",
        "Unlimited automation history",
        "API for custom automation",
        "Advanced AI integrations",
        "Enterprise automation analytics",
        "Priority automation features"
      ],
      cta: "Contact Sales",
      popular: false,
      gradient: "from-slate-800 to-slate-900"
    }
  ]

  return (
    <section id="pricing" className="relative py-20 lg:py-32 overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/20 to-white"></div>
      
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-[0.01]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='50' cy='50' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(30,41,59,0.04),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(71,85,105,0.03),transparent_50%)]"></div>

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-slate-700 to-slate-800 bg-clip-text text-transparent">Automated</span> Pricing for Every Team
          </h2>
          <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Choose your automation level. Start free forever, upgrade for advanced AI features and hands-free optimization.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className={`relative group ${plan.popular ? 'lg:-mt-4 lg:mb-4' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-slate-700 to-slate-800 text-white border-0 px-4 py-1 text-sm font-semibold shadow-lg">
                    Most Automated
                  </Badge>
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/5 to-slate-800/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              
              <div className={`relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border transition-all duration-300 hover:scale-[1.02] h-full flex flex-col ${
                plan.popular 
                  ? 'border-slate-200 shadow-2xl' 
                  : 'border-white/30 hover:shadow-2xl'
              }`}>
                {/* Header */}
                <div className="text-center mb-8">
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${plan.gradient} rounded-2xl mb-6 shadow-lg`}>
                    <plan.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
                    {plan.name}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {plan.description}
                  </p>
                  
                  <div className="mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl lg:text-5xl font-bold text-slate-900">
                        {plan.price}
                      </span>
                      <span className="text-slate-600 font-medium">
                        {plan.period}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="flex-1 mb-8">
                  <ul className="space-y-4">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-emerald-600" />
                        </div>
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <Link href="/auth/register" className="w-full">
                  <Button 
                    size="lg"
                    className={`w-full text-base py-4 h-auto font-semibold transition-all duration-300 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 hover:from-slate-800 hover:via-slate-900 hover:to-slate-800 shadow-lg shadow-slate-500/20 hover:shadow-xl hover:shadow-slate-500/25'
                        : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ / Additional Info */}
        <div className="mt-20 text-center">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <Building className="h-8 w-8 text-slate-600 mx-auto mb-4" />
              <h4 className="font-semibold text-slate-900 mb-2">Enterprise Automation</h4>
              <p className="text-sm text-slate-600">Custom AI automation solutions for large organizations. Contact sales for pricing.</p>
            </div>
            <div className="text-center">
              <Check className="h-8 w-8 text-emerald-600 mx-auto mb-4" />
              <h4 className="font-semibold text-slate-900 mb-2">No Manual Work</h4>
              <p className="text-sm text-slate-600">100% automated optimization. Cancel anytime, zero research required.</p>
            </div>
            <div className="text-center">
              <Zap className="h-8 w-8 text-slate-600 mx-auto mb-4" />
              <h4 className="font-semibold text-slate-900 mb-2">Instant Automation</h4>
              <p className="text-sm text-slate-600">AI starts optimizing your campaigns automatically within minutes of connecting.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}