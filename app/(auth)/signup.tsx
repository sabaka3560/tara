import React, { useState, useCallback } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import {
  Input,
  InputField,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
} from '@gluestack-ui/themed'
import { SafeScreen } from '@/components/ui/SafeScreen'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { TARA_PINK, TARA_SURFACE, TARA_MUTED } from '@/lib/constants'

export default function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { signUp, loading } = useSupabaseAuth()

  const handleSignUp = useCallback(async () => {
    setError(null)
    try {
      await signUp(email, password, name)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed'
      setError(message)
    }
  }, [email, name, password, signUp])

  return (
    <SafeScreen>
      <View style={styles.container}>
        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.subheading}>Start building your wardrobe</Text>

        <FormControl style={styles.formControl}>
          <FormControlLabel>
            <FormControlLabelText style={styles.label}>Name</FormControlLabelText>
          </FormControlLabel>
          <Input style={styles.input}>
            <InputField
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={TARA_MUTED}
              value={name}
            />
          </Input>
        </FormControl>

        <FormControl style={styles.formControl}>
          <FormControlLabel>
            <FormControlLabelText style={styles.label}>Email</FormControlLabelText>
          </FormControlLabel>
          <Input style={styles.input}>
            <InputField
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={TARA_MUTED}
              value={email}
            />
          </Input>
        </FormControl>

        <FormControl style={styles.formControl}>
          <FormControlLabel>
            <FormControlLabelText style={styles.label}>Password</FormControlLabelText>
          </FormControlLabel>
          <Input style={styles.input}>
            <InputField
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={TARA_MUTED}
              secureTextEntry
              value={password}
            />
          </Input>
        </FormControl>

        {error !== null && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          disabled={loading}
          onPress={handleSignUp}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating account…' : 'Create Account'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeScreen>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: TARA_PINK,
    borderRadius: 12,
    marginTop: 24,
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  error: {
    color: '#FF4444',
    fontSize: 13,
    marginTop: 8,
  },
  formControl: {
    marginTop: 16,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: TARA_SURFACE,
    borderRadius: 8,
    marginTop: 6,
  },
  label: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  subheading: {
    color: TARA_MUTED,
    fontSize: 15,
    marginTop: 6,
  },
})
