import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  ListRenderItem,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { openInAppBrowser } from '@/lib/webBrowser'
import { Sparkles, Wand2, Search, X } from 'lucide-react-native'
import { SafeScreen } from '@/components/ui/SafeScreen'
import { ProductCard } from '@/components/shop/ProductCard'
import { StyleOnboarding } from '@/components/shop/StyleOnboarding'
import { CATEGORIES } from '@/lib/mockShop'
import { useRecommendations } from '@/hooks/useRecommendations'
import { useShopSearch } from '@/hooks/useShopSearch'
import { usePreferences } from '@/hooks/usePreferences'
import { useWardrobe } from '@/hooks/useWardrobe'
import { computeWardrobeGap } from '@/lib/wardrobeGap'
import { buildGapSearchUrl } from '@/lib/shopUrls'
import { useQueryClient } from '@tanstack/react-query'
import { useProductInteraction } from '@/hooks/useProductInteraction'
import type { Product, StyleCategory } from '@/types/shop'
import {
  TARA_BG,
  TARA_TEXT,
  TARA_TEXT_2,
  TARA_PINK,
  TARA_PINK_LIGHT,
  TARA_LAVENDER,
  TARA_INDIGO,
  TARA_BORDER_DARK,
  TARA_MUTED,
  GRADIENT_INDIGO_PURPLE,
  RADIUS_MD,
  RADIUS_SM,
  FONT_BODY_BOLD,
  FONT_BODY,
  FONT_BODY_SEMI,
  FONT_BODY_MEDIUM,
  FONT_LABEL,
} from '@/lib/constants'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 48) / 2

type AnyIcon = React.ComponentType<{ color: string; size: number; strokeWidth?: number }>
const SparklesI = Sparkles as AnyIcon
const WandI = Wand2 as AnyIcon
const SearchI = Search as AnyIcon
const XI = X as AnyIcon

const SOURCE_LABEL: Record<string, string> = {
  wardrobe_match: 'Based on your wardrobe',
  preference_match: 'Based on your style',
  catalog_browse: 'Curated picks',
}

function ShopHeader({
  source,
  wardrobeItemsUsed,
}: {
  source: string
  wardrobeItemsUsed: number
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Shop</Text>
      <View style={styles.sourceRow}>
        <WandI color={TARA_LAVENDER} size={13} strokeWidth={1.5} />
        <Text style={styles.sourceLbl}>
          {SOURCE_LABEL[source] ?? 'Curated picks'}
          {wardrobeItemsUsed > 0 ? ` · ${wardrobeItemsUsed} items` : ''}
        </Text>
      </View>
    </View>
  )
}

interface CategoryChipProps {
  label: string
  active: boolean
  onPress: (label: string) => void
}

function CategoryChip({ label, active, onPress }: CategoryChipProps) {
  const handlePress = useCallback(() => onPress(label), [onPress, label])
  if (active) {
    return (
      <LinearGradient
        colors={[...GRADIENT_INDIGO_PURPLE]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.chipActive}
      >
        <TouchableOpacity onPress={handlePress}>
          <Text style={styles.chipActiveText}>{label}</Text>
        </TouchableOpacity>
      </LinearGradient>
    )
  }
  return (
    <TouchableOpacity onPress={handlePress} style={styles.chipInactive}>
      <Text style={styles.chipInactiveText}>{label}</Text>
    </TouchableOpacity>
  )
}

interface SearchBarProps {
  value: string
  onChange: (text: string) => void
  onClear: () => void
}

function SearchBar({ value, onChange, onClear }: SearchBarProps) {
  return (
    <View style={styles.searchWrap}>
      <SearchI color={TARA_MUTED} size={16} strokeWidth={1.5} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder="Search across Myntra, Nykaa, Flipkart…"
        placeholderTextColor={TARA_MUTED}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <XI color={TARA_MUTED} size={14} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  )
}

