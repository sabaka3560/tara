import React, { useCallback } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { BudgetRange } from '@/types/shop'
import {
  GRADIENT_INDIGO_PURPLE,
  TARA_BORDER_DARK,
  TARA_SURFACE_2,
  TARA_TEXT,
  TARA_TEXT_2,
  TARA_MUTED,
  RADIUS_MD,
  FONT_BODY_SEMI,
  FONT_BODY,
} from '@/lib/constants'

const BUDGET_OPTIONS: { key: BudgetRange; label: string; range: string }[] = [
  { key: 'budget', label: 'Budget', range: '₹500–2,000' },
  { key: 'mid', label: 'Mid', range: '₹2,000–6,000' },
  { key: 'premium', label: 'Premium', range: '₹6,000+' },
]

interface BudgetCardProps {
  selected: BudgetRange | null
  onSelect: (b: BudgetRange) => void
}

export function BudgetCard({ selected, onSelect }: BudgetCardProps) {
  return (
    <View style={styles.row}>
      {BUDGET_OPTIONS.map((opt) => (
        <BudgetOption
          key={opt.key}
          option={opt}
          active={selected === opt.key}
          onPress={onSelect}
        />
      ))}
    </View>
  )
}

interface BudgetOptionProps {
  option: { key: BudgetRange; label: string; range: string }
  active: boolean
  onPress: (b: BudgetRange) => void
}

function BudgetOption({ option, active, onPress }: BudgetOptionProps) {
  const handlePress = useCallback(() => onPress(option.key), [onPress, option.key])

  if (active) {
    return (
      <LinearGradient
        colors={[...GRADIENT_INDIGO_PURPLE]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardActive}
      >
        <TouchableOpacity onPress={handlePress} style={styles.cardInner}>
          <Text style={styles.cardLabelActive}>{option.label}</Text>
          <Text style={styles.cardRangeActive}>{option.range}</Text>
        </TouchableOpacity>
      </LinearGradient>
    )
  }

  return (
    <TouchableOpacity onPress={handlePress} style={styles.cardInactive}>
      <Text style={styles.cardLabel}>{option.label}</Text>
      <Text style={styles.cardRange}>{option.range}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cardActive: {
    borderRadius: RADIUS_MD,
    flex: 1,
    margin: 4,
  },
  cardInactive: {
    alignItems: 'center',
    backgroundColor: TARA_SURFACE_2,
    borderColor: TARA_BORDER_DARK,
    borderRadius: RADIUS_MD,
    borderWidth: 1,
    flex: 1,
    margin: 4,
    padding: 12,
  },
  cardInner: {
    alignItems: 'center',
    padding: 12,
  },
  cardLabel: {
    color: TARA_TEXT,
    fontFamily: FONT_BODY_SEMI,
    fontSize: 14,
  },
  cardLabelActive: {
    color: '#FFFFFF',
    fontFamily: FONT_BODY_SEMI,
    fontSize: 14,
  },
  cardRange: {
    color: TARA_MUTED,
    fontFamily: FONT_BODY,
    fontSize: 11,
    marginTop: 4,
  },
  cardRangeActive: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: FONT_BODY,
    fontSize: 11,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    marginTop: 8,
    width: '100%',
  },
})
