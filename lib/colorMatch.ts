import type { ClothingItem } from '@/types/clothing'

type ColorFamily = 'neutral' | 'warm' | 'cool' | 'earth'

// ─── Color → family ──────────────────────────────────────────────────────────

const FAMILY_MAP: Record<string, ColorFamily> = {
  // Neutrals
  white: 'neutral', ivory: 'neutral', cream: 'neutral', 'off-white': 'neutral',
  beige: 'neutral', nude: 'neutral', grey: 'neutral', gray: 'neutral',
  silver: 'neutral', charcoal: 'neutral', black: 'neutral',

  // Warm — reds, pinks, oranges, yellows, golds
  red: 'warm', crimson: 'warm', scarlet: 'warm', maroon: 'warm', burgundy: 'warm',
  wine: 'warm', rose: 'warm', blush: 'warm', pink: 'warm', coral: 'warm',
  peach: 'warm', orange: 'warm', amber: 'warm', gold: 'warm', yellow: 'warm',
  mustard: 'warm', saffron: 'warm', terracotta: 'warm', rust: 'warm', copper: 'warm',

  // Cool — blues, greens, purples, teals
  blue: 'cool', navy: 'cool', royal: 'cool', teal: 'cool', turquoise: 'cool',
  cyan: 'cool', green: 'cool', emerald: 'cool', mint: 'cool', sage: 'cool',
  olive: 'cool', purple: 'cool', violet: 'cool', mauve: 'cool', lavender: 'cool',
  lilac: 'cool', indigo: 'cool', plum: 'cool', magenta: 'cool',

  // Earth — browns, tans
  brown: 'earth', chocolate: 'earth', coffee: 'earth', tan: 'earth',
  camel: 'earth', khaki: 'earth', mocha: 'earth', walnut: 'earth',
}

// ─── Family compatibility matrix ─────────────────────────────────────────────
// Score 0-1. Neutral anchors everything. Warm+cool usually clashes unless offset.

const FAMILY_COMPAT: Record<ColorFamily, Record<ColorFamily, number>> = {
  neutral: { neutral: 0.90, warm: 0.90, cool: 0.90, earth: 0.90 },
  warm:    { neutral: 0.90, warm: 0.78, cool: 0.52, earth: 0.75 },
  cool:    { neutral: 0.90, warm: 0.52, cool: 0.78, earth: 0.68 },
  earth:   { neutral: 0.90, warm: 0.75, cool: 0.68, earth: 0.82 },
}

// ─── Indian fashion specific overrides ───────────────────────────────────────
// Pairs that break the generic family rules in Indian styling

type ColorPair = readonly [string, string]

const OVERRIDE_SCORE: { pair: ColorPair; score: number }[] = [
  // Iconic Indian combinations
  { pair: ['crimson', 'gold'],     score: 0.98 },
  { pair: ['red', 'gold'],         score: 0.97 },
  { pair: ['maroon', 'gold'],      score: 0.97 },
  { pair: ['wine', 'gold'],        score: 0.95 },
  { pair: ['teal', 'gold'],        score: 0.95 },
  { pair: ['purple', 'gold'],      score: 0.95 },
  { pair: ['lavender', 'gold'],    score: 0.93 },
  { pair: ['navy', 'gold'],        score: 0.92 },
  { pair: ['ivory', 'gold'],       score: 0.92 },
  { pair: ['black', 'gold'],       score: 0.92 },
  { pair: ['peach', 'gold'],       score: 0.90 },
  { pair: ['pink', 'green'],       score: 0.95 },
  { pair: ['rose', 'green'],       score: 0.93 },
  { pair: ['rose', 'teal'],        score: 0.93 },
  { pair: ['pink', 'teal'],        score: 0.88 },
  { pair: ['pink', 'blue'],        score: 0.85 },
  { pair: ['rose', 'indigo'],      score: 0.88 },
  { pair: ['terracotta', 'teal'],  score: 0.87 },
  { pair: ['mustard', 'teal'],     score: 0.85 },
  { pair: ['mustard', 'navy'],     score: 0.85 },
  { pair: ['coral', 'teal'],       score: 0.85 },
  // Known clashes
  { pair: ['orange', 'pink'],      score: 0.28 },
  { pair: ['red', 'pink'],         score: 0.35 },
  { pair: ['orange', 'red'],       score: 0.38 },
  { pair: ['yellow', 'green'],     score: 0.40 },
  { pair: ['orange', 'purple'],    score: 0.32 },
]

// ─── Color → display hex ─────────────────────────────────────────────────────

