// Currency conversion service
// Uses European Central Bank API for real-time exchange rates

interface ExchangeRates {
  base: string
  rates: { [key: string]: number }
  date: string
}

// Cache exchange rates for 1 hour to avoid hitting API too often
let cachedRates: ExchangeRates | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

// Fallback rates in case API is unavailable
const FALLBACK_RATES: { [key: string]: number } = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.52,
  CAD: 1.36,
  CHF: 0.88,
  JPY: 149.50,
  CNY: 7.24,
  INR: 83.12,
  BRL: 4.97,
  MXN: 17.05,
  SGD: 1.35,
  HKD: 7.82,
  NOK: 10.64,
  SEK: 10.36,
  DKK: 6.85,
  PLN: 4.01,
  THB: 35.23,
  IDR: 15462,
  MYR: 4.64,
  PHP: 55.89,
  ZAR: 18.46,
  RUB: 97.25,
  TRY: 32.98,
  NZD: 1.64,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.38,
  OMR: 0.38,
  JOD: 0.71,
  ILS: 3.73,
  EGP: 48.35,
  COP: 4378,
  CLP: 964,
  PEN: 3.78,
  UYU: 41.55,
  ARS: 967,
  VEF: 36.5,
  CZK: 22.58,
  HUF: 358.45,
  RON: 4.57,
  BGN: 1.80,
  HRK: 6.93,
  RSD: 107.65,
  UAH: 40.85,
  KZT: 478.95,
  BYN: 3.27,
  GEL: 2.72,
  AMD: 387.85,
  AZN: 1.70,
  MDL: 17.82,
  KGS: 86.45,
  UZS: 12650,
  TJS: 10.92,
  TMT: 3.50,
  PKR: 278.45,
  LKR: 305.95,
  BDT: 119.45,
  NPR: 133.15,
  AFN: 71.85,
  IRR: 42000,
  IQD: 1310,
  SYP: 13000,
  LBP: 89500,
  YER: 250.35,
  LYD: 4.82,
  TND: 3.13,
  DZD: 134.35,
  MAD: 9.98,
  MUR: 46.35,
  GHS: 15.85,
  NGN: 1580,
  KES: 129.15,
  ETB: 119.85,
  UGX: 3695,
  TZS: 2650,
  RWF: 1335,
  MWK: 1735,
  ZMW: 26.85,
  ZWL: 13.85,
  BWP: 13.45,
  NAD: 18.45,
  SZL: 18.45,
  LSL: 18.45,
  MZN: 63.85,
  AOA: 915,
  XAF: 602.35,
  XOF: 602.35,
  XCD: 2.70,
  XPF: 109.55,
  VUV: 118.85,
  WST: 2.72,
  TOP: 2.36,
  TTD: 6.78,
  TWD: 31.95,
  VND: 25345
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  // Check if we have cached rates that are still valid
  if (cachedRates && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedRates
  }

  try {
    // Try to fetch real-time rates from API
    // Using exchangerate-api.com free tier (no API key needed for basic usage)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    
    if (response.ok) {
      const data = await response.json()
      cachedRates = {
        base: 'USD',
        rates: data.rates,
        date: data.date
      }
      cacheTimestamp = Date.now()
      return cachedRates
    }
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)
  }

  // Return fallback rates if API fails
  return {
    base: 'USD',
    rates: FALLBACK_RATES,
    date: new Date().toISOString().split('T')[0]
  }
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount
  }

  // Get exchange rates
  const rates = await getExchangeRates()

  // Convert to USD first (as base currency)
  let usdAmount = amount
  if (fromCurrency !== 'USD') {
    const fromRate = rates.rates[fromCurrency]
    if (!fromRate) {
      console.warn(`No exchange rate found for ${fromCurrency}, using 1`)
      return amount
    }
    usdAmount = amount / fromRate
  }

  // Convert from USD to target currency
  if (toCurrency === 'USD') {
    return usdAmount
  }

  const toRate = rates.rates[toCurrency]
  if (!toRate) {
    console.warn(`No exchange rate found for ${toCurrency}, using 1`)
    return amount
  }

  return usdAmount * toRate
}

// Format currency with proper symbol and decimals
export function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  
  return formatter.format(amount)
}

// Get currency symbol
export function getCurrencySymbol(currency: string): string {
  const symbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    KRW: '₩',
    RUB: '₽',
    BRL: 'R$',
    MXN: '$',
    CAD: 'C$',
    AUD: 'A$',
    NZD: 'NZ$',
    CHF: 'CHF',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    PLN: 'zł',
    CZK: 'Kč',
    HUF: 'Ft',
    RON: 'lei',
    TRY: '₺',
    ILS: '₪',
    PHP: '₱',
    THB: '฿',
    MYR: 'RM',
    SGD: 'S$',
    HKD: 'HK$',
    TWD: 'NT$',
    ZAR: 'R',
    AED: 'د.إ',
    SAR: 'ر.س',
    EGP: 'E£',
    NGN: '₦',
    KES: 'KSh',
    GHS: '₵',
    UAH: '₴',
    PKR: '₨',
    LKR: '₨',
    BDT: '৳',
    VND: '₫',
    IDR: 'Rp',
    COP: '$',
    CLP: '$',
    ARS: '$',
    PEN: 'S/',
    UYU: '$U'
  }
  
  return symbols[currency] || currency
}