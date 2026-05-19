import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { apiGet } from '@/lib/api'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { MOCK_WARDROBE_ITEMS } from '@/lib/mockShop'
import type { ClothingItem } from '@/types/clothing'

type WardrobeResponse = {
  items: ClothingItem[]
  next_cursor: string | null
}

const WARDROBE_KEY = ['wardrobe', 'items'] as const

async function fetchWardrobeItems(token: string): Promise<ClothingItem[]> {
  const resp = await apiGet('/wardrobe/items', token)
  if (!resp.ok) {
    throw new Error(`Failed to load wardrobe: ${resp.status}`)
  }
  const data = (await resp.json()) as WardrobeResponse
  return data.items
}

export function useWardrobe() {
  const { session } = useSupabaseAuth()
  const queryClient = useQueryClient()
  const userId = session?.user?.id ?? null
  const token = session?.access_token ?? ''

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: WARDROBE_KEY,
    queryFn: () => fetchWardrobeItems(token),
    enabled: !!token,
    placeholderData: MOCK_WARDROBE_ITEMS,
  })

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('wardrobe-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clothing_items',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as ClothingItem
          queryClient.setQueryData<ClothingItem[]>(WARDROBE_KEY, (prev) => {
            if (!prev) return prev
            return prev.map((item) =>
              item.id === updated.id ? { ...item, ...updated } : item,
            )
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  return {
    items: data ?? MOCK_WARDROBE_ITEMS,
    isLoading,
    error,
    refetch,
  }
}
