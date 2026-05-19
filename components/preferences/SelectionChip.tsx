import React, { useCallback } from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { GRADIENT_INDIGO_PURPLE, TARA_BORDER_DARK, TARA_MUTED, FONT_BODY_SEMI, FONT_BODY_MEDIUM } from '@/lib/constants'

interface SelectionChipProps {
  label: string
  active: boolean
  onPress: (label: string) => void
}

export function SelectionChip({ label, active, onPress }: SelectionChipProps) {
  const handlePress = useCallback(() => onPress(label), [onPress, label])

  if (active) {
    return (
      <LinearGradient
        colors={[...GRADIENT_INDIGO_PURPLE]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.activeWrapper}
      >
        <TouchableOpacity onPress={handlePress} style={styles.inner}>
          <Text style={styles.activeText}>{label}</Text>
        </TouchableOpacity>
      </LinearGradient>
    )
  }

  return (
    <TouchableOpacity onPress={handlePress} style={styles.inactiveWrapper}>
      <Text style={styles.inactiveText}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  activeText: {
    color: '#FFFFFF',
    fontFamily: FONT_BODY_SEMI,
    fontSize: 13,
  },
  activeWrapper: {
    borderRadius: 20,
    margin: 4,
  },
  inactive: {},
  inactiveText: {
    color: TARA_MUTED,
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 13,
  },
  inactiveWrapper: {
    borderColor: TARA_BORDER_DARK,
    borderRadius: 20,
    borderWidth: 1,
    margin: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
})
