import { useMutation, useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '@/lib/constants'
import type { Product } from '@/types/shop'

type InteractionType = 'like' | 'dislike' | 'save' | 'purchase'

interface InteractionPayload {
  product: Product
  interaction_type: InteractionType
}

async function postInteraction(payload: InteractionPayload, token?: string): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  await fetch(`${API_BASE_URL}/shop/interact`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      product_id:        payload.product.id,
      product_title:     payload.product.title,
      product_category:  payload.product.category,
      product_platform:  payload.product.platform,
      product_image_url: payload.product.image_url,
      product_url:       payload.product.affiliate_url,
      interaction_type:  payload.interaction_type,
    }),
  })
}

export function useProductInteraction(token?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: InteractionPayload) => postInteraction(payload, token),
    onMutate: async (payload) => {
      // Optimistically update liked_product_ids in the recommendations cache
      if (payload.interaction_type === 'dislike') return

      await queryClient.cancelQueries({ queryKey: ['recommendations'] })
      queryClient.setQueriesData<{ liked_product_ids?: string[] }>(
        { queryKey: ['recommendations'] },
        (old) => {
          if (!old) return old
          const current = old.liked_product_ids ?? []
          if (current.includes(payload.product.id)) return old
          return { ...old, liked_product_ids: [...current, payload.product.id] }
        },
      )
    },
    onSuccess: () => {
      // Stale recommendations after interaction — new query will blend updated pref vector
      queryClient.invalidateQueries({ queryKey: ['recommendations'] })
    },
    onError: (_err, payload) => {
      // Roll back optimistic update
      queryClient.setQueriesData<{ liked_product_ids?: string[] }>(
        { queryKey: ['recommendations'] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            liked_product_ids: (old.liked_product_ids ?? []).filter(
              (id) => id !== payload.product.id,
            ),
          }
        },
      )
    },
  })
}
