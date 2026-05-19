export type ShopPlatform = 'myntra' | 'nykaa' | 'flipkart' | 'amazon' | 'meesho'

export const PLATFORM_LABELS: Record<ShopPlatform, string> = {
  myntra: 'Myntra',
  nykaa: 'Nykaa',
  flipkart: 'Flipkart',
  amazon: 'Amazon',
  meesho: 'Meesho',
}

const BUDGET_SUFFIX: Record<string, string> = {
  budget: 'under 1500',
  mid: 'under 4000',
  premium: '',
}

export function buildSearchUrl(platform: string, query: string): string {
  const q = encodeURIComponent(query.trim())
  switch (platform) {
    case 'myntra':
      return `https://www.myntra.com/search?q=${q}`
    case 'nykaa':
      return `https://www.nykaafashion.com/search-result/?q=${q}`
    case 'flipkart':
      return `https://www.flipkart.com/search?q=${q}&otracker=search`
    case 'amazon':
      return `https://www.amazon.in/s?k=${q}`
    case 'meesho':
      return `https://meesho.com/search?q=${q}`
    default:
      return `https://www.myntra.com/search?q=${q}`
  }
}

export function buildStyleSearchUrl(
  styles: string[],
  category: string | null,
  budget: string | null,
  platform: string = 'myntra',
): string {
  const parts: string[] = ['women']
  if (category && category !== 'all') parts.unshift(category)
  else if (styles.length) parts.unshift(styles[0])
  const suffix = budget ? BUDGET_SUFFIX[budget] ?? '' : ''
  if (suffix) parts.push(suffix)
  return buildSearchUrl(platform, parts.join(' '))
}

// Strips label prefixes like "Missing: formal wear" → "women formal wear"
export function buildGapSearchUrl(gapLabel: string, platform: string = 'myntra'): string {
  const cleaned = gapLabel
    .replace(/^(Missing:|Gap:|Expand your)\s*/i, '')
    .trim()
  return buildSearchUrl(platform, `women ${cleaned}`)
}
