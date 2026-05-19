export const formatINR = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN')}`

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timer !== null) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

export const clamp = (val: number, min: number, max: number): number =>
  Math.min(Math.max(val, min), max)

export const plural = (count: number, word: string): string =>
  `${count} ${word}${count !== 1 ? 's' : ''}`
