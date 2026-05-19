import { MOCK_PRODUCTS } from '../lib/mockShop'

// Extract and test buildFallback logic directly (pure function)
function buildFallback(
  styles: string[],
  category: string | null,
): { items: typeof MOCK_PRODUCTS; source: string; wardrobeItemsUsed: number } {
  let items = MOCK_PRODUCTS
  if (styles.length > 0) {
    const filtered = MOCK_PRODUCTS.filter((p) => styles.includes(p.category))
    if (filtered.length > 0) items = filtered
  }
  if (category) {
    const catFiltered = items.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase(),
    )
    if (catFiltered.length > 0) items = catFiltered
  }
  return {
    items,
    source: styles.length > 0 ? 'preference_match' : 'catalog_browse',
    wardrobeItemsUsed: 0,
  }
}

describe('recommendations fallback', () => {
  it('returns all products when no styles or category', () => {
    const result = buildFallback([], null)
    expect(result.items.length).toBe(MOCK_PRODUCTS.length)
    expect(result.source).toBe('catalog_browse')
    expect(result.wardrobeItemsUsed).toBe(0)
  })

  it('filters by style preference', () => {
    const result = buildFallback(['ethnic'], null)
    expect(result.source).toBe('preference_match')
    expect(result.items.every((p) => p.category === 'ethnic')).toBe(true)
  })

  it('filters by category within style-filtered results', () => {
    const result = buildFallback(['ethnic', 'western'], 'western')
    expect(result.items.every((p) => p.category.toLowerCase() === 'western')).toBe(true)
  })

  it('falls back to style-filtered if category yields nothing', () => {
    const result = buildFallback(['ethnic'], 'nonexistent-category')
    // category filter finds nothing → stays on style-filtered subset
    expect(result.items.every((p) => p.category === 'ethnic')).toBe(true)
  })

  it('falls back to all products if both style and category match nothing', () => {
    const result = buildFallback(['nonexistent-style'], null)
    // style filter finds nothing → stays on full MOCK_PRODUCTS
    expect(result.items.length).toBe(MOCK_PRODUCTS.length)
  })

  it('all mock products have required fields', () => {
    for (const p of MOCK_PRODUCTS) {
      expect(p.id).toBeTruthy()
      expect(p.title).toBeTruthy()
      expect(typeof p.price).toBe('number')
      expect(p.image_url).toBeTruthy()
      expect(p.platform).toBeTruthy()
      expect(p.category).toBeTruthy()
    }
  })
})
