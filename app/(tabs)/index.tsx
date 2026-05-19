import React, { useEffect } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue, withRepeat, withTiming, withSpring, withDelay,
  useAnimatedStyle, Easing,
} from 'react-native-reanimated'
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg'
import { useRouter } from 'expo-router'
import { Camera, Grid2X2, ShoppingBag, Sliders, Sparkles } from 'lucide-react-native'
import { SafeScreen } from '@/components/ui/SafeScreen'
import { useWardrobe } from '@/hooks/useWardrobe'
import { usePreferences } from '@/hooks/usePreferences'
import {
  TARA_BG, TARA_PINK, TARA_PINK_LIGHT, TARA_LAVENDER, TARA_LAVENDER_LIGHT,
  TARA_INDIGO, TARA_TEXT_2, TARA_MUTED,
  TARA_BORDER,
  FONT_BODY, FONT_BODY_SEMI, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_LABEL,
  GRADIENT_PINK_LAVENDER,
  RADIUS_SM, RADIUS_MD, RADIUS_LG, RADIUS_FULL,
} from '@/lib/constants'

const { width } = Dimensions.get('window')

type AnyIcon = React.ComponentType<{ color: string; size: number; strokeWidth?: number }>
const CameraI  = Camera as AnyIcon
const GridI    = Grid2X2 as AnyIcon
const BagI     = ShoppingBag as AnyIcon
const SlidersI = Sliders as AnyIcon
const SparklesI = Sparkles as AnyIcon

// ─── Tara Orb ────────────────────────────────────────────────────────────────

const ORB_SIZE = 160
const GLOW_SIZE = ORB_SIZE + 48

function TaraOrb({ onPress }: { onPress: () => void }) {
  const pulse   = useSharedValue(1)
  const glowOp  = useSharedValue(0.35)
  const rotate  = useSharedValue(0)

  useEffect(() => {
    const ease = Easing.inOut(Easing.sine)
    pulse.value  = withRepeat(withTiming(1.055, { duration: 2800, easing: ease }), -1, true)
    glowOp.value = withRepeat(withTiming(0.75,  { duration: 2800, easing: ease }), -1, true)
    rotate.value = withRepeat(withTiming(360,   { duration: 9000, easing: Easing.linear }), -1, false)
  }, [pulse, glowOp, rotate])

  const orbStyle  = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }))
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOp.value }))

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.orbTouchable}>
      {/* Outer ambient glow */}
      <Animated.View style={[styles.orbGlow, glowStyle]} />

      {/* Second ring */}
      <Animated.View style={[styles.orbRing, glowStyle]} />

      {/* Sphere body */}
      <Animated.View style={orbStyle}>
        <Svg width={ORB_SIZE} height={ORB_SIZE}>
          <Defs>
            <RadialGradient id="tara" cx="38%" cy="30%" r="65%" fx="38%" fy="30%">
              <Stop offset="0%"   stopColor="#FFFFFF"  stopOpacity="0.95" />
              <Stop offset="25%"  stopColor="#FAD0E6"  stopOpacity="0.92" />
              <Stop offset="60%"  stopColor="#D9B5FF"  stopOpacity="0.88" />
              <Stop offset="88%"  stopColor="#9B8EC4"  stopOpacity="0.80" />
              <Stop offset="100%" stopColor="#6F5092"  stopOpacity="0.70" />
            </RadialGradient>
          </Defs>
          <Circle cx={ORB_SIZE / 2} cy={ORB_SIZE / 2} r={ORB_SIZE / 2 - 1} fill="url(#tara)" />
        </Svg>

        {/* Icon centered on orb */}
        <View style={styles.orbIcon}>
          <SparklesI color="rgba(18,18,59,0.65)" size={34} strokeWidth={1.4} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}

// ─── Background orbs ─────────────────────────────────────────────────────────

function PearlBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#FFFFFF', '#F0EDFF', '#F8F9FF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />
    </View>
  )
}

// ─── Quick actions ────────────────────────────────────────────────────────────

type ActionDef = { label: string; Icon: AnyIcon; route: string; color: string; bg: string }