function GapAnalysisBanner({ label, sub }: { label: string; sub: string }) {
  const handleSearch = useCallback(() => {
    openInAppBrowser(buildGapSearchUrl(label, 'myntra'))
  }, [label])

  return (
    <View style={styles.bannerWrap}>
      <LinearGradient
        colors={['rgba(250,208,230,0.25)', 'rgba(217,181,255,0.15)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bannerGradient}
      >
        <View style={styles.bannerIconWrap}>
          <SparklesI color={TARA_LAVENDER} size={18} strokeWidth={1.5} />
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerLabel}>AI GAP ANALYSIS</Text>
          <Text style={styles.bannerText}>{label}</Text>
          <Text style={styles.bannerSub}>{sub}</Text>
        </View>
        <TouchableOpacity onPress={handleSearch} style={styles.bannerCta} activeOpacity={0.75}>
          <Text style={styles.bannerCtaText}>Search</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  )
}

export default function Shop() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const onboardingShownRef = useRef(false)
  const { prefs, savePrefs, isLoaded } = usePreferences()
  const queryClient = useQueryClient()
  const apiCategory = selectedCategory === 'All' ? null : selectedCategory.toLowerCase()
  const { data, isLoading } = useRecommendations(apiCategory)
  const { data: searchData, isLoading: isSearching, isFetching: isSearchFetching } = useShopSearch(searchQuery)
  const { items: wardrobeItems } = useWardrobe()
  const gap = useMemo(() => computeWardrobeGap(wardrobeItems), [wardrobeItems])
  const isSearchMode = searchQuery.trim().length >= 2
  const { mutate: interact } = useProductInteraction()
  const likedIds = useMemo<Set<string>>(
    () => new Set(data?.likedProductIds ?? []),
    [data],
  )

  const handleLike = useCallback(
    (product: Product) => interact({ product, interaction_type: 'like' }),
    [interact],
  )

  useEffect(() => {
    if (isLoaded && prefs.styles.length === 0 && !onboardingShownRef.current) {
      onboardingShownRef.current = true
      setShowOnboarding(true)
    }
  }, [isLoaded, prefs.styles.length])

  const handleOnboardingComplete = useCallback(
    async (likedStyles: StyleCategory[]) => {
      if (likedStyles.length > 0) {
        await savePrefs({ styles: likedStyles })
      }
      setShowOnboarding(false)
      queryClient.invalidateQueries({ queryKey: ['recommendations'] })
    },
    [savePrefs, queryClient],
  )

  const filtered = useMemo<Product[]>(() => {
    if (isSearchMode) return searchData?.products ?? []
    if (!data) return []
    if (selectedCategory === 'All') return data.items
    return data.items.filter(
      (p) => p.category.toLowerCase() === selectedCategory.toLowerCase(),
    )
  }, [data, selectedCategory, isSearchMode, searchData])

  const renderProduct = useCallback<ListRenderItem<Product>>(
    ({ item }) => (
      <ProductCard
        product={item}
        width={CARD_WIDTH}
        isLiked={likedIds.has(item.id)}
        onLike={handleLike}
      />
    ),
    [likedIds, handleLike],
  )

  const keyExtractor = useCallback((item: Product) => item.id, [])

  const ListHeader = useMemo(
    () => (
      <View>
        <ShopHeader
          source={data?.source ?? 'catalog_browse'}
          wardrobeItemsUsed={data?.wardrobeItemsUsed ?? 0}
        />
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
        {!isSearchMode && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                active={selectedCategory === cat}
                onPress={setSelectedCategory}
              />
            ))}
          </ScrollView>
        )}
        {!isSearchMode && gap && <GapAnalysisBanner label={gap.label} sub={gap.sub} />}
        <Text style={styles.sectionLabel}>
          {isSearchMode
            ? isSearchFetching
              ? 'Searching…'
              : `${searchData?.count ?? 0} results`
            : 'Recommended For You'}
        </Text>
      </View>
    ),
    [selectedCategory, data, searchQuery, isSearchMode, isSearchFetching, searchData, gap],
  )

  const ListEmpty = useMemo(
    () =>
      isLoading || isSearching ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={TARA_PINK} />
        </View>
      ) : null,
    [isLoading, isSearching],
  )

  if (showOnboarding) {
    return (
      <SafeScreen style={styles.screen}>
        <StyleOnboarding onComplete={handleOnboardingComplete} />
      </SafeScreen>
    )
  }

  return (
    <SafeScreen style={styles.screen}>
      <FlatList
        data={filtered}
        renderItem={renderProduct}
        keyExtractor={keyExtractor}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.columnWrapper}
      />
    </SafeScreen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: TARA_BG },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    color: TARA_INDIGO,
    fontFamily: FONT_BODY_BOLD,
    fontSize: 30,
    letterSpacing: -0.3,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  sourceLbl: {
    color: TARA_LAVENDER,
    fontFamily: FONT_BODY,
    fontSize: 12,
  },
  categoryRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  chipActive: {
    borderRadius: RADIUS_MD,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipActiveText: {
    color: '#FFFFFF',
    fontFamily: FONT_LABEL,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  chipInactive: {
    borderColor: TARA_BORDER_DARK,
    borderRadius: RADIUS_MD,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipInactiveText: {
    color: TARA_MUTED,
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 12,
  },
  bannerWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: RADIUS_MD,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(111,80,146,0.15)',
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  bannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS_SM,
    backgroundColor: TARA_PINK_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: { flex: 1 },
  bannerLabel: {
    color: TARA_LAVENDER,
    fontFamily: FONT_LABEL,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  bannerText: {
    color: TARA_INDIGO,
    fontFamily: FONT_BODY_SEMI,
    fontSize: 14,
    marginTop: 3,
  },
  bannerSub: {
    color: TARA_MUTED,
    fontFamily: FONT_BODY,
    fontSize: 12,
    marginTop: 2,
  },
  bannerCta: {
    backgroundColor: 'rgba(18,18,59,0.08)',
    borderRadius: RADIUS_SM,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  bannerCtaText: {
    color: TARA_INDIGO,
    fontFamily: FONT_BODY_SEMI,
    fontSize: 12,
  },
  columnWrapper: {
    paddingHorizontal: 10,
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionLabel: {
    color: TARA_TEXT_2,
    fontFamily: FONT_LABEL,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 20,
    paddingHorizontal: 16,
  },
  loadingWrap: {
    paddingTop: 48,
    alignItems: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS_MD,
    borderWidth: 1,
    borderColor: TARA_BORDER_DARK,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: TARA_TEXT,
    fontFamily: FONT_BODY,
    fontSize: 13,
    padding: 0,
  },
})
