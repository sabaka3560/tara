import { scorePair, scoreOutfitColors, rankCandidates, COLOR_HEX } from '../lib/colorMatch'
import type { ClothingItem } from '../types/clothing'

const makeItem = (id: string, colors: string[], status: ClothingItem['status'] = 'ready'): ClothingItem => ({
  id,
  user_id: 'u1',
  image_url: `https://example.com/${id}.jpg`,
  blurhash: '',
  status,
  type: 'dress',
  colors,
  pattern: 'solid',
  fabric_guess: 'cotton',
  occasion: ['casual'],
  season: ['all-season'],
  style: 'western',
  fit: 'regular',
  wear_count: 1,
  last_worn: null,
  created_at: '2026-01-01T00:00:00Z',
})

describe('scorePair', () => {
  it('neutral + anything = high score (≥ 0.90)', () => {
    expect(scorePair('black', 'red')).toBeGreaterThanOrEqual(0.90)
    expect(scorePair('white', 'teal')).toBeGreaterThanOrEqual(0.90)
    expect(scorePair('charcoal', 'gold')).toBeGreaterThanOrEqual(0.90)
  })

  it('iconic Indian combos score ≥ 0.92', () => {
    expect(scorePair('crimson', 'gold')).toBeGreaterThanOrEqual(0.92)
    expect(scorePair('red', 'gold')).toBeGreaterThanOrEqual(0.92)
    expect(scorePair('teal', 'gold')).toBeGreaterThanOrEqual(0.92)
    expect(scorePair('pink', 'green')).toBeGreaterThanOrEqual(0.92)
    expect(scorePair('rose', 'teal')).toBeGreaterThanOrEqual(0.90)
    expect(scorePair('purple', 'gold')).toBeGreaterThanOrEqual(0.90)
  })

  it('is symmetric — order does not matter', () => {
    expect(scorePair('crimson', 'gold')).toBe(scorePair('gold', 'crimson'))
    expect(scorePair('orange', 'pink')).toBe(scorePair('pink', 'orange'))
    expect(scorePair('teal', 'mustard')).toBe(scorePair('mustard', 'teal'))
  })

  it('known clashes score below 0.45', () => {
    expect(scorePair('orange', 'pink')).toBeLessThan(0.45)
    expect(scorePair('red', 'pink')).toBeLessThan(0.45)
    expect(scorePair('orange', 'purple')).toBeLessThan(0.45)
  })

  it('same color = monochromatic = 0.85', () => {
    expect(scorePair('teal', 'teal')).toBe(0.85)
    expect(scorePair('gold', 'gold')).toBe(0.85)
  })

  it('warm + cool (generic) scores around 0.52', () => {
    // blue + orange — no override, raw family score
    expect(scorePair('blue', 'orange')).toBeCloseTo(0.52, 1)
  })

  it('case-insensitive', () => {
    expect(scorePair('Gold', 'Crimson')).toBe(scorePair('gold', 'crimson'))
    expect(scorePair('TEAL', 'pink')).toBe(scorePair('teal', 'pink'))
  })

  it('unknown colors default to neutral family (≥ 0.90 with anything)', () => {
    expect(scorePair('neonlime', 'crimson')).toBeGreaterThanOrEqual(0.85)
  })
})

describe('scoreOutfitColors', () => {
  it('single-color item returns monochrome label', () => {
    const result = scoreOutfitColors([makeItem('1', ['teal'])])
    expect(result.label).toBe('Monochrome look')
    expect(result.score).toBeGreaterThan(0.5)
  })

  it('great-matching outfit scores ≥ 0.90', () => {
    const result = scoreOutfitColors([
      makeItem('1', ['crimson']),
      makeItem('2', ['gold']),
    ])
    expect(result.score).toBeGreaterThanOrEqual(0.90)
    expect(result.label).toMatch(/Perfect|Colors work/)
  })

  it('clashing outfit scores below 0.60 (clash penalty applied)', () => {
    const result = scoreOutfitColors([
      makeItem('1', ['orange']),
      makeItem('2', ['pink']),
    ])
    expect(result.score).toBeLessThan(0.60)
    expect(result.label).toMatch(/clash|Bold/)
  })

  it('palette deduplicates repeated colors', () => {
    const result = scoreOutfitColors([
      makeItem('1', ['teal', 'gold']),
      makeItem('2', ['teal']),
    ])
    expect(result.palette.filter((c) => c === 'teal').length).toBe(1)
  })

  it('includes all unique colors across items', () => {
    const result = scoreOutfitColors([
      makeItem('1', ['crimson']),
      makeItem('2', ['gold']),
      makeItem('3', ['ivory']),
    ])
    expect(result.palette).toContain('crimson')
    expect(result.palette).toContain('gold')
    expect(result.palette).toContain('ivory')
  })
})

describe('rankCandidates', () => {
  it('sorts by color score descending', () => {
    const good = [makeItem('1', ['crimson']), makeItem('2', ['gold'])]
    const bad = [makeItem('3', ['orange']), makeItem('4', ['pink'])]
    const ranked = rankCandidates([bad, good])
    expect(ranked[0].colorScore).toBeGreaterThan(ranked[1]?.colorScore ?? 0)
  })

  it('deduplicates identical item sets', () => {
    const combo = [makeItem('1', ['teal']), makeItem('2', ['gold'])]
    const ranked = rankCandidates([combo, combo, combo])
    expect(ranked.length).toBe(1)
  })

  it('returns at most 3 results', () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      [makeItem(`${i}`, ['teal', 'gold'])]
    )
    const ranked = rankCandidates(candidates)
    expect(ranked.length).toBeLessThanOrEqual(3)
  })

  it('empty input returns empty array', () => {
    expect(rankCandidates([])).toEqual([])
  })
})

describe('COLOR_HEX', () => {
  it('has hex entries for all key Indian fashion colors', () => {
    const mustHave = ['crimson', 'gold', 'teal', 'ivory', 'rose', 'indigo', 'mustard', 'terracotta']
    for (const color of mustHave) {
      expect(COLOR_HEX[color]).toBeTruthy()
      expect(COLOR_HEX[color]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})
