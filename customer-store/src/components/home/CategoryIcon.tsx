import {
  Apple, Baby, Car, Dumbbell, Gem, Gift, Laptop, Leaf, Package, PawPrint, Pill, Shirt, ShoppingBasket, Smartphone, Sofa, Sparkles, ToyBrick, UtensilsCrossed, BookOpen, type LucideIcon,
} from 'lucide-react'

/** Picks an icon from the category name/slug (categories are admin-managed, so this is a best guess) */
const RULES: [RegExp, LucideIcon][] = [
  [/grocer|food|staple/i, ShoppingBasket],
  [/fruit|veg|fresh|organic/i, Apple],
  [/fashion|apparel|cloth|wear/i, Shirt],
  [/phone|mobile/i, Smartphone],
  [/electronic|computer|laptop|gadget/i, Laptop],
  [/home|furniture|decor|living/i, Sofa],
  [/kitchen|dining|cook/i, UtensilsCrossed],
  [/beauty|personal|care|cosmetic/i, Sparkles],
  [/health|pharma|medic|wellness/i, Pill],
  [/baby|kid/i, Baby],
  [/toy|game/i, ToyBrick],
  [/sport|fitness/i, Dumbbell],
  [/pet/i, PawPrint],
  [/jewel|accessor/i, Gem],
  [/book|station/i, BookOpen],
  [/auto|car|bike/i, Car],
  [/gift/i, Gift],
  [/garden|plant/i, Leaf],
]

export default function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = RULES.find(([re]) => re.test(name))?.[1] ?? Package
  return <Icon className={className} strokeWidth={2} />
}