export const COLOR_HEX: Record<string, string> = {
  white: '#FFFFFF', ivory: '#FFFFF0', cream: '#FFFDD0', 'off-white': '#FAF9F6',
  beige: '#F5F0E8', nude: '#E8C9A0', grey: '#9E9E9E', gray: '#9E9E9E',
  silver: '#C0C0C0', charcoal: '#36454F', black: '#1C1C1E',
  red: '#C0392B', crimson: '#DC143C', scarlet: '#FF2400', maroon: '#800000',
  burgundy: '#800020', wine: '#722F37', rose: '#E91E8C', blush: '#FFB6C1',
  pink: '#FF69B4', coral: '#FF6B6B', peach: '#FFCBA4', orange: '#FF8C00',
  amber: '#FFBF00', gold: '#CDA434', yellow: '#F4D03F', mustard: '#E1AC00',
  saffron: '#F4A216', terracotta: '#E2725B', rust: '#B7410E', copper: '#B87333',
  blue: '#3498DB', navy: '#001F5B', royal: '#4169E1', teal: '#008080',
  turquoise: '#40E0D0', cyan: '#00BCD4', green: '#2E7D32', emerald: '#50C878',
  mint: '#98FF98', sage: '#87AE73', olive: '#808000', purple: '#7B1FA2',
  violet: '#5C00B8', mauve: '#956C77', lavender: '#9C6AC8', lilac: '#B39DDB',
  indigo: '#3F51B5', plum: '#8E24AA', magenta: '#C2185B',
  brown: '#6D4C41', chocolate: '#5D4037', coffee: '#4E342E', tan: '#D2B48C',
  camel: '#C19A6B', khaki: '#BDB76B', mocha: '#6F4E37', walnut: '#5C4033',
}

// ─── Core scoring functions ───────────────────────────────────────────────────

function normalize(color: string): string {
  return color.toLowerCase().trim()
}

function getFamily(color: string): ColorFamily {
  return FAMILY_MAP[normalize(color)] ?? 'neutral'
}

function lookupOverride(a: string, b: string): number | null {
  const na = normalize(a)
  const nb = normalize(b)
  for (const { pair, score } of OVERRIDE_SCORE) {
    if ((pair[0] === na && pair[1] === nb) || (pair[0] === nb && pair[1] === na)) {
      return score
    }
  }
  return null
}

export function scorePair(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)

  if (na === nb) return 0.85 // monochromatic — good but slightly flat

  const override = lookupOverride(na, nb)
  if (override !== null) return override

  return FAMILY_COMPAT[getFamily(na)][getFamily(nb)]
}

export type ColorMatchResult = {
  score: number
  label: string
  labelColor: string  // for UI indicator
  palette: string[]   // unique colors across all items
}

export function scoreOutfitColors(items: ClothingItem[]): ColorMatchResult {
  const allColors = items.flatMap((i) => i.colors)
  const palette = [...new Set(allColors.map(normalize))]

  if (palette.length < 2) {
    return { score: 0.80, label: 'Monochrome look', labelColor: '#9C6AC8', palette }
  }

  let total = 0
  let count = 0
  let minScore = 1

  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      const s = scorePair(palette[i], palette[j])
      total += s
      count++
      if (s < minScore) minScore = s
    }
  }

  const avgScore = count > 0 ? total / count : 0.80

  // A single hard clash below 0.35 heavily penalises the outfit
  const finalScore = minScore < 0.35 ? avgScore * 0.6 : avgScore

  return {
    score: finalScore,
    ...labelForScore(finalScore),
    palette,
  }
}

function labelForScore(score: number): { label: string; labelColor: string } {
  if (score >= 0.90) return { label: 'Perfect match', labelColor: '#2E7D32' }
  if (score >= 0.78) return { label: 'Colors work well', labelColor: '#558B2F' }
  if (score >= 0.64) return { label: 'Bold combination', labelColor: '#E65100' }
  return { label: 'Color clash', labelColor: '#C0392B' }
}

// ─── Candidate ranking ────────────────────────────────────────────────────────

export type RankedOutfit = {
  items: ClothingItem[]
  colorScore: number
  colorLabel: string
  colorLabelColor: string
  palette: string[]
}

export function rankCandidates(candidates: ClothingItem[][]): RankedOutfit[] {
  const scored = candidates
    .filter((c) => c.length > 0)
    .map((items) => {
      const { score, label, labelColor, palette } = scoreOutfitColors(items)
      return { items, colorScore: score, colorLabel: label, colorLabelColor: labelColor, palette }
    })
    .sort((a, b) => b.colorScore - a.colorScore)

  // Deduplicate — remove outfits with identical item sets
  const seen = new Set<string>()
  const unique: RankedOutfit[] = []
  for (const outfit of scored) {
    const key = [...outfit.items.map((i) => i.id)].sort().join(',')
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(outfit)
    }
    if (unique.length >= 3) break
  }
  return unique
}
