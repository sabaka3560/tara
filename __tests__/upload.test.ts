// Tests for upload flow — exercises the fetch+FormData contract the hook uses

const mockFetch = jest.fn()
;(globalThis as unknown as { fetch: typeof fetch }).fetch = mockFetch

// Simulate what useUpload does: compress → POST multipart → return item_id
async function uploadImage(
  imageUri: string,
  token: string,
  apiBase: string,
): Promise<string> {
  const formData = new FormData()
  formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'clothing.jpg' } as unknown as Blob)

  const resp = await fetch(`${apiBase}/wardrobe/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!resp.ok) throw new Error(`Upload failed with status ${resp.status}`)

  const data = (await resp.json()) as { item_id: string; status: string }
  return data.item_id
}

describe('upload flow', () => {
  const API = 'http://localhost:8000/api/v1'

  beforeEach(() => mockFetch.mockReset())

  it('returns item_id on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ item_id: 'abc-123', status: 'processing' }),
    })

    const id = await uploadImage('file:///photo.jpg', 'test-token', API)
    expect(id).toBe('abc-123')
  })

  it('throws on 401 unauthorized', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })

    await expect(uploadImage('file:///photo.jpg', 'bad-token', API)).rejects.toThrow(
      'Upload failed with status 401',
    )
  })

  it('throws on 500 server error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    await expect(uploadImage('file:///photo.jpg', 'token', API)).rejects.toThrow(
      'Upload failed with status 500',
    )
  })

  it('throws on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network request failed'))

    await expect(uploadImage('file:///photo.jpg', 'token', API)).rejects.toThrow(
      'Network request failed',
    )
  })

  it('sends Authorization header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ item_id: 'x', status: 'processing' }),
    })

    await uploadImage('file:///photo.jpg', 'my-jwt', API)

    const [, opts] = mockFetch.mock.calls[0]
    expect((opts as RequestInit).headers).toMatchObject({ Authorization: 'Bearer my-jwt' })
  })

  it('POSTs to the correct wardrobe upload endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ item_id: 'y', status: 'processing' }),
    })

    await uploadImage('file:///photo.jpg', 'token', API)

    expect(mockFetch).toHaveBeenCalledWith(
      `${API}/wardrobe/upload`,
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
