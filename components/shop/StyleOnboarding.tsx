import React, { useState, useCallback } from 'react'
import {
  Dimensions, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Heart, X } from 'lucide-react-native'
import Animated, {
  useSharedValue, withSpring, useAnimatedStyle, withTiming, runOnJS,
} from 'react-native-reanimated'
import {
  TARA_BG, TARA_INDIGO, TARA_PINK, TARA_PINK_LIGHT,
  TARA_LAVENDER, TARA_LAVENDER_LIGHT, TARA_MUTED, TARA_TEXT_2,
  GRADIENT_INDIGO_PURPLE,
  RADIUS_LG, RADIUS_FULL,
  FONT_BODY_BOLD, FONT_BODY_SEMI, FONT_BODY, FONT_LABEL,
} from '@/lib/constants'
import type { StyleCategory } from '@/types/shop'

type AnyIcon = React.ComponentType<{ color: string; size: number; strokeWidth?: number }>
const HeartI = Heart as AnyIcon
const XI = X as AnyIcon

const { width, height } = Dimensions.get('window')
const CARD_W = width - 48

type StyleCard = {
  id: StyleCategory
  label: string
  sublabel: string
  image: string
}

const STYLE_CARDS: StyleCard[] = [
  {
    id: 'ethnic',
    label: 'Ethnic Chic',
    sublabel: 'Kurtas, sarees, salwars',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&fit=crop',
  },
  {
    id: 'western',
    label: 'Clean Western',
    sublabel: 'Dresses, co-ords, tops',
    image: 'https://images.unsplash.com/photo-1485231183945-fffde7c2cba5?w=600&fit=crop',
  },
  {
    id: 'ethnic',
    label: 'Festive Glam',
    sublabel: 'Lehengas, anarkalis',
    image: 'https://images.unsplash.com/photo-1617627143233-c02668df7b7c?w=600&fit=crop',
  },
  {
    id: 'indo-western',
    label: 'Indo-Western Fusion',
    sublabel: 'Sharara sets, fusion wear',
    image: 'https://images.unsplash.com/photo-1614886137568-e0a5a3c4b5a7?w=600&fit=crop',
  },
  {
    id: 'western',
    label: 'Boho Casual',
    sublabel: 'Printed maxis, breezy layers',
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&fit=crop',
  },
  {
    id: 'formal',
    label: 'Power Formal',
    sublabel: 'Blazers, structured pieces',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&fit=crop',
  },
]

interface StyleOnboardingProps {
  onComplete: (likedStyles: StyleCategory[]) => void
}

export function StyleOnboarding({ onComplete }: StyleOnboardingProps) {
  const [index, setIndex] = useState(0)
  const [liked, setLiked] = useState<StyleCategory[]>([])

  const cardOp = useSharedValue(1)
  const cardX = useSharedValue(0)
  const cardScale = useSharedValue(1)

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOp.value,
    transform: [{ translateX: cardX.value }, { scale: cardScale.value }],
  }))

  const advance = useCallback(
    (likedStyles: StyleCategory[]) => {
      const next = index + 1
      if (next >= STYLE_CARDS.length) {
        onComplete(likedStyles)
        return
      }
      cardOp.value = 1
      cardX.value = 0
      cardScale.value = 1
      setIndex(next)
    },
    [index, onComplete, cardOp, cardX, cardScale],
  )

  const handleLike = useCallback(() => {
    const card = STYLE_CARDS[index]
    const updated = liked.includes(card.id) ? liked : [...liked, card.id]
    setLiked(updated)
    cardX.value = withSpring(width + 100, { damping: 18, stiffness: 120 }, () => {
      cardX.value = -width - 100
      cardOp.value = 0
      runOnJS(advance)(updated)
    })
  }, [index, liked, cardX, cardOp, advance])

  const handleSkip = useCallback(() => {
    cardX.value = withSpring(-(width + 100), { damping: 18, stiffness: 120 }, () => {
      cardX.value = width + 100
      cardOp.value = 0
      runOnJS(advance)(liked)
    })
  }, [liked, cardX, cardOp, advance])

  const card = STYLE_CARDS[index]
  const progress = index / STYLE_CARDS.length

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>TASTE PROFILE</Text>
        <Text style={styles.title}>What's your style?</Text>
        <Text style={styles.sub}>Tap Love to personalise your feed</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: CARD_W * progress }]} />
      </View>
      <Text style={styles.progressLabel}>{index + 1} / {STYLE_CARDS.length}</Text>

      {/* Card */}
      <Animated.View style={[styles.cardWrap, cardStyle]}>
        <Image
          source={{ uri: card.image }}
          style={styles.cardImage}
          contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(18,18,59,0.88)']}
          style={styles.cardOverlay}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardLabel}>{card.label}</Text>
          <Text style={styles.cardSublabel}>{card.sublabel}</Text>
        </View>
      </Animated.View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.8}>
          <XI color={TARA_MUTED} size={26} strokeWidth={1.8} />
          <Text style={styles.skipLabel}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLike} activeOpacity={0.85}>
          <LinearGradient colors={[...GRADIENT_INDIGO_PURPLE]} style={styles.likeBtn}>
            <HeartI color="#FFFFFF" size={26} strokeWidth={1.8} />
            <Text style={styles.likeLabel}>Love it</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Skip all */}
      <TouchableOpacity onPress={() => onComplete(liked)} activeOpacity={0.7} style={styles.skipAll}>
        <Text style={styles.skipAllText}>Skip — show me everything</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TARA_BG,
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: { alignItems: 'center', marginBottom: 20 },
  eyebrow: {
    fontFamily: FONT_LABEL,
    fontSize: 10,
    color: TARA_LAVENDER,
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontFamily: FONT_BODY_BOLD,
    fontSize: 26,
    color: TARA_INDIGO,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  sub: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    color: TARA_MUTED,
  },
  progressTrack: {
    width: CARD_W,
    height: 3,
    backgroundColor: 'rgba(18,18,59,0.08)',
    borderRadius: RADIUS_FULL,
    marginBottom: 8,
  },
  progressFill: {
    height: 3,
    backgroundColor: TARA_PINK,
    borderRadius: RADIUS_FULL,
  },
  progressLabel: {
    fontFamily: FONT_BODY,
    fontSize: 11,
    color: TARA_MUTED,
    marginBottom: 20,
  },
  cardWrap: {
    width: CARD_W,
    height: height * 0.42,
    borderRadius: RADIUS_LG,
    overflow: 'hidden',
    marginBottom: 28,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  cardLabel: {
    fontFamily: FONT_BODY_BOLD,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cardSublabel: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  skipBtn: {
    width: 100,
    height: 54,
    borderRadius: RADIUS_FULL,
    backgroundColor: TARA_PINK_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  skipLabel: {
    fontFamily: FONT_BODY_SEMI,
    fontSize: 11,
    color: TARA_MUTED,
  },
  likeBtn: {
    width: 140,
    height: 54,
    borderRadius: RADIUS_FULL,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  likeLabel: {
    fontFamily: FONT_BODY_SEMI,
    fontSize: 14,
    color: '#FFFFFF',
  },
  skipAll: {
    paddingVertical: 10,
  },
  skipAllText: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    color: TARA_TEXT_2,
    textDecorationLine: 'underline',
  },
})
