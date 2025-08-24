'use client'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowRight, Mail, Twitter, Linkedin, Github, Flame } from 'lucide-react'
import Link from 'next/link'

export function Footer() {
  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
  }

  const footerLinks = {
    product: [
      { name: "AI Automation", href: "#features" },
      { name: "Autopilot Pricing", href: "#pricing" },
      { name: "Automation Roadmap", href: "#roadmap" },
      { name: "API Documentation", href: "#" },
      { name: "Integrations", href: "#" }
    ],
    company: [
      { name: "About Us", href: "#" },
      { name: "Automation Blog", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Press Kit", href: "#" },
      { name: "Contact", href: "#" }
    ],
    resources: [
      { name: "Automation Guide", href: "#" },
      { name: "AI Community", href: "#" },
      { name: "Setup Tutorials", href: "#" },
      { name: "Automation Case Studies", href: "#" },
      { name: "Status Page", href: "#" }
    ],
    legal: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
      { name: "Cookie Policy", href: "#" },
      { name: "GDPR", href: "#" },
      { name: "Security", href: "#" }
    ]
  }

  return (
    <footer className="relative py-20 lg:py-24 overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-100/50 to-slate-50"></div>
      
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-[0.01]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='0.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        {/* Top CTA Section */}
        <div className="text-center mb-20">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 shadow-xl border border-white/30">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 tracking-tight">
              Ready to Stop Doing <span className="bg-gradient-to-r from-slate-700 to-slate-800 bg-clip-text text-transparent">Manual Research</span>?
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join thousands of marketers who've automated their campaigns and eliminated manual optimization work forever.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button 
                  size="lg"
                  className="text-base px-8 py-5 h-auto bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 hover:from-slate-800 hover:via-slate-900 hover:to-slate-800 shadow-lg shadow-slate-500/20 hover:shadow-xl hover:shadow-slate-500/25 transition-all duration-300 transform hover:scale-[1.02] font-semibold"
                >
                  Start AI Automation Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <p className="text-sm text-slate-600">
                No research required • AI handles everything automatically
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="grid lg:grid-cols-6 gap-12 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <Flame className="h-10 w-10 text-orange-500" />
              <span className="text-2xl font-bold text-slate-900 tracking-tight">AdFire</span>
            </div>
            <p className="text-slate-600 leading-relaxed max-w-md">
              Your AI autopilot for performance marketing. We automate all the research, optimization, and manual work 
              so you can focus on strategy while AI handles everything else.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 bg-white/80 rounded-lg border border-slate-200/50 hover:bg-slate-50 transition-colors">
                <Twitter className="h-4 w-4 text-slate-600" />
              </a>
              <a href="#" className="p-2 bg-white/80 rounded-lg border border-slate-200/50 hover:bg-slate-50 transition-colors">
                <Linkedin className="h-4 w-4 text-slate-600" />
              </a>
              <a href="#" className="p-2 bg-white/80 rounded-lg border border-slate-200/50 hover:bg-slate-50 transition-colors">
                <Github className="h-4 w-4 text-slate-600" />
              </a>
              <a href="mailto:hello@adfyre.com" className="p-2 bg-white/80 rounded-lg border border-slate-200/50 hover:bg-slate-50 transition-colors">
                <Mail className="h-4 w-4 text-slate-600" />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Product</h3>
              <ul className="space-y-3">
                {footerLinks.product.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-slate-600 hover:text-slate-900 transition-colors text-sm">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Company</h3>
              <ul className="space-y-3">
                {footerLinks.company.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-slate-600 hover:text-slate-900 transition-colors text-sm">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Resources</h3>
              <ul className="space-y-3">
                {footerLinks.resources.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-slate-600 hover:text-slate-900 transition-colors text-sm">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Legal</h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-slate-600 hover:text-slate-900 transition-colors text-sm">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-slate-200/50" />

        {/* Bottom Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-slate-600">
            © 2024 AdFire. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <span>Made for automated marketing</span>
            <span>•</span>
            <span>🤖 100% AI Powered</span>
          </div>
        </div>
      </div>
    </footer>
  )
}