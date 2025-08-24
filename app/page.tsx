import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Header } from '@/components/landing/Header'
import { HeroSection } from '@/components/landing/HeroSection'
import { ProblemSolution } from '@/components/landing/ProblemSolution'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Features } from '@/components/landing/Features'
import { SocialProof } from '@/components/landing/SocialProof'
import { PricingSection } from '@/components/landing/PricingSection'
import { Roadmap } from '@/components/landing/Roadmap'
import { Footer } from '@/components/landing/Footer'
import { StructuredData } from '@/components/structured-data'

export default async function HomePage() {
  const session = await auth()
  
  if (session) {
    redirect("/dashboard")
  }

  return (
    <>
      <StructuredData />
      <div className="min-h-screen bg-background">
        <Header />
        <HeroSection />
        <ProblemSolution />
        <HowItWorks />
        <Features />
        <SocialProof />
        <PricingSection />
        <Roadmap />
        <Footer />
      </div>
    </>
  )
}