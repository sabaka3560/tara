import React, { useCallback } from 'react'
import { StyleSheet } from 'react-native'
import { MasonryFlashList } from '@shopify/flash-list'
import { ShoppingBag } from 'lucide-react-native'
import { EmptyState } from '@/components/common/EmptyState'
import { ClothingCard } from '@/components/wardrobe/ClothingCard'
import type { ClothingItem } from '@/types/clothing'

interface WardrobeGridProps {
  items: ClothingItem[]
  isLoading: boolean
  onRefresh: () => void
}

export function WardrobeGrid({ items, isLoading, onRefresh }: WardrobeGridProps) {
  const renderItem = useCallback(
    ({ item }: { item: ClothingItem }) => <ClothingCard item={item} />,
    [],
  )

  const keyExtractor = useCallback((item: ClothingItem) => item.id, [])

  if (!isLoading && items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        subtitle="Tap + to add your first item"
        title="Your wardrobe is empty"
      />
    )
  }

  return (
    <MasonryFlashList
      contentContainerStyle={styles.content}
      data={items}
      estimatedItemSize={200}
      keyExtractor={keyExtractor}
      numColumns={2}
      onRefresh={onRefresh}
      refreshing={isLoading}
      renderItem={renderItem}
    />
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
})
