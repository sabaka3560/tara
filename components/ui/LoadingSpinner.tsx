import React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { TARA_PINK, FONT_BODY_MEDIUM, TARA_TEXT_2 } from '@/lib/constants'

interface LoadingSpinnerProps {
  label?: string
}

export function LoadingSpinner({ label }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={TARA_PINK} size="large" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  label: {
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 14,
    color: TARA_TEXT_2,
    letterSpacing: 0.3,
  },
})
