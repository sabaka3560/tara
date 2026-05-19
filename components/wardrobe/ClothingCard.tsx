import React, { useCallback } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { ClothingItem } from '@/types/clothing'

type AnyIcon = React.ComponentType<{ color: string; size: number; strokeWidth?: number }>
const XI = X as AnyIcon

// Neutral blurhash used when item.blurhash is empty — avoids blank placeholder
const PLACEHOLDER_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'

interface ClothingCardProps {
  item: ClothingItem
  onRetry?: (id: string) => void
}

export function ClothingCard({ item, onRetry }: ClothingCardProps) {
  const router = useRouter()

  const handlePress = useCallback(() => {
    // Item detail screen not yet built; mock items have no real route
    if (item.id.startsWith('mock-')) return
    router.push(`/item/${item.id}` as never)
  }, [router, item.id])

  const handleRetry = useCallback(() => {
    onRetry?.(item.id)
  }, [onRetry, item.id])

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={styles.card}
    >
      <Image
        contentFit="cover"
        placeholder={item.blurhash || PLACEHOLDER_BLURHASH}
        source={{ uri: item.image_url }}
        style={styles.image}
      />

      {item.status === 'ready' && item.type && (
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{item.type}</Text>
        </View>
      )}

      {item.status === 'processing' && (
        <View style={styles.overlay}>
          <LoadingSpinner />
        </View>
      )}

      {item.status === 'error' && (
        <TouchableOpacity
          onPress={handleRetry}
          style={[styles.overlay, styles.errorOverlay]}
        >
          <XI color="#FFFFFF" size={28} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    margin: 4,
    overflow: 'hidden',
  },
  errorOverlay: {
    backgroundColor: 'rgba(215, 114, 124, 0.55)',
  },
  image: {
    aspectRatio: 0.75,
    width: '100%',
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  typeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(18,18,59,0.62)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.3,
  },
})
