import { useQuery } from '@tanstack/react-query'
import { API_BASE_URL } from '@/lib/constants'
import type { Product } from '@/types/shop'

interface LiveSearchResult {
  query: string
  products: Product[]
  count: number
}

async function fetchLiveSearch(q: string, limit: number): Promise<LiveSearchResult> {
  const params = new URLSearchParams({ q, limit: String(limit) })
  const res = await fetch(`${API_BASE_URL}/shop/live-search?${params}`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  // Normalise product fields from backend snake_case to frontend camelCase
  return {
    query: data.query,
    count: data.count,
    products: (data.products as any[]).map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      originalPrice: p.originalPrice ?? undefined,
      image_url: p.image_url,
      platform: p.platform,
      affiliate_url: p.affiliate_url,
      rating: p.rating ?? null,
      category: p.category ?? 'fashion',
      reason: undefined,
    })) as Product[],
  }
}

export function useShopSearch(q: string, limit = 20) {
  return useQuery<LiveSearchResult>({
    queryKey: ['shop-search', q, limit],
    queryFn: () => fetchLiveSearch(q, limit),
    enabled: q.trim().length >= 2,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  })
}
