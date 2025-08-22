// Meta API client - basic implementation
export class MetaApiClient {
  constructor(private accessToken: string) {}

  async testConnection() {
    try {
      const response = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${this.accessToken}`)
      return response.ok
    } catch {
      return false
    }
  }

  async getAdAccounts() {
    const response = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?access_token=${this.accessToken}`)
    return response.json()
  }
}

export const createMetaApiClient = (accessToken: string) => new MetaApiClient(accessToken)