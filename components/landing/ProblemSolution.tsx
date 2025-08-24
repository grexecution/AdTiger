'use client'

import { AlertTriangle, Target, TrendingUp, Zap, CheckCircle, ArrowRight, Clock, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function ProblemSolution() {
  const problems = [
    {
      icon: Clock,
      title: "Endless Manual Research",
      description: "Spending hours daily analyzing campaign data, hunting for optimization opportunities in spreadsheets."
    },
    {
      icon: AlertTriangle,
      title: "Missing Critical Moments",
      description: "Performance drops happen while you're sleeping or in meetings, costing thousands before you notice."
    },
    {
      icon: Target,
      title: "Human Limitations",
      description: "Can't monitor hundreds of campaigns 24/7 or process millions of data points simultaneously."
    }
  ]

  const solutions = [
    {
      icon: Brain,
      title: "AI Does the Research",
      description: "Advanced AI continuously analyzes all your campaigns, finding optimization opportunities instantly."
    },
    {
      icon: Zap,
      title: "24/7 Automatic Optimization",
      description: "AI automatically adjusts budgets, targeting, and bids in real-time without human intervention."
    },
    {
      icon: CheckCircle,
      title: "Superhuman Performance",
      description: "Process millions of data points per second and optimize across all campaigns simultaneously."
    }
  ]

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/50 to-white"></div>
      
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-[0.008]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='50' cy='50' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(30,41,59,0.03),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(71,85,105,0.02),transparent_50%)]"></div>

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            From <span className="text-red-600">Manual Labor</span> to <span className="bg-gradient-to-r from-slate-700 to-slate-800 bg-clip-text text-transparent">AI Autopilot</span>
          </h2>
          <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Stop wasting time on manual campaign research. Let AI handle optimization automatically while you focus on strategy.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Problems */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                The Manual Way (Broken)
              </h3>
              <p className="text-lg text-slate-600 mb-8">
                Marketers waste 60% of their time on manual analysis instead of strategic growth.
              </p>
            </div>

            <div className="space-y-6">
              {problems.map((problem, index) => (
                <div key={index} className="group relative">
                  <div className="flex items-start gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-red-100/50 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                      <problem.icon className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-900 mb-2">{problem.title}</h4>
                      <p className="text-slate-600 leading-relaxed">{problem.description}</p>
                    </div>
                  </div>
                  {/* Connecting line */}
                  {index < problems.length - 1 && (
                    <div className="absolute left-8 top-20 w-0.5 h-6 bg-gradient-to-b from-red-200 to-transparent"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Solutions */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                The AI Way (Automated)
              </h3>
              <p className="text-lg text-slate-600 mb-8">
                AI automation handles all research and optimization automatically, 24/7.
              </p>
            </div>

            <div className="space-y-6">
              {solutions.map((solution, index) => (
                <div key={index} className="group relative">
                  <div className="flex items-start gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-100/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <solution.icon className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-900 mb-2">{solution.title}</h4>
                      <p className="text-slate-600 leading-relaxed">{solution.description}</p>
                    </div>
                  </div>
                  {/* Connecting line */}
                  {index < solutions.length - 1 && (
                    <div className="absolute left-8 top-20 w-0.5 h-6 bg-gradient-to-b from-emerald-200 to-transparent"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Arrow connecting sections on large screens */}
        <div className="hidden lg:flex justify-center items-center my-12">
          <div className="flex items-center gap-4 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-slate-200/50">
            <ArrowRight className="h-6 w-6 text-slate-600" />
            <span className="text-sm font-semibold text-slate-700">Automate Everything</span>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4">
            <Link href="/auth/register">
              <Button 
                size="lg"
                className="text-base px-8 py-5 h-auto bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 hover:from-slate-800 hover:via-slate-900 hover:to-slate-800 shadow-lg shadow-slate-500/20 hover:shadow-xl hover:shadow-slate-500/25 transition-all duration-300 transform hover:scale-[1.02] font-semibold"
              >
                Switch to AI Autopilot
              </Button>
            </Link>
            <p className="text-sm text-slate-600">
              No research required • AI does everything automatically
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}