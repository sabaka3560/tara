export type Quote = { text: string; author: string }

export const MORNING_QUOTES: Quote[] = [
  { text: "She remembered who she was and the game changed.", author: "Lalah Delia" },
  { text: "Dress like you're already famous.", author: "Tara" },
  { text: "Your vibe is your brand. Make it luxury.", author: "Tara" },
  { text: "Confidence is the best outfit. Own it.", author: "Tara" },
  { text: "She is both hellfire and holy water.", author: "Tara" },
  { text: "Not bossy. Just the boss.", author: "Tara" },
  { text: "Bloom where you are planted, darling.", author: "Tara" },
  { text: "I attract what I am. Today I am radiant.", author: "Tara" },
  { text: "A woman who knows what she brings to the table is not afraid to eat alone.", author: "Tara" },
  { text: "Manifest in style. Look good doing it.", author: "Tara" },
  { text: "Your wardrobe tells your story. Make it a bestseller.", author: "Tara" },
  { text: "She wears confidence like it's her favorite perfume.", author: "Tara" },
]

export function getTodayQuote(): Quote {
  const day = new Date().getDate()
  return MORNING_QUOTES[day % MORNING_QUOTES.length]
}
