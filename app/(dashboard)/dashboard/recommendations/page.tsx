import { RecommendationsDashboard } from "@/components/recommendations/recommendations-dashboard"

export default function RecommendationsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Recommendations</h2>
          <p className="text-muted-foreground">
            AI-powered insights to optimize your ad campaigns
          </p>
        </div>
      </div>
      <RecommendationsDashboard />
    </div>
  )
}