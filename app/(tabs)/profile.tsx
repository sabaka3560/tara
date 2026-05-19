import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeScreen } from '@/components/ui/SafeScreen'
import { TARA_MUTED } from '@/lib/constants'

export default function Profile() {
  return (
    <SafeScreen>
      <View style={styles.container}>
        <Text style={styles.label}>Profile</Text>
      </View>
    </SafeScreen>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    color: TARA_MUTED,
    fontSize: 16,
  },
})
