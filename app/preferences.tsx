import React, { useCallback } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ChevronLeft } from 'lucide-react-native'
import { SafeScreen } from '@/components/ui/SafeScreen'
import { SectionCard } from '@/components/preferences/SectionCard'
import { SelectionChip } from '@/components/preferences/SelectionChip'
import { BudgetCard } from '@/components/preferences/BudgetCard'
import { usePreferences } from '@/hooks/usePreferences'
import type { StyleCategory, BodyType, BudgetRange } from '@/types/shop'
import {
  TARA_BG,
  TARA_TEXT,
  TARA_INDIGO,
  TARA_MUTED,
  GRADIENT_INDIGO_PURPLE,
  RADIUS_MD,
  FONT_BODY_BOLD,
  FONT_BODY,
  FONT_BODY_SEMI,
  FONT_LABEL,
} from '@/lib/constants'

type AnyIcon = React.ComponentType<{ color: string; size: number; strokeWidth?: number }>
const ChevronLeftI = ChevronLeft as AnyIcon

const STYLE_OPTIONS: StyleCategory[] = ['ethnic', 'western', 'indo-western', 'formal', 'streetwear']
const BODY_TYPES: { key: BodyType; label: string }[] = [
  { key: 'hourglass', label: 'Hourglass' },
  { key: 'pear', label: 'Pear' },
  { key: 'apple', label: 'Apple' },
  { key: 'rectangle', label: 'Rectangle' },
  { key: 'inverted-triangle', label: 'Inverted Triangle' },
]
const OCCASION_OPTIONS = ['Casual', 'Office', 'Festive', 'Wedding', 'Party', 'Sports']

function PreferencesHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.headerRow}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
        <ChevronLeftI color={TARA_TEXT} size={22} strokeWidth={1.5} />
      </TouchableOpacity>
      <View style={styles.headerText}>
        <Text style={styles.title}>Style DNA</Text>
        <Text style={styles.subtitle}>Tell Tara your vibe</Text>
      </View>
    </View>
  )
}

export default function Preferences() {
  const router = useRouter()
  const { prefs, savePrefs, isLoaded } = usePreferences()

  const handleBack = useCallback(() => router.back(), [router])

  const toggleStyle = useCallback(
    (label: string) => {
      const key = label as StyleCategory
      const next = prefs.styles.includes(key)
        ? prefs.styles.filter((s) => s !== key)
        : [...prefs.styles, key]
      savePrefs({ styles: next })
    },
    [prefs.styles, savePrefs],
  )

  const toggleOccasion = useCallback(
    (label: string) => {
      const key = label.toLowerCase()
      const next = prefs.occasions.includes(key)
        ? prefs.occasions.filter((o) => o !== key)
        : [...prefs.occasions, key]
      savePrefs({ occasions: next })
    },
    [prefs.occasions, savePrefs],
  )

  const selectBodyType = useCallback(
    (label: string) => {
      const match = BODY_TYPES.find((b) => b.label === label)
      if (match) savePrefs({ bodyType: match.key })
    },
    [savePrefs],
  )

  const handleSave = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.back()
  }, [router])

  if (!isLoaded) return null

  return (
    <SafeScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <PreferencesHeader onBack={handleBack} />

        <SectionCard title="Style">
          {STYLE_OPTIONS.map((opt) => (
            <SelectionChip
              key={opt}
              label={opt}
              active={prefs.styles.includes(opt)}
              onPress={toggleStyle}
            />
          ))}
        </SectionCard>

        <SectionCard title="Budget">
          <BudgetCard
            selected={prefs.budget}
            onSelect={(b: BudgetRange) => savePrefs({ budget: b })}
          />
        </SectionCard>

        <SectionCard title="Body Type">
          {BODY_TYPES.map((bt) => (
            <SelectionChip
              key={bt.key}
              label={bt.label}
              active={prefs.bodyType === bt.key}
              onPress={selectBodyType}
            />
          ))}
        </SectionCard>

        <SectionCard title="Occasions">
          {OCCASION_OPTIONS.map((occ) => (
            <SelectionChip
              key={occ}
              label={occ}
              active={prefs.occasions.includes(occ.toLowerCase())}
              onPress={toggleOccasion}
            />
          ))}
        </SectionCard>

        <SaveButton onPress={handleSave} />
      </ScrollView>
    </SafeScreen>
  )
}

function SaveButton({ onPress }: { onPress: () => void }) {
  return (
    <LinearGradient
      colors={[...GRADIENT_INDIGO_PURPLE]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.saveBtnGradient}
    >
      <TouchableOpacity onPress={onPress} style={styles.saveBtnInner} activeOpacity={0.85}>
        <Text style={styles.saveBtnText}>Save My Style</Text>
      </TouchableOpacity>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: TARA_BG },
  scrollContent: { paddingBottom: 40 },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    color: TARA_INDIGO,
    fontFamily: FONT_BODY_BOLD,
    fontSize: 28,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: TARA_MUTED,
    fontFamily: FONT_BODY,
    fontSize: 14,
    marginTop: 2,
  },
  saveBtnGradient: {
    borderRadius: RADIUS_MD,
    marginBottom: 32,
    marginHorizontal: 16,
    marginTop: 8,
  },
  saveBtnInner: {
    alignItems: 'center',
    padding: 16,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontFamily: FONT_LABEL,
    fontSize: 14,
    letterSpacing: 1,
  },
})
