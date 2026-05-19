import React, { useEffect, useCallback } from 'react'
import { StyleSheet, TouchableOpacity, Text, Alert, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue,
  withSpring,
  withDelay,
  useAnimatedStyle,
} from 'react-native-reanimated'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { SafeScreen } from '@/components/ui/SafeScreen'
import { WardrobeGrid } from '@/components/wardrobe/WardrobeGrid'
import { useWardrobe } from '@/hooks/useWardrobe'
import { useUpload } from '@/hooks/useUpload'
import {
  TARA_BG, TARA_PINK, TARA_INDIGO, TARA_MUTED, TARA_BORDER_DARK,
  FONT_BODY_BOLD, FONT_BODY,
  GRADIENT_PINK_LAVENDER, RADIUS_FULL,
} from '@/lib/constants'

type AnyIcon = React.ComponentType<{ color: string; size: number; strokeWidth?: number }>
const PlusI = Plus as AnyIcon

function WardrobeHeader() {
  return (
    <View style={styles.header}>
      <LinearGradient
        colors={['rgba(250,208,230,0.18)', 'transparent']}
        style={styles.headerGrad}
      >
        <Text style={styles.headerTitle}>Wardrobe</Text>
        <Text style={styles.headerSub}>Your curated collection</Text>
      </LinearGradient>
    </View>
  )
}

export default function Wardrobe() {
  const scale = useSharedValue(0.9)
  const opacity = useSharedValue(0)
  const fabScale = useSharedValue(0)
  const { items, isLoading, refetch } = useWardrobe()
  const { upload, isUploading } = useUpload()
  const { photoUri } = useLocalSearchParams<{ photoUri?: string }>()

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 100 })
    opacity.value = withSpring(1, { damping: 20 })
    fabScale.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 120 }))
  }, [opacity, scale, fabScale])

  useEffect(() => {
    if (!photoUri) return
    upload(photoUri).catch((err: Error) => {
      Alert.alert('Upload failed', err.message)
    })
  }, [photoUri, upload])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }))

  const handleAddItem = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo access to upload items.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      quality: 1,
    })
    if (result.canceled || result.assets.length === 0) return
    upload(result.assets[0].uri).catch((err: Error) => {
      Alert.alert('Upload failed', err.message)
    })
  }, [upload])

  const handleRefresh = useCallback(() => { refetch() }, [refetch])

  return (
    <SafeScreen style={styles.screen}>
      <WardrobeHeader />
      <Animated.View style={[styles.content, animatedStyle]}>
        <WardrobeGrid isLoading={isLoading} items={items} onRefresh={handleRefresh} />
      </Animated.View>

      <Animated.View style={[styles.fabWrap, fabStyle]}>
        <TouchableOpacity
          disabled={isUploading}
          onPress={handleAddItem}
          style={[styles.fab, isUploading && styles.fabDisabled]}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[...GRADIENT_PINK_LAVENDER]} style={styles.fabGrad}>
            <PlusI color={TARA_INDIGO} size={24} strokeWidth={2} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeScreen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: TARA_BG },
  header: { borderBottomWidth: 1, borderBottomColor: TARA_BORDER_DARK },
  headerGrad: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  headerTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 28, color: TARA_INDIGO, letterSpacing: -0.3 },
  headerSub: { fontFamily: FONT_BODY, fontSize: 12, color: TARA_MUTED, marginTop: 3 },
  content: { flex: 1 },
  fabWrap: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fab: {
    borderRadius: RADIUS_FULL,
    elevation: 8,
    height: 56,
    shadowColor: TARA_PINK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    width: 56,
    overflow: 'hidden',
  },
  fabGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabDisabled: { opacity: 0.45 },
})
