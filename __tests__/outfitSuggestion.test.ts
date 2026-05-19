import { buildLocalOutfits } from '../hooks/useOutfitSuggestion'
import type { ClothingItem } from '../types/clothing'

const base: ClothingItem = {
  id: '1',
  user_id: 'u1',
  image_url: 'https://example.com/img.jpg',
  blurhash: '',
  status: 'ready',
  type: 'kurta',
  colors: ['blue'],
  pattern: 'solid',
  fabric_guess: 'cotton',
  occasion: ['casual'],
  season: ['all-season'],
  style: 'ethnic',
  fit: 'regular',
  wear_count: 2,
  last_worn: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('buildLocalOutfits', () => {
  it('returns empty array when no items match occasion', () => {
    const result = buildLocalOutfits([base], 'office')
    expect(result).toEqual([])
  })

  it('returns outfit when items match occasion', () => {
    const casual = { ...base, occasion: ['casual'] as import('../types/clothing').Occasion[] }
    const result = buildLocalOutfits([casual], 'casual')
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].occasion).toBe('casual')
    expect(result[0].items.length).toBeGreaterThan(0)
  })

  it('skips processing items', () => {
    const processing: ClothingItem = { ...base, status: 'processing', occasion: ['casual'] }
    const result = buildLocalOutfits([processing], 'casual')
    expect(result).toEqual([])
  })

  it('groups base + bottom + layer correctly', () => {
    const kurta: ClothingItem = { ...base, id: '1', type: 'kurta', occasion: ['casual'] }
    const palazzo: ClothingItem = { ...base, id: '2', type: 'palazzo', occasion: ['casual'] }
    const dupatta: ClothingItem = { ...base, id: '3', type: 'dupatta', occasion: ['casual'] }

    const result = buildLocalOutfits([kurta, palazzo, dupatta], 'casual')
    expect(result.length).toBeGreaterThan(0)
    const types = result[0].items.map((i) => i.type)
    expect(types).toContain('kurta')
    expect(types).toContain('palazzo')
  })

  it('includes a reason string', () => {
    const result = buildLocalOutfits([base], 'casual')
    if (result.length) {
      expect(typeof result[0].reason).toBe('string')
      expect(result[0].reason.length).toBeGreaterThan(0)
    }
  })

  it('builds outfit for wedding occasion', () => {
    const lehenga: ClothingItem = {
      ...base, id: '10', type: 'lehenga',
      occasion: ['wedding'], style: 'ethnic',
    }
    const result = buildLocalOutfits([lehenga], 'wedding')
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].occasion).toBe('wedding')
  })
})
