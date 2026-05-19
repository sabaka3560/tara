import React, { useState, useCallback } from 'react'
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Sparkles } from 'lucide-react-native'
import { SafeScreen } from '@/components/ui/SafeScreen'
import { useWardrobe } from '@/hooks/useWardrobe'
import { useOutfitSuggestion } from '@/hooks/useOutfitSuggestion'
import type { SuggestedOutfit } from '@/hooks/useOutfitSuggestion'
import { COLOR_HEX } from '@/lib/colorMatch'
import type { Occasion } from '@/types/clothing'
import {
  TARA_BG, TARA_INDIGO, TARA_MUTED, TARA_PINK, TARA_PINK_LIGHT,
  TARA_LAVENDER, TARA_LAVENDER_LIGHT, TARA_BORDER_DARK, TARA_TEXT_2,
  GRADIENT_INDIGO_PURPLE, GRADIENT_PINK_LAVENDER,
  FONT_BODY, FONT_BODY_BOLD, FONT_BODY_SEMI, FONT_BODY_MEDIUM, FONT_LABEL,
  RADIUS_MD, RADIUS_LG, RADIUS_FULL,
} from '@/lib/constants'

type AnyIcon = React.ComponentType<{ color: string; size: number; strokeWidth?: number }>
const SparklesI = Sparkles as AnyIcon

const { width } = Dimensions.get('window')
const THUMB = (width - 64) / 3

const OCCASIONS: { key: Occasion; label: string; emoji: string }[] = [
  { key: 'casual', label: 'Casual', emoji: '☀️' },
  { key: 'office', label: 'Office', emoji: '💼' },
  { key: 'festive', label: 'Festive', emoji: '✨' },
  { key: 'wedding', label: 'Wedding', emoji: '🌸' },
  { key: 'party', label: 'Party', emoji: '🎉' },
]

function OccasionChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  if (active) {
    return (
      <LinearGradient
        colors={[...GRADIENT_INDIGO_PURPLE]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.chipActive}
      >
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.chipActiveText}>{label}</Text>
        </TouchableOpacity>
      </LinearGradient>
    )
  }
  return (
    <TouchableOpacity onPress={onPress} style={styles.chipInactive}>
      <Text style={styles.chipInactiveText}>{label}</Text>
    </TouchableOpacity>
  )
}

function ColorDot({ color }: { color: string }) {
  const hex = COLOR_HEX[color.toLowerCase()] ?? '#CCCCCC'
  const isLight = color === 'white' || color === 'ivory' || color === 'cream'
  return (
    <View
      style={[
        styles.colorDot,
        { backgroundColor: hex },
        isLight && styles.colorDotBorder,
      ]}
    />
  )
}

function ColorCompatBadge({ label, labelColor }: { label: string; labelColor: string }) {
  return (
    <View style={styles.compatBadge}>
      <View style={[styles.compatDot, { backgroundColor: labelColor }]} />
      <Text style={[styles.compatText, { color: labelColor }]}>{label}</Text>
    </View>
  )
}

