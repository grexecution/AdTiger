'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CheckCircle, Shield, Zap, Star, TrendingUp, Target, DollarSign, Users, Heart, MessageCircle, Share, MoreHorizontal, ThumbsUp } from 'lucide-react'
import { ImageWithFallback } from './ImageWithFallback'
import Link from 'next/link'

export function HeroSection() {
  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
  }

  const userAvatars = [
    { name: 'Sarah', image: 'https://images.unsplash.com/photo-1494790108755-2616b612c5c9?w=150&h=150&fit=crop&crop=face' },
    { name: 'Mike', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
    { name: 'Emma', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
    { name: 'Alex', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' },
    { name: 'Lisa', image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face' }
  ]

  const aiRecommendations = [
    {
      icon: TrendingUp,
      title: 'Auto-Optimization Active',
      message: 'AI detected performance drop and automatically adjusted targeting. +23% CTR recovered.',
      type: 'warning',
      color: 'border-l-amber-500 bg-gradient-to-r from-amber-50/90 to-orange-50/70',
      badge: 'Running',
      badgeColor: 'bg-gradient-to-r from-amber-600 to-orange-600'
    },
    {
      icon: Target,
      title: 'Audience Auto-Scaled',
      message: 'AI found high-performing lookalike (94% match) and increased budget allocation by €200/day.',
      type: 'success',
      color: 'border-l-emerald-500 bg-gradient-to-r from-emerald-50/90 to-green-50/70',
      badge: 'Complete',
      badgeColor: 'bg-gradient-to-r from-emerald-600 to-green-600'
    },
    {
      icon: DollarSign,
      title: 'Budget Auto-Reallocation',
      message: 'AI moved €340/day from underperforming placements to top converters. +41% ROAS.',
      type: 'info',
      color: 'border-l-slate-500 bg-gradient-to-r from-slate-50/90 to-gray-50/70',
      badge: 'Optimizing',
      badgeColor: 'bg-gradient-to-r from-slate-600 to-gray-600'
    }
  ]

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden min-h-screen flex items-center">
      {/* Premium Background with multiple layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100/30"></div>
      
      {/* Sophisticated texture overlay */}
      <div className="absolute inset-0 opacity-[0.012]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='40' cy='40' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>
      
      {/* Premium mesh gradient */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%231e293b' stop-opacity='0.02'/%3E%3Cstop offset='100%25' stop-color='%23475569' stop-opacity='0.015'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M0 0h120v120H0z' fill='url(%23a)'/%3E%3C/svg%3E")`,
      }}></div>
      
      {/* Radial gradients for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(30,41,59,0.06),transparent_40%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(71,85,105,0.04),transparent_40%)]"></div>
      
      {/* Subtle animated orbs */}
      <div className="absolute top-32 left-32 w-72 h-72 bg-gradient-to-r from-slate-400/8 to-gray-400/6 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-32 right-32 w-64 h-64 bg-gradient-to-r from-slate-500/6 to-slate-600/4 rounded-full blur-3xl animate-pulse" style={{animationDelay: '3s'}}></div>
      
      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            {/* Premium AI-Powered Tag */}
            <div className="inline-flex">
              <Badge className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 text-white border-0 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-slate-500/20 hover:shadow-xl hover:shadow-slate-500/25 transition-all duration-300 backdrop-blur-sm">
                <span className="mr-2">🤖</span>
                AI Autopilot for Performance Marketing
              </Badge>
            </div>

            <div className="space-y-6">
              <h1 className="text-3xl lg:text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight">
                <span className="text-slate-900 block mb-1">Stop Doing Research.</span>
                <span className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 bg-clip-text text-transparent block mb-1">Start Automating.</span>
                <span className="text-slate-700 block text-2xl lg:text-3xl xl:text-4xl font-semibold">AI Runs Your Ads While You Sleep</span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-600 max-w-xl leading-relaxed">
                Connect your ads and let AI handle the optimization automatically. No more spreadsheets, no more manual analysis — just <span className="font-semibold text-slate-800">results on autopilot</span>.
              </p>
            </div>

            {/* Premium User Avatars and Rating */}
            <div className="flex items-center gap-5 py-4">
              <div className="flex -space-x-2.5">
                {userAvatars.map((user, index) => (
                  <Avatar key={index} className="w-11 h-11 border-3 border-white shadow-md ring-2 ring-slate-100/60 hover:scale-105 transition-transform duration-200">
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white font-semibold text-sm">{user.name[0]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400 drop-shadow-sm" />
                  ))}
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-slate-900">4.9/5</span>
                  <span className="text-sm text-slate-600">from 2,847 marketers</span>
                </div>
              </div>
            </div>

            <Link href="/auth/register">
              <Button 
                size="lg" 
                className="text-base px-8 py-5 h-auto bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 hover:from-slate-800 hover:via-slate-900 hover:to-slate-800 shadow-lg shadow-slate-500/20 hover:shadow-xl hover:shadow-slate-500/25 transition-all duration-300 transform hover:scale-[1.02] font-semibold"
              >
                Start Automating For Free
              </Button>
            </Link>

            {/* Premium trust badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="group flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-50/80 to-green-50/60 rounded-xl border border-emerald-200/40 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm">
                <div className="p-1.5 bg-emerald-600 rounded-lg shadow-md">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-900">100% Automated</p>
                  <p className="text-xs text-emerald-700">Zero Manual Work</p>
                </div>
              </div>
              <div className="group flex items-center gap-3 p-4 bg-gradient-to-br from-slate-50/80 to-gray-50/60 rounded-xl border border-slate-200/40 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm">
                <div className="p-1.5 bg-slate-600 rounded-lg shadow-md">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">24/7 AI Monitoring</p>
                  <p className="text-xs text-slate-700">Never Miss Opportunities</p>
                </div>
              </div>
              <div className="group flex items-center gap-3 p-4 bg-gradient-to-br from-slate-50/80 to-gray-50/60 rounded-xl border border-slate-200/40 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm">
                <div className="p-1.5 bg-slate-700 rounded-lg shadow-md">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Auto-Optimization</p>
                  <p className="text-xs text-slate-700">Hands-Free Performance</p>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Facebook Ad Mockup */}
          <div className="relative lg:pl-8">
            <div className="relative bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl shadow-slate-900/8 overflow-hidden max-w-lg mx-auto" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {/* Facebook Header */}
              <div className="flex items-center justify-between p-4 bg-white/90 backdrop-blur-sm border-b border-slate-100/50">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden shadow-md">
                    <div className="w-full h-full bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">TS</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">TechStartup Inc.</span>
                      <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <span>Sponsored</span>
                      <span>•</span>
                      <span>2h</span>
                      <span>•</span>
                      <div className="w-3 h-3 rounded-sm bg-slate-300 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-slate-600 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <MoreHorizontal className="h-5 w-5 text-slate-600" />
              </div>

              {/* Ad Text */}
              <div className="px-4 pb-4">
                <p className="text-sm text-slate-900 leading-relaxed">
                  🚀 Ready to 10x your productivity? Join 50,000+ teams using our AI platform to automate workflows and boost efficiency.
                  <br /><br />
                  <span className="text-slate-700">
                    ✅ Save 15+ hours per week<br />
                    ✅ Integrate with 100+ tools<br />
                    ✅ No-code automation
                  </span>
                  <br /><br />
                  <span className="text-blue-600 hover:text-blue-700 cursor-pointer font-semibold">Get 50% off your first 3 months →</span>
                </p>
              </div>

              {/* Ad Image */}
              <div className="relative">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1653946402580-72e2d34df646?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlY29tbWVyY2UlMjBwcm9kdWN0JTIwc2hvd2Nhc2V8ZW58MXx8fHwxNzU2MDcyNTgwfDA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Product Demo"
                  className="w-full h-56 object-cover"
                />
                
                {/* Link preview overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">TECHSTARTUП.COM</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">AI Workflow Automation Platform</p>
                  <p className="text-xs text-slate-600 mt-1">Streamline your business processes with intelligent automation. Start your free trial today.</p>
                </div>
              </div>

              {/* Facebook Engagement Bar */}
              <div className="border-t border-slate-100 bg-white/90 backdrop-blur-sm">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                        <ThumbsUp className="w-2.5 h-2.5 text-white" />
                      </div>
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                        <Heart className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                    <span className="text-xs text-slate-600 ml-1">Sarah Chen and 127 others</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span>24 comments</span>
                    <span>8 shares</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 px-4 py-2">
                  <div className="flex items-center justify-around">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 rounded-md transition-colors">
                      <ThumbsUp className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-700">Like</span>
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 rounded-md transition-colors">
                      <MessageCircle className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-700">Comment</span>
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 rounded-md transition-colors">
                      <Share className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-700">Share</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact AI Recommendation Cards */}
            <div className="absolute -right-8 top-8 space-y-3 w-72 z-20">
              {aiRecommendations.map((rec, index) => (
                <div 
                  key={index}
                  className={`bg-white/85 backdrop-blur-xl border-l-3 ${rec.color} rounded-r-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01] border border-white/20`}
                  style={{ 
                    transform: `translateY(${index * 4}px) translateX(${index * 1}px)`,
                  }}
                >
                  <div className="p-3.5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 rounded-lg">
                          <rec.icon className="h-3.5 w-3.5 text-slate-700" />
                        </div>
                        <span className="text-sm font-bold text-slate-900">{rec.title}</span>
                      </div>
                      <Badge className={`text-xs font-semibold text-white border-0 ${rec.badgeColor} shadow-sm px-2 py-0.5`}>
                        {rec.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-700 mb-3 leading-relaxed">{rec.message}</p>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-6 px-3 text-xs bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-sm font-semibold">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}