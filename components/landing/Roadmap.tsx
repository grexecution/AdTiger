'use client'

import { CheckCircle, Clock, Lightbulb, Zap, Target, BarChart, Bot, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function Roadmap() {
  const roadmapItems = [
    {
      status: "shipped",
      quarter: "Q4 2024",
      icon: CheckCircle,
      title: "Core Platform Launch",
      description: "Multi-platform ad analytics with AI-powered insights and real-time alerts.",
      features: ["Meta & Google Ads integration", "AI recommendations", "Performance alerts", "Unified dashboard"]
    },
    {
      status: "shipping",
      quarter: "Q1 2025", 
      icon: Clock,
      title: "Advanced Analytics & Automation",
      description: "Deeper insights with predictive analytics and automated optimization features.",
      features: ["Predictive modeling", "Auto-bid optimization", "Creative performance scoring", "Advanced reporting"]
    },
    {
      status: "planned",
      quarter: "Q2 2025",
      icon: Target,
      title: "Expanded Platform Support",
      description: "Connect TikTok, LinkedIn, Twitter, and more advertising platforms.",
      features: ["TikTok Ads integration", "LinkedIn Ads support", "Twitter Ads connection", "Pinterest Ads"]
    },
    {
      status: "planned", 
      quarter: "Q3 2025",
      icon: Bot,
      title: "AI Co-Pilot & Voice Commands",
      description: "Natural language interface for campaign management and optimization.",
      features: ["Voice-controlled analytics", "AI campaign builder", "Natural language queries", "Smart recommendations"]
    },
    {
      status: "considering",
      quarter: "Q4 2025",
      icon: Globe,
      title: "Global Expansion & Localization",
      description: "Multi-language support and region-specific optimization features.",
      features: ["Multi-language UI", "Regional currency support", "Local market insights", "Compliance tools"]
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'shipped': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'shipping': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'planned': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'considering': return 'bg-slate-100 text-slate-700 border-slate-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'shipped': return '✅ Shipped'
      case 'shipping': return '🚀 Shipping'
      case 'planned': return '📋 Planned'
      case 'considering': return '💭 Considering'
      default: return status
    }
  }

  const getIconColor = (status: string) => {
    switch (status) {
      case 'shipped': return 'text-emerald-600'
      case 'shipping': return 'text-blue-600'
      case 'planned': return 'text-amber-600'
      case 'considering': return 'text-slate-600'
      default: return 'text-slate-600'
    }
  }

  return (
    <section id="roadmap" className="relative py-20 lg:py-32 overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100/20"></div>
      
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-[0.008]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='40' cy='40' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(30,41,59,0.03),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(71,85,105,0.02),transparent_50%)]"></div>

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            Product <span className="bg-gradient-to-r from-slate-700 to-slate-800 bg-clip-text text-transparent">Roadmap</span>
          </h2>
          <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            See what we're building to make AdFire the ultimate AI marketing co-pilot.
          </p>
        </div>

        {/* Roadmap Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-transparent hidden lg:block"></div>

          <div className="space-y-12">
            {roadmapItems.map((item, index) => (
              <div key={index} className="relative group">
                {/* Timeline dot */}
                <div className="absolute left-6 w-4 h-4 bg-white border-4 border-slate-300 rounded-full hidden lg:block group-hover:border-slate-400 transition-colors duration-300"></div>

                <div className="lg:ml-20">
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-white/30 hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      {/* Icon and Status */}
                      <div className="flex items-center gap-4 lg:flex-col lg:items-center lg:gap-2 lg:min-w-[120px]">
                        <div className={`p-3 bg-slate-100 rounded-xl ${getIconColor(item.status)}`}>
                          <item.icon className="h-6 w-6" />
                        </div>
                        <div className="lg:text-center">
                          <Badge className={`${getStatusColor(item.status)} border px-3 py-1 text-xs font-semibold`}>
                            {getStatusLabel(item.status)}
                          </Badge>
                          <div className="text-sm font-medium text-slate-600 mt-2">
                            {item.quarter}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <h3 className="text-xl lg:text-2xl font-bold text-slate-900 mb-3 tracking-tight">
                          {item.title}
                        </h3>
                        <p className="text-slate-600 leading-relaxed mb-6">
                          {item.description}
                        </p>

                        {/* Features */}
                        <div className="grid md:grid-cols-2 gap-3">
                          {item.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                              <span className="text-sm text-slate-600">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <div className="inline-flex flex-col items-center gap-4 p-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30">
            <Lightbulb className="h-8 w-8 text-slate-600" />
            <h3 className="text-xl font-bold text-slate-900">Have a feature request?</h3>
            <p className="text-slate-600 max-w-md">
              We love hearing from our users. Share your ideas and help shape the future of AdFire.
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Join our community or email us at</span>
              <a href="mailto:feedback@adfire.com" className="text-slate-700 font-semibold hover:text-slate-900 transition-colors">
                feedback@adfire.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}