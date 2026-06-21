// Single source of truth for drop categories and their subcategories.

export const CATEGORIES = [
  'Bullion',
  'Coins',
  'Jewelry',
  'Luxury Brands',
  'Other Collectibles',
  'Sporting Goods',
  'Trading Cards',
  'Watches',
] as const

export type Category = (typeof CATEGORIES)[number]

// Categories that have subcategories. Categories not listed here have none.
export const SUBCATEGORIES: Record<string, string[]> = {
  'Coins': ['Certified Coins', 'Collectible Coins'],
  'Trading Cards': ['Sports Cards', 'Non-Sports Cards', 'TCG Cards'],
}

export function subcategoriesFor(category: string): string[] {
  return SUBCATEGORIES[category] ?? []
}

// Every subcategory across all categories (used for default filter state).
export const ALL_SUBCATEGORIES: string[] = Object.values(SUBCATEGORIES).flat()

export function isValidCategory(category: unknown): boolean {
  return typeof category === 'string' && (CATEGORIES as readonly string[]).includes(category)
}

// Returns the subcategory to store: the given one if valid for the category,
// the first subcategory as a default when the category requires one, or null.
export function normalizeSubcategory(category: string, subcategory: unknown): string | null {
  const subs = subcategoriesFor(category)
  if (subs.length === 0) return null
  if (typeof subcategory === 'string' && subs.includes(subcategory)) return subcategory
  return subs[0]
}
