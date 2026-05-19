import React, { useCallback } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { openInAppBrowser } from '@/lib/webBrowser'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { Heart } from 'lucide-react-native'
import type { Product } from '@/types/shop'
import {
  TARA_SURFACE_2,
  TARA_TEXT,
  TARA_TEXT_2,
  TARA_LAVENDER,
  TARA_LAVENDER_LIGHT,
  TARA_BORDER_DARK,
  TARA_PINK,
  TARA_MUTED,
  RADIUS_MD,
  RADIUS_SM,
  FONT_BODY,
  FONT_BODY_SEMI,
  FONT_LABEL,
} from '@/lib/constants'

type AnyIcon = React.ComponentType<{
  color: string; size: number; strokeWidth?: number; fill?: string
}>
const HeartI = Heart as AnyIcon

const PLATFORM_COLORS: Record<string, string> = {
  myntra: TARA_PINK,
  nykaa: TARA_LAVENDER,
  flipkart: '#4B8BF5',
  amazon: '#FF9900',
  meesho: '#9B5CF6',
}

interface ProductCardProps {
  product: Product
  width: number
  isLiked?: boolean
  onLike?: (product: Product) => void
}

export function ProductCard({ product, width, isLiked = false, onLike }: ProductCardProps) {
  const scale = useSharedValue(1)
  const heartScale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15 }, () => {
      scale.value = withSpring(1)
    })
    openInAppBrowser(product.affiliate_url)
  }, [scale, product.affiliate_url])

  const handleLike = useCallback(() => {
    heartScale.value = withSpring(1.4, { damping: 8 }, () => {
      heartScale.value = withSpring(1)
    })
    onLike?.(product)
  }, [heartScale, onLike, product])

  const discount =
    product.originalPrice != null
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null

  return (
    <Animated.View style={[{ width }, animStyle, styles.wrapper]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1} style={styles.card}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.image_url }}
            style={styles.image}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(13,13,20,0.85)']}
            style={styles.imageOverlay}
          />
          <View
            style={[
              styles.platformBadge,
              { backgroundColor: PLATFORM_COLORS[product.platform] ?? '#555' },
            ]}
          >
            <Text style={styles.platformText}>{product.platform}</Text>
          </View>
          {discount !== null && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% off</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
            {product.originalPrice != null && (
              <Text style={styles.originalPrice}>
                ₹{product.originalPrice.toLocaleString('en-IN')}
              </Text>
            )}
          </View>
          {product.rating != null && (
            <Text style={styles.rating}>★ {product.rating}</Text>
          )}
          <View style={styles.bottomRow}>
            {product.reason != null && (
              <Text style={styles.reason} numberOfLines={1}>{product.reason}</Text>
            )}
            {onLike && (
              <TouchableOpacity
                onPress={handleLike}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.heartBtn}
              >
                <HeartI
                  color={isLiked ? TARA_PINK : TARA_MUTED}
                  fill={isLiked ? TARA_PINK : 'transparent'}
                  size={16}
                  strokeWidth={1.5}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  card: {
    borderColor: TARA_BORDER_DARK,
    borderRadius: RADIUS_MD,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: TARA_SURFACE_2,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    height: 200,
    width: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  platformBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    borderRadius: RADIUS_SM,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  platformText: {
    color: '#FFFFFF',
    fontFamily: FONT_LABEL,
    fontSize: 8,
    letterSpacing: 0.5,
    textTransform: 'capitalize',
  },
  discountBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(18,18,59,0.75)',
    borderRadius: RADIUS_SM,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(111,80,146,0.4)',
  },
  discountText: {
    color: TARA_LAVENDER_LIGHT,
    fontFamily: FONT_BODY_SEMI,
    fontSize: 10,
  },
  info: {
    padding: 12,
  },
  title: {
    color: TARA_TEXT,
    fontFamily: FONT_BODY,
    fontSize: 12,
    lineHeight: 18,
  },
  priceRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  price: {
    color: TARA_TEXT,
    fontFamily: FONT_BODY_SEMI,
    fontSize: 14,
  },
  originalPrice: {
    color: TARA_TEXT_2,
    fontFamily: FONT_BODY,
    fontSize: 11,
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  rating: {
    color: TARA_LAVENDER,
    fontFamily: FONT_BODY,
    fontSize: 11,
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  reason: {
    color: TARA_MUTED,
    fontFamily: FONT_BODY,
    fontSize: 10,
    fontStyle: 'italic',
    flex: 1,
  },
  heartBtn: {
    marginLeft: 6,
  },
})
