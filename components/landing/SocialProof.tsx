'use client'

import { Star, Quote } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function SocialProof() {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Marketing Director",
      company: "TechCorp",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612c5c9?w=150&h=150&fit=crop&crop=face",
      content: "I literally don't touch my campaigns anymore. AdFire's AI handles everything automatically and my ROAS improved 47% in the first month.",
      rating: 5
    },
    {
      name: "Mike Chen", 
      role: "Growth Marketing Lead",
      company: "StartupXYZ",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      content: "Finally! No more spreadsheets or manual optimization. The AI runs everything on autopilot while I focus on creative strategy.",
      rating: 5
    },
    {
      name: "Emma Rodriguez",
      role: "Digital Marketing Manager", 
      company: "GrowthAgency",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      content: "Our team went from spending 20+ hours weekly on campaign analysis to zero. AI automation handles everything perfectly.",
      rating: 5
    },
    {
      name: "James Wilson",
      role: "Performance Marketing Specialist",
      company: "EcomBrand", 
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      content: "The AI automatically optimized our campaigns better than I ever could manually. It's like having a superhuman marketer on autopilot.",
      rating: 5
    },
    {
      name: "Lisa Park",
      role: "CMO",
      company: "ScaleUp Inc",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
      content: "Set it and forget it! AdFire's automation has eliminated all manual campaign work while doubling our performance.",
      rating: 5
    },
    {
      name: "David Thompson",
      role: "Marketing Consultant",
      company: "ConsultingPro",
      image: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face",
      content: "I recommend AdFire to clients who want hands-off optimization. The AI does all the research and optimization work automatically.",
      rating: 5
    }
  ]

  const stats = [
    { number: "2,847", label: "Marketers on Autopilot" },
    { number: "47%", label: "Avg ROAS Increase" },
    { number: "20hrs", label: "Research Time Saved Weekly" },
    { number: "100%", label: "Fully Automated" }
  ]

  return (
    <section id="social-proof" className="relative py-20 lg:py-32 overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100/20"></div>
      
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-[0.008]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='0.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(30,41,59,0.03),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(71,85,105,0.02),transparent_50%)]"></div>

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-slate-700 to-slate-800 bg-clip-text text-transparent">2,800+</span> Marketers Run on Autopilot
          </h2>
          <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Join growth teams who've eliminated manual campaign work and automated their performance marketing with AI.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/40 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <div className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.number}
                </div>
                <div className="text-sm font-medium text-slate-600">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="group">
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/30 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] h-full flex flex-col">
                {/* Quote icon */}
                <div className="flex items-center justify-between mb-4">
                  <Quote className="h-8 w-8 text-slate-300 group-hover:text-slate-400 transition-colors duration-300" />
                  <div className="flex items-center gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                {/* Content */}
                <blockquote className="text-slate-700 leading-relaxed mb-6 flex-1">
                  "{testimonial.content}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                    <AvatarImage src={testimonial.image} alt={testimonial.name} />
                    <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white font-semibold">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-600">{testimonial.role}</div>
                    <div className="text-sm text-slate-500">{testimonial.company}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-20 text-center">
          <p className="text-sm font-medium text-slate-500 mb-8">Automation trusted by teams at</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {['TechCorp', 'StartupXYZ', 'GrowthAgency', 'EcomBrand', 'ScaleUp Inc', 'ConsultingPro'].map((company, index) => (
              <div key={index} className="px-4 py-2 bg-slate-100/80 rounded-lg border border-slate-200/40 text-sm font-semibold text-slate-600 hover:opacity-100 transition-opacity duration-300">
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}