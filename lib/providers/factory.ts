import { AdsProvider } from "./types"
import { MetaAdsProvider } from "./meta-ads-provider"
import { GoogleAdsProvider } from "./google-ads-provider"

export type ProviderType = "meta" | "google"

export class ProviderFactory {
  private static providers: Map<ProviderType, AdsProvider> = new Map()
  
  static {
    // Initialize providers
    this.providers.set("meta", new MetaAdsProvider())
    this.providers.set("google", new GoogleAdsProvider())
  }
  
  /**
   * Get a provider instance by type
   */
  static getProvider(type: ProviderType): AdsProvider {
    const provider = this.providers.get(type)
    if (!provider) {
      throw new Error(`Unknown provider type: ${type}`)
    }
    return provider
  }
  
  /**
   * Get all available providers
   */
  static getAllProviders(): AdsProvider[] {
    return Array.from(this.providers.values())
  }
  
  /**
   * Check if a provider is supported
   */
  static isSupported(type: string): boolean {
    return this.providers.has(type as ProviderType)
  }
  
  /**
   * Get list of supported provider types
   */
  static getSupportedTypes(): ProviderType[] {
    return Array.from(this.providers.keys())
  }
}

// Export convenience functions
export function getProvider(type: ProviderType): AdsProvider {
  return ProviderFactory.getProvider(type)
}

export function getAllProviders(): AdsProvider[] {
  return ProviderFactory.getAllProviders()
}

export function isProviderSupported(type: string): boolean {
  return ProviderFactory.isSupported(type)
}