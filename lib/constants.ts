export const API_BASE_URL = __DEV__
  ? 'http://localhost:8000/api/v1'
  : 'https://api.tara.app/api/v1'

declare const process: { env: Record<string, string | undefined> }
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

// ─── Palette — Luminous Futura (light, glassmorphism) ────────────────────────
export const TARA_BG            = '#F8F9FF'   // pearlescent white base
export const TARA_SURFACE       = 'rgba(255,255,255,0.60)'  // glass card surface
export const TARA_SURFACE_2     = 'rgba(255,255,255,0.80)'  // elevated glass
export const TARA_SURFACE_SOLID = '#FFFFFF'
export const TARA_BORDER        = 'rgba(255,255,255,0.70)'  // glass inner border
export const TARA_BORDER_DARK   = 'rgba(18,18,59,0.08)'     // subtle separator

// Accent colours
export const TARA_PINK          = '#755567'   // primary (on-surface)
export const TARA_PINK_LIGHT    = '#FAD0E6'   // primary container / button fill
export const TARA_LAVENDER      = '#6F5092'   // secondary
export const TARA_LAVENDER_LIGHT = '#D9B5FF'  // secondary container
export const TARA_INDIGO        = '#12123B'   // high-contrast text / deep accent
export const TARA_MUTED         = '#807479'   // outline / muted text
export const TARA_TEXT          = '#16163F'   // on-background
export const TARA_TEXT_2        = '#4E4449'   // on-surface-variant

// Legacy aliases so existing imports don't break
export const TARA_ROUGE         = TARA_PINK
export const TARA_BRASS         = TARA_LAVENDER_LIGHT
export const TARA_VIOLET        = TARA_LAVENDER

// Gradients
export const GRADIENT_PINK_LAVENDER  = ['#FAD0E6', '#D9B5FF'] as const
export const GRADIENT_LAVENDER_PINK  = ['#D9B5FF', '#FAD0E6'] as const
export const GRADIENT_INDIGO_PURPLE  = ['#12123B', '#6F5092'] as const
export const GRADIENT_PEARL          = ['#FFFFFF', '#F0EDFF'] as const

// Legacy gradient aliases
export const GRADIENT_ROUGE_VIOLET   = GRADIENT_PINK_LAVENDER
export const GRADIENT_BRASS_ROUGE    = GRADIENT_LAVENDER_PINK
export const GRADIENT_PINK_PURPLE    = GRADIENT_PINK_LAVENDER
export const GRADIENT_GOLD_PINK      = GRADIENT_LAVENDER_PINK

// ─── Typography — Plus Jakarta Sans ──────────────────────────────────────────
export const FONT_DISPLAY       = 'PlusJakartaSans_700Bold'
export const FONT_DISPLAY_ITALIC = 'PlusJakartaSans_700Bold_Italic'
export const FONT_BODY          = 'PlusJakartaSans_400Regular'
export const FONT_BODY_MEDIUM   = 'PlusJakartaSans_500Medium'
export const FONT_BODY_SEMI     = 'PlusJakartaSans_600SemiBold'
export const FONT_BODY_BOLD     = 'PlusJakartaSans_700Bold'
export const FONT_LABEL         = 'PlusJakartaSans_600SemiBold'
export const FONT_LABEL_MEDIUM  = 'PlusJakartaSans_500Medium'

// ─── Shape ───────────────────────────────────────────────────────────────────
export const RADIUS_SM  = 12
export const RADIUS_MD  = 20
export const RADIUS_LG  = 28
export const RADIUS_XL  = 36
export const RADIUS_FULL = 9999

// ─── Business ────────────────────────────────────────────────────────────────
export const SWIPE_THRESHOLD  = 120
export const MAX_UPLOAD_SIZE_MB = 10
