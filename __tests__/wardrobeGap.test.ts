import { computeWardrobeGap } from '../lib/wardrobeGap'
import type { ClothingItem } from '../types/clothing'

const base: ClothingItem = {
  id: '1',
  user_id: 'u1',
  image_url: 'https://example.com/img.jpg',
  blurhash: '',
  status: 'ready',
  type: 'kurta',
  colors: ['red'],
  pattern: 'solid',
  fabric_guess: 'cotton',
  occasion: ['casual', 'festive'],
  season: ['all-season'],
  style: 'ethnic',
  fit: 'regular',
  wear_count: 1,
  last_worn: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('computeWardrobeGap', () => {
  it('returns null for empty wardrobe', () => {
    expect(computeWardrobeGap([])).toBeNull()
  })

  it('returns null when only processing items exist', () => {
    const processing = { ...base, status: 'processing' as const }
    expect(computeWardrobeGap([processing])).toBeNull()
  })

  it('flags missing formal style first', () => {
    const items = [base] // only ethnic
    const gap = computeWardrobeGap(items)
    expect(gap).not.toBeNull()
    expect(gap!.label).toContain('formal')
  })

  it('flags missing occasion when all styles are present', () => {
    const allStyles: ClothingItem[] = [
      { ...base, id: '1', style: 'ethnic' },
      { ...base, id: '2', style: 'western' },
      { ...base, id: '3', style: 'indo-western' },
      { ...base, id: '4', style: 'formal' },
      { ...base, id: '5', style: 'streetwear' },
    ]
    const gap = computeWardrobeGap(allStyles)
    // All styles present; should flag a missing occasion (wedding/party/etc.)
    expect(gap).not.toBeNull()
    expect(gap!.label).toMatch(/Gap|Expand/)
  })

  it('returns an insight when wardrobe is complete', () => {
    const fullWardrobe: ClothingItem[] = [
      { ...base, id: '1', style: 'ethnic', occasion: ['casual', 'festive', 'wedding', 'office', 'party'] },
      { ...base, id: '2', style: 'western', occasion: ['casual', 'festive', 'wedding', 'office', 'party'] },
      { ...base, id: '3', style: 'indo-western', occasion: ['casual', 'festive', 'wedding', 'office', 'party'] },
      { ...base, id: '4', style: 'formal', occasion: ['casual', 'festive', 'wedding', 'office', 'party'] },
      { ...base, id: '5', style: 'streetwear', occasion: ['casual', 'festive', 'wedding', 'office', 'party'] },
    ]
    const gap = computeWardrobeGap(fullWardrobe)
    expect(gap).not.toBeNull()
    expect(typeof gap!.label).toBe('string')
    expect(typeof gap!.sub).toBe('string')
  })
})
