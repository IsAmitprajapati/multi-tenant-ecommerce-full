import { createElement } from 'react'
import {
  Apple, Archive, Baby, BookOpen, Brush, Cable, Car, Carrot, Coffee, CookingPot, Cookie, Croissant, Droplet, Dumbbell, Fish, Flower2, Footprints,
  Gem, Gift, Headphones, Lamp, Laptop, Leaf, Milk, Package, PawPrint, Pill, Scissors, Shirt, ShoppingBasket, Smartphone, Sofa, Sparkles,
  ToyBrick, Tv, UtensilsCrossed, Watch, Wheat, type LucideIcon,
} from 'lucide-react'

/**
 * Built-in icon picked from a category's name (used when no icon is uploaded in Platform admin).
 * Specific matches (sub-categories) come before broad ones, and the name is checked before the slug,
 * so "Fruits" (slug grocery-fruits) gets an apple, not the grocery basket.
 */
const RULES: [RegExp, LucideIcon][] = [
  [/fruit/i, Apple],
  [/veg/i, Carrot],
  [/dairy|egg|milk/i, Milk],
  [/bakery|bread/i, Croissant],
  [/staple|rice|atta|dal|grain/i, Wheat],
  [/beverage|drink|juice|coffee|tea/i, Coffee],
  [/snack|biscuit|cookie|chips/i, Cookie],
  [/meat|fish|sea ?food|chicken/i, Fish],
  [/foot ?wear|shoe|sneaker/i, Footprints],
  [/kid|baby|infant/i, Baby],
  [/men|women|cloth|apparel|fashion|wear|shirt/i, Shirt],
  [/mobile|phone|tablet/i, Smartphone],
  [/audio|headphone|speaker|earbud/i, Headphones],
  [/tv|television|appliance/i, Tv],
  [/laptop|computer|electronic|gadget/i, Laptop],
  [/cookware|dining|cook(?!ie)/i, CookingPot],
  [/decor|lamp|lighting/i, Lamp],
  [/furniture|sofa|living/i, Sofa],
  [/storage|organis|organiz/i, Archive],
  [/skin ?care|lotion|cream/i, Droplet],
  [/hair/i, Scissors],
  [/make ?up|cosmetic/i, Brush],
  [/fragrance|perfume|scent/i, Flower2],
  [/beauty|personal|care/i, Sparkles],
  [/health|pharma|medic|wellness/i, Pill],
  [/toy|game/i, ToyBrick],
  [/sport|fitness/i, Dumbbell],
  [/pet/i, PawPrint],
  [/jewel/i, Gem],
  [/watch/i, Watch],
  [/accessor|cable|charger/i, Cable],
  [/book|station/i, BookOpen],
  [/auto|car|bike/i, Car],
  [/gift/i, Gift],
  [/garden|plant/i, Leaf],
  [/grocer|food/i, ShoppingBasket],
  [/home/i, Sofa],
  [/restaurant|meal/i, UtensilsCrossed],
]

/** Same name under different parents (e.g. "Accessories"), told apart by slug */
const SLUG_RULES: [RegExp, LucideIcon][] = [
  [/fashion-accessor/i, Watch],
  [/electronics-accessor/i, Cable],
]

const pick = (rules: [RegExp, LucideIcon][], text: string) => rules.find(([re]) => re.test(text))?.[1]

export function iconFor(text: string): LucideIcon {
  // Callers pass "<name> <slug>": slug-specific rules, then the name on its own, then everything
  const nameOnly = text.split(' ').filter((w) => !w.includes('-')).join(' ')
  return pick(SLUG_RULES, text) ?? pick(RULES, nameOnly) ?? pick(RULES, text) ?? Package
}

export default function CategoryIcon({ name, className }: { name: string; className?: string }) {
  return createElement(iconFor(name), { className, strokeWidth: 2 })
}
