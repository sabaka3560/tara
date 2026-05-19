import { useQuery } from '@tanstack/react-query'
import { usePreferences } from '@/hooks/usePreferences'
import { API_BASE_URL } from '@/lib/constants'
import { MOCK_PRODUCTS } from '@/lib/mockShop'
import type { Product } from '@/types/shop'

export type RecommendationSource = 'wardrobe_match' | 'preference_match' | 'catalog_browse'

export type RecommendationsResult = {
  items: Product[]
  source: RecommendationSource
  wardrobeItemsUsed: number
  likedProductIds: string[]
}

async function fetchRecommendations(
  styles: string[],
  budget: string | null,
  occasions: string[],
  category: string | null,
): Promise<RecommendationsResult> {
  const params = new URLSearchParams({ limit: '20' })
  if (styles.length) params.set('styles', styles.join(','))
  if (budget) params.set('budget', budget)
  if (occasions.length) params.set('occasions', occasions.join(','))
  if (category) params.set('category', category)

  const res = await fetch(`${API_BASE_URL}/shop/recommendations?${params}`, {
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = await res.json()
  return {
    items: data.items.map((item: any): Product => ({
      id: item.id,
      title: item.title,
      price: item.price_inr,
      originalPrice: item.original_price_inr ?? undefined,
      image_url: item.image_url,
      platform: item.platform,
      affiliate_url: item.affiliate_url,
      rating: item.rating ?? null,
      category: item.category,
      reason: item.reason,
    })),
    source: data.source,
    wardrobeItemsUsed: data.wardrobe_items_used,
    likedProductIds: data.liked_product_ids ?? [],
  }
}

function buildFallback(styles: string[], category: string | null): RecommendationsResult {
  let items = MOCK_PRODUCTS
  if (styles.length > 0) {
    const filtered = MOCK_PRODUCTS.filter((p) => styles.includes(p.category))
    if (filtered.length > 0) items = filtered
  }
  if (category) {
    const catFiltered = items.filter((p) => p.category.toLowerCase() === category.toLowerCase())
    if (catFiltered.length > 0) items = catFiltered
  }
  return {
    items,
    source: styles.length > 0 ? 'preference_match' : 'catalog_browse',
    wardrobeItemsUsed: 0,
    likedProductIds: [],
  }
}

export function useRecommendations(category: string | null = null) {
  const { prefs, isLoaded } = usePreferences()

  return useQuery<RecommendationsResult>({
    queryKey: ['recommendations', prefs.styles, prefs.budget, prefs.occasions, category],
    queryFn: () =>
      fetchRecommendations(prefs.styles, prefs.budget, prefs.occasions, category).catch(
        () => buildFallback(prefs.styles, category),
      ),
    enabled: isLoaded,
    staleTime: 5 * 60 * 1000,
    placeholderData: () => buildFallback(prefs.styles, category),
  })
}
