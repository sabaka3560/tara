import React, { useRef, useCallback } from 'react'
import { StyleSheet, TouchableOpacity, Text, View, Alert } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { TARA_BG, TARA_MUTED } from '@/lib/constants'

export default function CameraScreen() {
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return
    try {
      
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 })
      if (!photo) return
      router.replace({
        pathname: '/(tabs)/wardrobe',
        params: { photoUri: photo.uri },
      })
    } catch {
      Alert.alert('Capture failed', 'Could not take photo. Please try again.')
    }
  }, [router])

  const handleBack = useCallback(() => router.back(), [router])

  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission()
    if (!result.granted) {
      Alert.alert('Camera permission required', 'Enable camera access in settings.')
    }
  }, [requestPermission])

  if (!permission) return <View style={styles.container} />

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is required.</Text>
        <TouchableOpacity onPress={handleRequestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView facing="back" ref={cameraRef} style={StyleSheet.absoluteFill} />

      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>

      <View style={styles.captureRow}>
        <TouchableOpacity onPress={handleCapture} style={styles.captureButton} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backButton: { left: 20, position: 'absolute', top: 56 },
  backText: { color: '#FFFFFF', fontSize: 28, fontWeight: '600' },
  captureButton: { backgroundColor: '#FFFFFF', borderRadius: 32, height: 64, width: 64 },
  captureRow: { alignItems: 'center', bottom: 48, left: 0, position: 'absolute', right: 0 },
  container: { backgroundColor: TARA_BG, flex: 1 },
  permissionButton: {
    backgroundColor: TARA_MUTED,
    borderRadius: 8,
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  permissionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  permissionContainer: {
    alignItems: 'center',
    backgroundColor: TARA_BG,
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  permissionText: { color: '#FFFFFF', fontSize: 16, textAlign: 'center' },
})
