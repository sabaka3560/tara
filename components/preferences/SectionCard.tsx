import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { TARA_TEXT, TARA_BORDER_DARK, RADIUS_LG, FONT_BODY_SEMI } from '@/lib/constants'

interface SectionCardProps {
  title: string
  children: React.ReactNode
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <BlurView intensity={30} tint="light" style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </BlurView>
  )
}

const styles = StyleSheet.create({
  container: {
    borderColor: TARA_BORDER_DARK,
    borderRadius: RADIUS_LG,
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  title: {
    color: TARA_TEXT,
    fontFamily: FONT_BODY_SEMI,
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
