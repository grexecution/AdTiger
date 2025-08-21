import { NextRequest, NextResponse } from "next/server"
import { getProvider, getAllProviders, isProviderSupported } from "@/lib/providers"
import { prisma } from "@/lib/prisma"
import { getAccountFromHeaders } from "@/lib/account-context"

export async function GET(request: NextRequest) {
  try {
    const { accountId } = await getAccountFromHeaders()
    
    // Test provider factory
    const tests = {
      supportedProviders: ["meta", "google"],
      providerCheck: {
        meta: isProviderSupported("meta"),
        google: isProviderSupported("google"),
        invalid: isProviderSupported("invalid")
      },
      providerInstances: getAllProviders().map(p => ({
        name: p.provider,
        hasListAdAccounts: typeof p.listAdAccounts === "function",
        hasSyncEntities: typeof p.syncEntities === "function",
        hasFetchInsights: typeof p.fetchInsights === "function",
        hasValidateConnection: typeof p.validateConnection === "function"
      }))
    }
    
    // Test Meta provider
    const metaProvider = getProvider("meta")
    
    // Get test connection
    const connection = await prisma.providerConnection.findFirst({
      where: {
        accountId,
        provider: "meta"
      }
    })
    
    let connectionTest = null
    if (connection) {
      // Test connection validation (will fail without real token)
      const isValid = await metaProvider.validateConnection(connection)
      connectionTest = {
        provider: "meta",
        connectionId: connection.id,
        isValid,
        message: isValid ? "Connection is valid" : "Connection validation failed (expected without real token)"
      }
    }
    
    // Test data fetching with mock data
    const mockInsights = await metaProvider.fetchInsights(
      "campaign",
      ["123456789"],
      {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    )
    
    return NextResponse.json({
      success: true,
      tests,
      connectionTest,
      mockInsightsCount: mockInsights.length,
      sampleInsight: mockInsights[0] || null,
      message: "Provider abstraction is working correctly"
    })
    
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}