function OutfitCard({ outfit }: { outfit: SuggestedOutfit }) {
  return (
    <View style={styles.outfitCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
        {outfit.items.map((item) => (
          <Image
            key={item.id}
            source={{ uri: item.image_url }}
            contentFit="cover"
            style={styles.thumb}
          />
        ))}
      </ScrollView>
      <View style={styles.outfitMeta}>
        {/* Item types */}
        <Text style={styles.outfitItems}>
          {outfit.items.map((i) => i.type).join(' · ')}
        </Text>

        {/* Color palette dots */}
        <View style={styles.paletteRow}>
          {(outfit.palette ?? []).map((color) => (
            <ColorDot key={color} color={color} />
          ))}
          {outfit.colorLabel ? (
            <ColorCompatBadge label={outfit.colorLabel} labelColor={outfit.colorLabelColor ?? '#9E9E9E'} />
          ) : null}
        </View>

        <Text style={styles.outfitReason}>{outfit.reason}</Text>
      </View>
    </View>
  )
}

export default function OutfitsScreen() {
  const { items } = useWardrobe()
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion>('casual')
  const { outfits, isGenerating, generate, setIsGenerating } = useOutfitSuggestion(items)

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    await generate(selectedOccasion)
    setIsGenerating(false)
  }, [generate, selectedOccasion, setIsGenerating])

  const hasWardrobe = items.length > 0

  return (
    <SafeScreen style={styles.screen}>
      <View style={styles.header}>
        <LinearGradient
          colors={['rgba(250,208,230,0.18)', 'transparent']}
          style={styles.headerGrad}
        >
          <Text style={styles.headerTitle}>Style Me</Text>
          <Text style={styles.headerSub}>AI outfit suggestions from your wardrobe</Text>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Occasion picker */}
        <Text style={styles.sectionLabel}>OCCASION</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {OCCASIONS.map((occ) => (
            <OccasionChip
              key={occ.key}
              label={occ.label}
              active={selectedOccasion === occ.key}
              onPress={() => setSelectedOccasion(occ.key)}
            />
          ))}
        </ScrollView>

        {/* Generate CTA */}
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={isGenerating || !hasWardrobe}
          activeOpacity={0.85}
          style={[styles.ctaWrap, (!hasWardrobe || isGenerating) && styles.ctaDisabled]}
        >
          <LinearGradient
            colors={[...GRADIENT_INDIGO_PURPLE]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            {isGenerating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <SparklesI color="#FFFFFF" size={18} strokeWidth={1.5} />
                <Text style={styles.ctaText}>Generate Look</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {!hasWardrobe && (
          <Text style={styles.emptyHint}>
            Add items to your wardrobe first — then Tara will compose your look.
          </Text>
        )}

        {/* Outfit results */}
        {outfits.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>SUGGESTED OUTFITS</Text>
            {outfits.map((outfit, idx) => (
              <OutfitCard key={`${outfit.occasion}-${idx}`} outfit={outfit} />
            ))}
          </>
        )}

        {outfits.length === 0 && !isGenerating && hasWardrobe && (
          <View style={styles.idleState}>
            <LinearGradient
              colors={['rgba(250,208,230,0.25)', 'rgba(217,181,255,0.15)']}
              style={styles.idleBadge}
            >
              <SparklesI color={TARA_LAVENDER} size={36} strokeWidth={1.5} />
            </LinearGradient>
            <Text style={styles.idleTitle}>Ready when you are</Text>
            <Text style={styles.idleSub}>
              Pick an occasion above and tap Generate Look
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeScreen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: TARA_BG },
  header: { borderBottomWidth: 1, borderBottomColor: TARA_BORDER_DARK },
  headerGrad: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  headerTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 28, color: TARA_INDIGO, letterSpacing: -0.3 },
  headerSub: { fontFamily: FONT_BODY, fontSize: 12, color: TARA_MUTED, marginTop: 3 },
  scroll: { padding: 20, paddingBottom: 100 },
  sectionLabel: {
    fontFamily: FONT_LABEL,
    fontSize: 11,
    color: TARA_TEXT_2,
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 8,
  },
  chipRow: { gap: 8, paddingBottom: 4 },
  chipActive: {
    borderRadius: RADIUS_MD,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipActiveText: { color: '#FFFFFF', fontFamily: FONT_LABEL, fontSize: 11, letterSpacing: 0.5 },
  chipInactive: {
    borderColor: TARA_BORDER_DARK,
    borderRadius: RADIUS_MD,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipInactiveText: { color: TARA_MUTED, fontFamily: FONT_BODY_MEDIUM, fontSize: 12 },
  ctaWrap: { marginTop: 20, marginBottom: 8, borderRadius: RADIUS_LG, overflow: 'hidden' },
  ctaDisabled: { opacity: 0.45 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  ctaText: { fontFamily: FONT_BODY_SEMI, fontSize: 16, color: '#FFFFFF' },
  emptyHint: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    color: TARA_MUTED,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  outfitCard: {
    borderRadius: RADIUS_LG,
    borderWidth: 1,
    borderColor: TARA_BORDER_DARK,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  thumbRow: { flexDirection: 'row' },
  thumb: {
    width: THUMB,
    height: THUMB * 1.3,
    marginRight: 2,
  },
  outfitMeta: { padding: 14 },
  outfitItems: {
    fontFamily: FONT_BODY_SEMI,
    fontSize: 13,
    color: TARA_INDIGO,
    textTransform: 'capitalize',
  },
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  colorDotBorder: {
    borderWidth: 1,
    borderColor: 'rgba(18,18,59,0.15)',
  },
  compatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 4,
    backgroundColor: 'rgba(18,18,59,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compatText: {
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 11,
  },
  outfitReason: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    color: TARA_MUTED,
    marginTop: 8,
    lineHeight: 18,
  },
  idleState: { alignItems: 'center', paddingTop: 40 },
  idleBadge: {
    width: 80,
    height: 80,
    borderRadius: RADIUS_FULL,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  idleTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 20, color: TARA_INDIGO, marginBottom: 8 },
  idleSub: { fontFamily: FONT_BODY, fontSize: 13, color: TARA_MUTED, textAlign: 'center', lineHeight: 20 },
})
