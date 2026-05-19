import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants'

// Adapter that stores Supabase session tokens in Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string): Promise<void> => {
    return SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string): Promise<void> => {
    return SecureStore.deleteItemAsync(key)
  },
}

// Use placeholder values in dev when env vars aren't configured yet — prevents
// createClient from throwing at module load time and crashing the whole app.
const resolvedUrl = SUPABASE_URL || 'https://placeholder.supabase.co'
const resolvedKey = SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(resolvedUrl, resolvedKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Placeholder for generated Supabase database types
// Replace with: import type { Database } from './database.types'
export type Database = Record<string, unknown>
