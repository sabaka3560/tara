import { useState, useCallback } from 'react'
import * as ImageManipulator from 'expo-image-manipulator'
import { API_BASE_URL } from '@/lib/constants'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import type { UploadResponse } from '@/types/clothing'

export function useUpload() {
  const { session } = useSupabaseAuth()
  const [isUploading, setIsUploading] = useState(false)

  const upload = useCallback(
    async (imageUri: string): Promise<string> => {
      setIsUploading(true)
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 1024 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        )

        const formData = new FormData()
        formData.append('file', {
          uri: compressed.uri,
          type: 'image/jpeg',
          name: 'clothing.jpg',
        } as unknown as Blob)

        const resp = await fetch(`${API_BASE_URL}/wardrobe/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
          body: formData,
        })

        if (!resp.ok) {
          throw new Error(`Upload failed with status ${resp.status}`)
        }

        const data = (await resp.json()) as UploadResponse
        return data.item_id
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Upload failed. Please try again.'
        throw new Error(message)
      } finally {
        setIsUploading(false)
      }
    },
    [session],
  )

  return { upload, isUploading }
}
