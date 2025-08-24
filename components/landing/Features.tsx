'use client'

import { Brain, Shield, Zap, BarChart, Bell, Target, Users, TrendingUp, Eye } from 'lucide-react'

export function Features() {
  const mainFeatures = [
    {
      icon: Brain,
      title: "Autonomous AI Optimization",
      description: "Advanced AI that automatically optimizes your campaigns without human intervention, making thousands of micro-adjustments daily.",
      gradient: "from-slate-600 to-slate-700"
    },
    {
      icon: Zap,
      title: "24/7 Automatic Adjustments", 
      description: "AI continuously monitors and adjusts budgets, bids, and targeting in real-time so you never miss an opportunity.",
      gradient: "from-slate-700 to-slate-800"
    },
    {
      icon: BarChart,
      title: "Hands-Free Performance",
      description: "Complete automation across all platforms with intelligent reporting that eliminates manual research forever.",
      gradient: "from-slate-800 to-slate-700"
    }
  ]

  const allFeatures = [
    { icon: Target, title: "Auto Cross-Platform Sync", description: "AI automatically coordinates campaigns across Meta, Google, TikTok, and more" },
    { icon: TrendingUp, title: "Predictive Auto-Scaling", description: "AI forecasts performance and automatically scales winning campaigns" },
    { icon: Users, title: "Autonomous Audience Building", description: "AI creates and tests new audiences automatically without input" },
    { icon: Eye, title: "AI Creative Rotation", description: "Automatically tests and rotates ad creatives based on performance data" },
    { icon: Shield, title: "Auto Budget Protection", description: "AI automatically pauses underperforming ads to prevent budget waste" },
    { icon: Bell, title: "Zero-Touch Optimization", description: "AI handles all optimizations automatically - no alerts or manual actions needed" }
  ]

  return (
    <section id="features" className="relative py-20 lg:py-32 overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/30 to-white"></div>
      
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-[0.008]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='40' cy='40' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(30,41,59,0.03),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(71,85,105,0.02),transparent_50%)]"></div>

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            Fully <span className="bg-gradient-to-r from-slate-700 to-slate-800 bg-clip-text text-transparent">Automated</span> AI Features
          </h2>
          <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Complete automation for performance marketing. No research, no manual work, no constant monitoring required.
          </p>
        </div>

        {/* Main Features */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {mainFeatures.map((feature, index) => (
            <div key={index} className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/5 to-slate-800/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/30 group-hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl mb-6 shadow-lg`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* All Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allFeatures.map((feature, index) => (
            <div key={index} className="group">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/40 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-white/80">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-2 bg-slate-100 rounded-xl group-hover:bg-slate-200 transition-colors duration-300">
                    <feature.icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-50/80 backdrop-blur-sm rounded-full shadow-sm border border-slate-200/40">
            <span className="text-sm font-semibold text-slate-700">100% automated - zero manual work required</span>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  )
}