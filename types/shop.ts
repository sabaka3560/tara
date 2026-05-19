export type Platform = 'myntra' | 'nykaa' | 'flipkart' | 'amazon' | 'meesho'

export type Product = {
  id: string
  title: string
  price: number
  originalPrice?: number
  image_url: string
  platform: Platform
  affiliate_url: string
  rating: number | null
  category: string
  reason?: string   // populated by recommendation engine
}

export type StyleCategory = 'ethnic' | 'western' | 'indo-western' | 'formal' | 'streetwear'
export type BodyType = 'hourglass' | 'pear' | 'apple' | 'rectangle' | 'inverted-triangle'
export type ColorSeason = 'spring' | 'summer' | 'autumn' | 'winter'
export type BudgetRange = 'budget' | 'mid' | 'premium'

export type StylePreferences = {
  bodyType: BodyType | null
  colorSeason: ColorSeason | null
  styles: StyleCategory[]
  budget: BudgetRange | null
  occasions: string[]
}
