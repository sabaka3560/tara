import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { TARA_MUTED, TARA_PINK, TARA_INDIGO, FONT_BODY_SEMI, FONT_BODY } from '@/lib/constants'

interface EmptyStateAction {
  label: string
  onPress: () => void
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  action?: EmptyStateAction
}

// lucide-react-native v0.439 omits `color` from types but accepts it at runtime
type AnyIcon = React.ComponentType<{ color: string; size: number }>

export function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  const AnyIcon = Icon as AnyIcon
  return (
    <View style={styles.container}>
      <AnyIcon color={TARA_MUTED} size={48} />
      <Text style={styles.title}>{title}</Text>
      {subtitle !== undefined && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
      {action !== undefined && (
        <TouchableOpacity onPress={action.onPress} style={styles.button}>
          <Text style={styles.buttonText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: TARA_PINK,
    borderRadius: 8,
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  subtitle: {
    color: TARA_MUTED,
    fontFamily: FONT_BODY,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    color: TARA_INDIGO,
    fontFamily: FONT_BODY_SEMI,
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
})
