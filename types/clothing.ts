export type GarmentType =
  | 'kurta'
  | 'saree'
  | 'lehenga'
  | 'salwar'
  | 'palazzo'
  | 'jeans'
  | 'dress'
  | 'top'
  | 'blazer'
  | 'jacket'
  | 'skirt'
  | 'dupatta'
  | 'other'

export type Occasion =
  | 'casual'
  | 'office'
  | 'festive'
  | 'wedding'
  | 'party'
  | 'daily'
  | 'sports'

export type Season = 'summer' | 'winter' | 'monsoon' | 'all-season'

export type StyleCategory =
  | 'ethnic'
  | 'western'
  | 'indo-western'
  | 'formal'
  | 'streetwear'

export type ClothingItem = {
  id: string
  user_id: string
  image_url: string
  blurhash: string
  status: 'processing' | 'ready' | 'error'
  type: GarmentType
  colors: string[]
  pattern: string
  fabric_guess: string
  occasion: Occasion[]
  season: Season[]
  style: StyleCategory
  fit: string
  wear_count: number
  last_worn: string | null
  created_at: string
}

export type UploadResponse = {
  item_id: string
  status: string
}
