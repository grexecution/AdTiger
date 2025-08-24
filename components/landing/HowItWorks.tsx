'use client'

import { Brain, BarChart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: Brain,
      title: "AI Constantly Monitors Everything",
      description:
        "Connect your Meta (Facebook & Instagram) and Google (Search, YouTube & Display) accounts in 60 seconds. AI immediately begins 24/7 monitoring and optimization.",
      detail:
        "One-click OAuth integration across all major platforms. AI continuously analyzes performance data and makes real-time adjustments.",
    },
    {
      step: "02",
      icon: BarChart,
      title: "Automatic Optimization",
      description:
        "AI continuously adjusts budgets, targeting, and bids without any manual intervention across all connected platforms.",
      detail:
        "Smart automation handles audience scaling, budget reallocation, and bid optimization simultaneously across Meta and Google.",
    },
    {
      step: "03",
      icon: TrendingUp,
      title: "Results on Autopilot",
      description:
        "Watch your performance improve automatically while you focus on high-level strategy and creative development.",
      detail:
        "Average 47% ROAS improvement with zero manual work or research required across all your advertising platforms.",
    },
  ];

  const scrollToPricing = () => {
    document
      .getElementById("pricing")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100/20"></div>

      {/* Texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.01]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M30 30m-1 0a1 1 0 1 1 2 0a1 1 0 1 1-2 0'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(30,41,59,0.04),transparent_40%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(71,85,105,0.03),transparent_40%)]"></div>

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            AI Automation in{" "}
            <span className="bg-gradient-to-r from-slate-700 to-slate-800 bg-clip-text text-transparent">
              3 Simple Steps
            </span>
          </h2>
          <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Connect once, then let AI handle all the
            optimization automatically across Meta and Google
            platforms. No research, no manual work.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-16">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div
                className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? "lg:grid-flow-col-dense" : ""}`}
              >
                {/* Content */}
                <div
                  className={`space-y-6 ${index % 2 === 1 ? "lg:col-start-2" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-2xl font-bold text-lg shadow-lg">
                      {step.step}
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-lg text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                    <p className="text-sm text-slate-500 font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                      🤖 {step.detail}
                    </p>
                  </div>
                </div>

                {/* Visual */}
                <div
                  className={`${index % 2 === 1 ? "lg:col-start-1" : ""}`}
                >
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700/10 to-slate-800/5 rounded-3xl blur-xl transform group-hover:scale-105 transition-transform duration-300"></div>
                    <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-12 shadow-xl border border-white/30 group-hover:shadow-2xl transition-all duration-300">
                      <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl mx-auto mb-6 shadow-lg">
                        <step.icon className="h-10 w-10 text-white" />
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-slate-900 mb-2">
                          {step.step}
                        </div>
                        <div className="text-lg font-semibold text-slate-600">
                          {step.title}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="flex justify-center mt-16">
                  <div className="w-0.5 h-16 bg-gradient-to-b from-slate-200 via-slate-300 to-transparent"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-20">
          <div className="inline-flex flex-col items-center gap-6 p-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30">
            <h3 className="text-2xl font-bold text-slate-900">
              Ready for hands-free optimization?
            </h3>
            <p className="text-slate-600 max-w-md">
              Join thousands of marketers who've automated their
              campaigns across Meta and Google platforms with
              AI.
            </p>
            <Link href="/auth/register">
              <Button
                size="lg"
                className="text-base px-8 py-5 h-auto bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 hover:from-slate-800 hover:via-slate-900 hover:to-slate-800 shadow-lg shadow-slate-500/20 hover:shadow-xl hover:shadow-slate-500/25 transition-all duration-300 transform hover:scale-[1.02] font-semibold"
              >
                Start AI Automation
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}