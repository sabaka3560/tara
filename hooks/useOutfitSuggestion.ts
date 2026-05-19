import { useState, useCallback } from 'react'
import { API_BASE_URL } from '@/lib/constants'
import { rankCandidates } from '@/lib/colorMatch'
import type { RankedOutfit } from '@/lib/colorMatch'
import type { ClothingItem, GarmentType, Occasion } from '@/types/clothing'

export type SuggestedOutfit = RankedOutfit & {
  occasion: string
  reason: string
}

const BASE_TYPES: GarmentType[] = ['kurta', 'saree', 'lehenga', 'dress', 'top']
const BOTTOM_TYPES: GarmentType[] = ['jeans', 'palazzo', 'salwar', 'skirt']
const LAYER_TYPES: GarmentType[] = ['blazer', 'jacket', 'dupatta']

// Sarees and lehengas are complete garments — don't need a separate bottom
const SELF_CONTAINED: GarmentType[] = ['saree', 'lehenga']

const OCCASION_REASONS: Record<string, string> = {
  casual: 'Easy, comfortable pieces for your everyday look',
  office: 'Polished and professional — ready to impress',
  festive: 'Celebratory pieces that bring the occasion alive',
  wedding: 'Dressed for the celebration, effortlessly elegant',
  party: 'Statement pieces to own the room',
}

export function buildLocalOutfits(
  items: ClothingItem[],
  occasion: Occasion,
): SuggestedOutfit[] {
  const ready = items.filter(
    (i) => i.status === 'ready' && i.occasion.includes(occasion),
  )
  if (!ready.length) return []

  const bases = ready.filter((i) => BASE_TYPES.includes(i.type))
  const bottoms = ready.filter((i) => BOTTOM_TYPES.includes(i.type))
  const layers = ready.filter((i) => LAYER_TYPES.includes(i.type))

  const candidates: ClothingItem[][] = []

  for (const base of bases) {
    const selfContained = SELF_CONTAINED.includes(base.type)

    if (selfContained) {
      // Saree/lehenga: optionally add a layer
      candidates.push([base])
      for (const layer of layers) {
        candidates.push([base, layer])
      }
    } else {
      // Top/kurta/dress: pair with each bottom and/or layer
      const bottomOptions: (ClothingItem | null)[] = bottoms.length
        ? bottoms
        : [null]
      const layerOptions: (ClothingItem | null)[] = [null, ...layers]

      for (const bottom of bottomOptions) {
        for (const layer of layerOptions) {
          const combo = [base, bottom, layer].filter(Boolean) as ClothingItem[]
          candidates.push(combo)
        }
      }
    }
  }

  // Fallback: if no bases matched the occasion, use any ready items
  if (!candidates.length) {
    candidates.push(ready.slice(0, 3))
  }

  const ranked = rankCandidates(candidates)
  const baseReason = OCCASION_REASONS[occasion] ?? `Curated for ${occasion}`

  return ranked.map((r, i) => ({
    ...r,
    occasion,
    reason: i === 0 ? baseReason : `${baseReason} — alternate look`,
  }))
}

export function useOutfitSuggestion(items: ClothingItem[]) {
  const [outfits, setOutfits] = useState<SuggestedOutfit[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(
    async (occasion: Occasion) => {
      setIsGenerating(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE_URL}/outfits/suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ occasion, weather: 'warm' }),
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.outfits) && data.outfits.length) {
            setOutfits(data.outfits)
            return
          }
        }
      } catch {
        // backend unavailable — fall through to local
      }
      setOutfits(buildLocalOutfits(items, occasion))
    },
    [items],
  )

  return { outfits, isGenerating, error, generate, setIsGenerating }
}
