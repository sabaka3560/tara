import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { StylePreferences } from '@/types/shop'

const PREFS_KEY = 'tara_style_prefs'

const DEFAULT_PREFS: StylePreferences = {
  bodyType: null,
  colorSeason: null,
  styles: [],
  budget: null,
  occasions: [],
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<StylePreferences>(DEFAULT_PREFS)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      if (raw) setPrefs(JSON.parse(raw) as StylePreferences)
      setIsLoaded(true)
    })
  }, [])

  const savePrefs = useCallback(
    async (updates: Partial<StylePreferences>) => {
      const next = { ...prefs, ...updates }
      setPrefs(next)
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next))
    },
    [prefs],
  )

  return { prefs, savePrefs, isLoaded }
}