function QuickActions({ router }: { router: ReturnType<typeof useRouter> }) {
  const actions: ActionDef[] = [
    { label: 'Capture',  Icon: CameraI,  route: '/camera',          color: TARA_PINK,    bg: TARA_PINK_LIGHT    },
    { label: 'Wardrobe', Icon: GridI,    route: '/(tabs)/wardrobe', color: TARA_LAVENDER, bg: TARA_LAVENDER_LIGHT },
    { label: 'Shop',     Icon: BagI,     route: '/(tabs)/shop',     color: TARA_PINK,    bg: TARA_PINK_LIGHT    },
    { label: 'Style',    Icon: SlidersI, route: '/preferences',     color: TARA_LAVENDER, bg: TARA_LAVENDER_LIGHT },
  ]
  return (
    <View style={styles.actionsRow}>
      {actions.map((a) => (
        <TouchableOpacity
          key={a.label}
          onPress={() => router.push(a.route as never)}
          style={styles.actionBtn}
          activeOpacity={0.75}
        >
          <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
            <a.Icon color={a.color} size={22} strokeWidth={1.8} />
          </View>
          <Text style={styles.actionLabel}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StudioScreen() {
  const router    = useRouter()
  const { items } = useWardrobe()
  const { prefs } = usePreferences()
  const itemCount = items?.length ?? 0
  const hasPrefs  = prefs.styles.length > 0

  // Stagger entrance animations
  const headerOp  = useSharedValue(0)
  const headerY   = useSharedValue(-12)
  const orbOp     = useSharedValue(0)
  const orbY      = useSharedValue(20)
  const statsOp   = useSharedValue(0)
  const statsY    = useSharedValue(16)
  const actionsOp = useSharedValue(0)
  const actionsY  = useSharedValue(16)
  const spotOp    = useSharedValue(0)
  const spotY     = useSharedValue(16)

  const headerStyle  = useAnimatedStyle(() => ({ opacity: headerOp.value,  transform: [{ translateY: headerY.value  }] }))
  const orbStyle     = useAnimatedStyle(() => ({ opacity: orbOp.value,     transform: [{ translateY: orbY.value     }] }))
  const statsStyle   = useAnimatedStyle(() => ({ opacity: statsOp.value,   transform: [{ translateY: statsY.value   }] }))
  const actionsStyle = useAnimatedStyle(() => ({ opacity: actionsOp.value, transform: [{ translateY: actionsY.value }] }))
  const spotStyle    = useAnimatedStyle(() => ({ opacity: spotOp.value,    transform: [{ translateY: spotY.value    }] }))

  useEffect(() => {
    const ease = Easing.out(Easing.cubic)
    const sp = { damping: 24, stiffness: 110 }
    const dur = { duration: 420, easing: ease }

    headerOp.value  = withTiming(1, dur)
    headerY.value   = withSpring(0, sp)
    orbOp.value     = withDelay(80,  withTiming(1, dur))
    orbY.value      = withDelay(80,  withSpring(0, sp))
    statsOp.value   = withDelay(220, withTiming(1, dur))
    statsY.value    = withDelay(220, withSpring(0, sp))
    actionsOp.value = withDelay(340, withTiming(1, dur))
    actionsY.value  = withDelay(340, withSpring(0, sp))
    spotOp.value    = withDelay(440, withTiming(1, dur))
    spotY.value     = withDelay(440, withSpring(0, sp))
  }, [headerOp, headerY, orbOp, orbY, statsOp, statsY, actionsOp, actionsY, spotOp, spotY])

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const orbSub = itemCount === 0
    ? 'Add your first piece'
    : !hasPrefs
    ? 'Set your style preferences'
    : `${itemCount} pieces · ready to style`

  return (
    <SafeScreen style={styles.screen}>
      <PearlBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View style={[styles.header, headerStyle]}>
          <View>
            <Text style={styles.brandMark}>tara</Text>
            <Text style={styles.greeting}>{greeting}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/preferences')} activeOpacity={0.8}>
            <View style={styles.prefBtn}>
              <SlidersI color={TARA_PINK} size={18} strokeWidth={1.8} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Tara Orb — the AI persona sphere */}
        <Animated.View style={[styles.orbSection, orbStyle]}>
          <TaraOrb onPress={() => router.push('/(tabs)/outfits')} />
          <Text style={styles.orbLabel}>your ai stylist</Text>
          <Text style={styles.orbSub}>{orbSub}</Text>
        </Animated.View>

        {/* Stats pills */}
        <Animated.View style={statsStyle}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: TARA_INDIGO }]}>{itemCount}</Text>
              <Text style={styles.statLabel}>PIECES</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: TARA_PINK }]}>0</Text>
              <Text style={styles.statLabel}>OUTFITS</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: TARA_LAVENDER }]}>—</Text>
              <Text style={styles.statLabel}>WEAR RATE</Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick actions */}
        <Animated.View style={actionsStyle}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <QuickActions router={router} />
        </Animated.View>

        {/* Style spotlight */}
        <Animated.View style={spotStyle}>
          <Text style={styles.sectionTitle}>STYLE SPOTLIGHT</Text>
          <TouchableOpacity
            onPress={() => router.push(
              (itemCount === 0 ? '/(tabs)/wardrobe'
               : !hasPrefs    ? '/preferences'
               :                '/(tabs)/outfits') as never
            )}
            activeOpacity={0.82}
          >
            <LinearGradient
              colors={[...GRADIENT_PINK_LAVENDER]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.spotCard}
            >
              <View style={styles.spotIconWrap}>
                <SparklesI color={TARA_INDIGO} size={22} strokeWidth={1.5} />
              </View>
              <View style={styles.spotText}>
                <Text style={styles.spotTitle}>
                  {itemCount === 0
                    ? 'Start your digital wardrobe'
                    : !hasPrefs
                    ? 'Set your style preferences'
                    : `${itemCount} pieces — ready to style`}
                </Text>
                <Text style={styles.spotSub}>
                  {itemCount === 0
                    ? 'Capture a piece — AI classifies it instantly'
                    : !hasPrefs
                    ? 'Tara needs your taste to personalise looks'
                    : 'Tap to compose your outfit look'}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeScreen>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: TARA_BG },
  scroll: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },

  bgOrb1: {
    position: 'absolute', top: -80, right: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(250,208,230,0.30)',
  },
  bgOrb2: {
    position: 'absolute', top: 320, left: -80,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(217,181,255,0.22)',
  },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  brandMark: { fontFamily: 'PlusJakartaSans_700Bold_Italic', fontSize: 22, color: TARA_PINK, letterSpacing: -0.5 },
  greeting:  { fontFamily: FONT_BODY_BOLD, fontSize: 26, color: TARA_INDIGO, marginTop: 2 },
  prefBtn: {
    width: 42, height: 42, borderRadius: RADIUS_FULL,
    backgroundColor: TARA_PINK_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },

  // Orb section
  orbSection: { alignItems: 'center', marginBottom: 32 },
  orbTouchable: { alignItems: 'center', justifyContent: 'center', width: GLOW_SIZE, height: GLOW_SIZE },
  orbGlow: {
    position: 'absolute',
    width: GLOW_SIZE, height: GLOW_SIZE, borderRadius: GLOW_SIZE / 2,
    backgroundColor: 'rgba(217,181,255,0.28)',
  },
  orbRing: {
    position: 'absolute',
    width: ORB_SIZE + 24, height: ORB_SIZE + 24, borderRadius: (ORB_SIZE + 24) / 2,
    borderWidth: 1,
    borderColor: 'rgba(111,80,146,0.20)',
    backgroundColor: 'transparent',
  },
  orbIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbLabel: {
    fontFamily: FONT_LABEL,
    fontSize: 10,
    letterSpacing: 2.5,
    color: TARA_LAVENDER,
    marginTop: 14,
    textTransform: 'uppercase',
  },
  orbSub: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    color: TARA_MUTED,
    marginTop: 4,
  },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderRadius: RADIUS_LG,
    borderWidth: 1,
    borderColor: TARA_BORDER,
    padding: 20,
    marginBottom: 28,
  },
  statItem:   { flex: 1, alignItems: 'center' },
  statValue:  { fontFamily: FONT_BODY_BOLD, fontSize: 26 },
  statLabel:  { fontFamily: FONT_LABEL, fontSize: 9, color: TARA_MUTED, marginTop: 4, letterSpacing: 1 },
  statDivider:{ width: 1, height: 32, backgroundColor: 'rgba(18,18,59,0.08)', marginHorizontal: 8 },

  // Section title
  sectionTitle: { fontFamily: FONT_LABEL, fontSize: 10, color: TARA_TEXT_2, letterSpacing: 1.5, marginBottom: 14 },

  // Quick actions
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  actionBtn:  { alignItems: 'center', width: (width - 72) / 4 },
  actionIcon: {
    width: 56, height: 56, borderRadius: RADIUS_MD,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  actionLabel: { fontFamily: FONT_BODY_MEDIUM, fontSize: 11, color: TARA_TEXT_2, textAlign: 'center' },

  // Spotlight card
  spotCard: {
    borderRadius: RADIUS_LG,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  spotIconWrap: {
    width: 48, height: 48, borderRadius: RADIUS_MD,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  spotText: { flex: 1 },
  spotTitle: { fontFamily: FONT_BODY_SEMI, fontSize: 15, color: TARA_INDIGO },
  spotSub:   { fontFamily: FONT_BODY, fontSize: 12, color: TARA_MUTED, marginTop: 4 },
})
