import type { ClothingItem, Occasion, StyleCategory } from '@/types/clothing'

export type GapInsight = {
  label: string
  sub: string
}

const STYLE_LABELS: Record<StyleCategory, string> = {
  ethnic: 'ethnic wear',
  western: 'western pieces',
  'indo-western': 'indo-western fusion',
  formal: 'formal wear',
  streetwear: 'streetwear',
}

const OCCASION_LABELS: Record<Occasion, string> = {
  casual: 'casual outings',
  office: 'office looks',
  festive: 'festive occasions',
  wedding: 'wedding events',
  party: 'parties',
  daily: 'daily wear',
  sports: 'active wear',
}

const GARMENT_FOR_OCCASION: Partial<Record<Occasion, string>> = {
  office: 'a blazer or formal top',
  festive: 'a festive kurta or saree',
  wedding: 'a lehenga or ethnic set',
  casual: 'a casual co-ord or dress',
  party: 'a party dress or indo-western set',
}

export function computeWardrobeGap(items: ClothingItem[]): GapInsight | null {
  const ready = items.filter((i) => i.status === 'ready')
  if (!ready.length) return null

  const styleCounts: Partial<Record<StyleCategory, number>> = {}
  const occasionCounts: Partial<Record<Occasion, number>> = {}

  for (const item of ready) {
    styleCounts[item.style] = (styleCounts[item.style] ?? 0) + 1
    for (const occ of item.occasion) {
      occasionCounts[occ] = (occasionCounts[occ] ?? 0) + 1
    }
  }

  const STYLE_PRIORITY: StyleCategory[] = ['formal', 'western', 'ethnic', 'indo-western', 'streetwear']
  for (const style of STYLE_PRIORITY) {
    if (!styleCounts[style]) {
      return {
        label: `Missing: ${STYLE_LABELS[style]}`,
        sub: `Add ${STYLE_LABELS[style]} to complete your wardrobe`,
      }
    }
  }

  const OCCASION_PRIORITY: Occasion[] = ['office', 'festive', 'wedding', 'party', 'casual']
  for (const occ of OCCASION_PRIORITY) {
    if (!occasionCounts[occ]) {
      const garment = GARMENT_FOR_OCCASION[occ] ?? 'something special'
      return {
        label: `Gap: ${OCCASION_LABELS[occ]}`,
        sub: `You could use ${garment}`,
      }
    }
  }

  // Find the least-worn style (underutilised)
  const leastStyle = STYLE_PRIORITY.reduce((a, b) =>
    (styleCounts[a] ?? 0) < (styleCounts[b] ?? 0) ? a : b,
  )
  return {
    label: `Expand your ${STYLE_LABELS[leastStyle]}`,
    sub: `Only ${styleCounts[leastStyle]} ${STYLE_LABELS[leastStyle]} item${styleCounts[leastStyle] === 1 ? '' : 's'} in your wardrobe`,
  }
}
