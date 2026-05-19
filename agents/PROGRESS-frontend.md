# Agent: Frontend
# Branch: agent-frontend
# Owns: app/**, components/**, hooks/**, lib/**
# Phase: 1

## Status: COMPLETE

## Phase 0 Checklist
- [x] Expo project created: com.tara.wardrobe
- [x] Runs on Android emulator
- [x] Supabase client initialised
- [x] Expo Router tab layout skeleton
- [x] Reanimated 4 installed, test animation renders
- [x] Gluestack UI v2 theme configured (dark mode default)

## Phase 1 Checklist
- [x] `types/clothing.ts` — ClothingItem, GarmentType, Occasion, Season, StyleCategory, UploadResponse (matches CONTRACTS.md exactly)
- [x] `hooks/useWardrobe.ts` — TanStack Query fetch + Supabase Realtime subscription; cache-patches item status on UPDATE events
- [x] `hooks/useUpload.ts` — expo-image-manipulator compress (1024px, 0.8 quality) + multipart POST to /wardrobe/upload
- [x] `components/wardrobe/ClothingCard.tsx` — expo-image with blurhash placeholder; processing overlay with spinner; error overlay with retry
- [x] `components/wardrobe/WardrobeGrid.tsx` — MasonryFlashList 2-col, pull-to-refresh, EmptyState fallback
- [x] `app/(tabs)/wardrobe.tsx` — real implementation: useWardrobe + useUpload + ImagePicker FAB + Reanimated mount animation
- [x] `app/camera.tsx` — VisionCamera v4 back camera, circular capture button, back button, passes photoUri to wardrobe via router.replace

## Phase 1.5 UI Overhaul — "Digital Goddess 2026"

### Status: COMPLETE

### Design System Changes
- [x] `lib/constants.ts` — Extended with full design token set: TARA_SURFACE_2, TARA_BORDER, TARA_GOLD, TARA_LAVENDER, TARA_TEXT, TARA_TEXT_2; gradient arrays (GRADIENT_PINK_PURPLE, GRADIENT_GOLD_PINK, GRADIENT_DARK_CARD, GRADIENT_AURORA); typography constants (FONT_DISPLAY, FONT_DISPLAY_ITALIC, FONT_BODY, FONT_BODY_MEDIUM, FONT_BODY_SEMI, FONT_BODY_BOLD); spacing radii (RADIUS_SM/MD/LG/XL)
- [x] `lib/quotes.ts` — 12 motivational quotes with daily rotation via `getTodayQuote()` keyed on `new Date().getDate()`

### Layout & Navigation
- [x] `app/_layout.tsx` — Font loading via `useFonts`: PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic, Poppins 400/500/600/700; SplashScreen tied to font load; StatusBar light-content; `preferences` screen added to Stack
- [x] `app/(tabs)/_layout.tsx` — Rebuilt with 4 tabs (Home/Wardrobe/Outfits/Shop replacing Profile); BlurView glassmorphism tab bar with pink aurora border; Poppins_500Medium labels

### Screens
- [x] `app/(tabs)/index.tsx` — New Home dashboard: aurora gradient background (two radial orbs), Reanimated staggered entrance (header slides in, quote fades up), daily quote card with BlurView + gradient overlay + PlayfairDisplay italic, stats row (Items/Outfits/Loved), Quick Actions grid, AI Outfit of the Day feature card
- [x] `app/(tabs)/wardrobe.tsx` — Premium header: LinearGradient + PlayfairDisplay_700Bold title; gradient FAB (pink→lavender) with shadow glow; `withDelay` spring for FAB entrance
- [x] `app/(tabs)/outfits.tsx` — Premium placeholder: gradient badge + PlayfairDisplay italic title + Poppins body copy

### Components
- [x] `components/ui/SafeScreen.tsx` — Already had `style` prop support; no change required
- [x] `components/ui/LoadingSpinner.tsx` — Added optional `label` prop with Poppins_500Medium typography; TARA_PINK spinner retained

### Font Packages Required
```
@expo-google-fonts/playfair-display
@expo-google-fonts/poppins
expo-font
```

### Decisions Log
- Aurora background uses two `Animated.View` orbs with `LinearGradient` and `pointerEvents="none"` — avoids touch interception, zero runtime cost
- `getTodayQuote()` uses `day % length` for deterministic daily rotation without persistence
- Tab bar uses `position: 'absolute'` + `tabBarBackground: BlurView` pattern — required for transparent blur effect on both iOS and Android
- `withDelay` wraps `withSpring` for FAB entrance (300ms) — avoids competing with content animations
- Duplicate `borderRadius` in fab style removed — StyleSheet.create last-write-wins but cleaner to deduplicate

## Notes
Run `npx expo start --android` to verify on Android emulator.

## Decisions Log
- Used StyleSheet.create() throughout — no inline styles
- All colors sourced from lib/constants.ts (TARA_PINK, TARA_BG, TARA_SURFACE, TARA_MUTED)
- Named component functions used throughout — no arrow function components
- useCallback on all handlers passed to children
- Supabase Realtime channel uses `user_id=eq.${userId}` row-level filter — avoids broadcasting other users' updates
- React Query cache patched via setQueryData on Realtime UPDATE events — avoids full refetch on every status change
- Image compressed to max 1024px wide at 0.8 JPEG quality before upload — reduces payload without visible quality loss
- `upload()` in useUpload re-throws with readable message so callers can show Alert
- Camera screen passes photo.path back via router.replace params — wardrobe screen reads via useLocalSearchParams
- photoUri effect in wardrobe.tsx depends on the uri value — will only fire once per navigation with params
- ExpoSecureStoreAdapter wires Supabase auth to device secure storage
- useSupabaseAuth hook encapsulates all auth logic; screens stay render-only
