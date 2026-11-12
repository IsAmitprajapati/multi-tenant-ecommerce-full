/**
 * Demo catalog for ONE real seller account, so the seller admin can be built and tested with real-looking data.
 *
 *   npm run db:seed:seller-demo -- --email=owner@example.com            add (safe to re-run: skips products that exist)
 *   npm run db:seed:seller-demo -- --email=owner@example.com --remove   delete everything this script added (incl. ImageKit files)
 *
 * Adds electronics products (with photos, variants, mixed stock/status), private-label brands and demo reviews.
 * Products are recognised by their slug (see PRODUCTS below), so the seller's own products are never touched.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import dotenv from 'dotenv'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config()
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'demo', 'images')
const ROOT = (process.env.IMAGEKIT_ROOT_FOLDER ?? 'marketplace').replace(/^\/+|\/+$/g, '')
const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY ?? ''
const AUTH = `Basic ${Buffer.from(`${PRIVATE_KEY}:`).toString('base64')}`

const slugify = (v: string) => v.toLowerCase().replace(/&/g, 'and').replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const BRANDS = ['Amit Electronics', 'VoltPro', 'Nova Audio']

interface Variant { name: string; price: number; mrp?: number; qty: number }
interface DemoProduct {
  title: string
  category: string
  hsn: string
  image: string
  brand: number
  price: number
  mrp?: number
  qty?: number
  variants?: Variant[]
  status?: 'ACTIVE' | 'INACTIVE'
  scope?: 'SELLER_PINCODE_ONLY' | 'SPECIFIC_PINCODES' | 'PAN_INDIA'
  weightKg?: number
  package?: 'STANDARD_BAG' | 'BOX' | 'ENVELOPE' | 'FRAGILE' | 'CUSTOM'
  /** Ratings left by demo reviewers (one per reviewer) */
  ratings?: number[]
  description: string
}

/** Specifications (values from Global catalog › Attributes) — filled in on products that don't have any yet */
const SPECS: Record<string, Record<string, string>> = {
  'Nova 5G smartphone': { Connectivity: '5G', Warranty: '1 year', Colour: 'Black' },
  'Nova Lite 4G phone': { RAM: '4GB', Storage: '64GB', Warranty: '1 year', Colour: 'Blue' },
  'Nova Tab 10.5-inch tablet': { RAM: '6GB', Connectivity: 'Wi-Fi', Warranty: '1 year', Colour: 'Grey' },
  'Rugged phone case': { 'Pack size': 'Pack of 1', Warranty: '6 months' },
  'VoltPro 14 thin laptop': { Connectivity: 'USB-C', Warranty: '1 year', Colour: 'Silver' },
  'VoltPro mechanical keyboard': { Connectivity: 'USB-C', Warranty: '1 year', Colour: 'Black' },
  'Silent wireless mouse': { Connectivity: 'Bluetooth', Warranty: '1 year', Colour: 'Grey' },
  'USB-C 7-in-1 hub': { Connectivity: 'USB-C', Warranty: '1 year', Colour: 'Silver' },
  'Laptop cooling pad': { Connectivity: 'Wired', Warranty: '6 months', Colour: 'Black' },
  'Nova Buds Pro ANC earbuds': { Connectivity: 'Bluetooth', Warranty: '1 year', Colour: 'White' },
  'Nova over-ear headphones': { Connectivity: 'Bluetooth', Warranty: '1 year', Colour: 'Black' },
  'Nova Boom portable speaker': { Connectivity: 'Bluetooth', Warranty: '1 year', Colour: 'Blue' },
  'Nova soundbar 2.1': { Connectivity: 'Bluetooth', Warranty: '2 years', Colour: 'Black' },
  'VoltPro 43-inch 4K smart TV': { 'Screen size': '43"', Connectivity: 'Wi-Fi', Warranty: '2 years' },
  'VoltPro 32-inch HD TV': { 'Screen size': '32"', Connectivity: 'Wi-Fi', Warranty: '1 year' },
  'Streaming stick 4K': { Connectivity: 'Wi-Fi', Warranty: '1 year', Colour: 'Black' },
  'Nova Fit smartwatch': { Connectivity: 'Bluetooth', Warranty: '1 year', Colour: 'Black' },
  '65W GaN fast charger': { Connectivity: 'USB-C', Warranty: '1 year', Colour: 'White' },
  'Compact mirrorless camera': { Connectivity: 'Wi-Fi', Warranty: '2 years', Colour: 'Black' },
  '10000mAh power bank': { Connectivity: 'USB-C', Warranty: '6 months', Colour: 'Black' },
}
const specsFor = (title: string) => Object.entries(SPECS[title] ?? {}).map(([name, value]) => ({ name, value }))

const PRODUCTS: DemoProduct[] = [
  // Mobiles & tablets
  { title: 'Nova 5G smartphone', category: 'electronics-mobiles-and-tablets', hsn: '8517', image: 'demo-circuithub-01.jpg', brand: 0, price: 15999, mrp: 18999, package: 'BOX', weightKg: 0.4,
    variants: [{ name: '6GB · 128GB', price: 15999, mrp: 18999, qty: 24 }, { name: '8GB · 256GB', price: 18999, mrp: 21999, qty: 12 }, { name: '12GB · 256GB', price: 21499, mrp: 24999, qty: 3 }],
    ratings: [5, 4, 5, 4, 4, 5, 3], description: '6.6-inch 120Hz display, 50MP camera and a 5000mAh battery with 33W fast charging.' },
  { title: 'Nova Lite 4G phone', category: 'electronics-mobiles-and-tablets', hsn: '8517', image: 'demo-circuithub-01.jpg', brand: 0, price: 8999, mrp: 10999, qty: 40, package: 'BOX', weightKg: 0.35,
    ratings: [4, 4, 3], description: 'Everyday 4G phone with a big battery, dual SIM and expandable storage.' },
  { title: 'Nova Tab 10.5-inch tablet', category: 'electronics-mobiles-and-tablets', hsn: '8471', image: 'demo-circuithub-02.jpg', brand: 0, price: 17999, mrp: 21999, package: 'BOX', weightKg: 0.6,
    variants: [{ name: 'Wi-Fi · 64GB', price: 17999, mrp: 21999, qty: 15 }, { name: 'LTE · 128GB', price: 22999, mrp: 25999, qty: 0 }],
    ratings: [5, 5, 4], description: '10.5-inch 2K screen, quad speakers and a stylus-ready display for notes and sketches.' },
  { title: 'Rugged phone case', category: 'electronics-mobiles-and-tablets', hsn: '9999', image: 'demo-circuithub-10.jpg', brand: 1, price: 399, mrp: 699, package: 'ENVELOPE', weightKg: 0.08,
    variants: [{ name: 'Black', price: 399, mrp: 699, qty: 80 }, { name: 'Navy', price: 399, mrp: 699, qty: 45 }, { name: 'Olive', price: 449, mrp: 699, qty: 4 }],
    ratings: [4, 3, 5, 4], description: 'Military-grade drop protection with raised edges for the screen and camera.' },

  // Laptops & computers
  { title: 'VoltPro 14 thin laptop', category: 'electronics-laptops-and-computers', hsn: '8471', image: 'demo-circuithub-02.jpg', brand: 1, price: 52999, mrp: 61999, package: 'FRAGILE', weightKg: 1.4,
    variants: [{ name: 'i5 · 16GB · 512GB', price: 52999, mrp: 61999, qty: 9 }, { name: 'i7 · 16GB · 1TB', price: 68999, mrp: 77999, qty: 4 }],
    ratings: [5, 4, 4, 5, 5], description: '14-inch FHD IPS, backlit keyboard, fingerprint login and all-day battery.' },
  { title: 'VoltPro mechanical keyboard', category: 'electronics-laptops-and-computers', hsn: '8471', image: 'demo-circuithub-06.jpg', brand: 1, price: 2499, mrp: 3499, package: 'BOX', weightKg: 0.9,
    variants: [{ name: 'Red switches', price: 2499, mrp: 3499, qty: 20 }, { name: 'Brown switches', price: 2499, mrp: 3499, qty: 18 }, { name: 'Blue switches', price: 2399, mrp: 3499, qty: 0 }],
    ratings: [5, 5, 4, 4, 5, 4], description: 'Hot-swappable 75% layout with RGB backlight and a USB-C detachable cable.' },
  { title: 'Silent wireless mouse', category: 'electronics-laptops-and-computers', hsn: '8471', image: 'demo-circuithub-07.jpg', brand: 1, price: 649, mrp: 899, qty: 65, package: 'BOX', weightKg: 0.1,
    ratings: [4, 4], description: 'Quiet clicks, 2.4GHz + Bluetooth and up to 18 months on one AA battery.' },
  { title: 'USB-C 7-in-1 hub', category: 'electronics-laptops-and-computers', hsn: '8471', image: 'demo-circuithub-10.jpg', brand: 1, price: 1899, mrp: 2799, qty: 2, package: 'BOX', weightKg: 0.12,
    ratings: [3, 4], description: '4K HDMI, 100W pass-through charging, SD/microSD and three USB-A ports.' },
  { title: 'Laptop cooling pad', category: 'electronics-laptops-and-computers', hsn: '8471', image: 'demo-circuithub-06.jpg', brand: 1, price: 1199, mrp: 1599, qty: 0, package: 'BOX', weightKg: 0.8,
    description: 'Five quiet fans, adjustable height and two USB ports for laptops up to 17 inches.' },

  // Audio
  { title: 'Nova Buds Pro ANC earbuds', category: 'electronics-audio', hsn: '8517', image: 'demo-circuithub-03.jpg', brand: 2, price: 2999, mrp: 4999, package: 'BOX', weightKg: 0.1,
    variants: [{ name: 'Midnight black', price: 2999, mrp: 4999, qty: 35 }, { name: 'Pearl white', price: 2999, mrp: 4999, qty: 22 }],
    ratings: [5, 4, 5, 5, 4, 3, 5, 4], description: 'Active noise cancelling, 32-hour battery with the case and low-latency game mode.' },
  { title: 'Nova over-ear headphones', category: 'electronics-audio', hsn: '8517', image: 'demo-circuithub-03.jpg', brand: 2, price: 3499, mrp: 5499, qty: 18, package: 'BOX', weightKg: 0.3,
    ratings: [4, 5, 4], description: '40mm drivers, foldable design and 50 hours of wireless playback.' },
  { title: 'Nova Boom portable speaker', category: 'electronics-audio', hsn: '8517', image: 'demo-circuithub-04.jpg', brand: 2, price: 1799, mrp: 2499, package: 'BOX', weightKg: 0.6,
    variants: [{ name: 'Black', price: 1799, mrp: 2499, qty: 30 }, { name: 'Teal', price: 1799, mrp: 2499, qty: 5 }, { name: 'Red', price: 1899, mrp: 2499, qty: 12 }],
    ratings: [5, 4, 4, 5], description: 'IPX7 waterproof, 360° sound and pairs with a second speaker for stereo.' },
  { title: 'Nova soundbar 2.1', category: 'electronics-audio', hsn: '8517', image: 'demo-circuithub-04.jpg', brand: 2, price: 7999, mrp: 11999, qty: 7, package: 'FRAGILE', weightKg: 3.5, scope: 'SELLER_PINCODE_ONLY',
    description: '160W soundbar with a wireless subwoofer, HDMI ARC and Bluetooth 5.3.' },

  // TVs & appliances
  { title: 'VoltPro 43-inch 4K smart TV', category: 'electronics-tvs-and-appliances', hsn: '9999', image: 'demo-circuithub-09.jpg', brand: 1, price: 27999, mrp: 34999, package: 'FRAGILE', weightKg: 8, scope: 'SELLER_PINCODE_ONLY',
    variants: [{ name: '43-inch', price: 27999, mrp: 34999, qty: 6 }, { name: '50-inch', price: 33999, mrp: 41999, qty: 3 }, { name: '55-inch', price: 39999, mrp: 49999, qty: 2 }],
    ratings: [5, 4, 4], description: '4K HDR, built-in streaming apps, voice remote and three HDMI ports.' },
  { title: 'VoltPro 32-inch HD TV', category: 'electronics-tvs-and-appliances', hsn: '9999', image: 'demo-circuithub-09.jpg', brand: 1, price: 11999, mrp: 15999, qty: 10, package: 'FRAGILE', weightKg: 4.5, scope: 'SELLER_PINCODE_ONLY',
    status: 'INACTIVE', description: 'HD Ready smart TV — hidden while the new batch is being checked.' },
  { title: 'Streaming stick 4K', category: 'electronics-tvs-and-appliances', hsn: '9999', image: 'demo-circuithub-10.jpg', brand: 1, price: 2999, mrp: 3999, qty: 28, package: 'BOX', weightKg: 0.1,
    ratings: [4, 5], description: 'Turns any TV with HDMI into a smart TV, with Dolby Vision and a voice remote.' },

  // Accessories
  { title: 'Nova Fit smartwatch', category: 'electronics-accessories', hsn: '8517', image: 'demo-circuithub-05.jpg', brand: 0, price: 3499, mrp: 5999, package: 'BOX', weightKg: 0.15,
    variants: [{ name: 'Black strap', price: 3499, mrp: 5999, qty: 25 }, { name: 'Rose strap', price: 3499, mrp: 5999, qty: 14 }, { name: 'Steel strap', price: 3999, mrp: 6499, qty: 1 }],
    ratings: [4, 4, 5, 3, 4], description: 'AMOLED display, SpO2 and heart-rate tracking, Bluetooth calling and 7-day battery.' },
  { title: '65W GaN fast charger', category: 'electronics-accessories', hsn: '9999', image: 'demo-circuithub-10.jpg', brand: 0, price: 1499, mrp: 2199, qty: 55, package: 'BOX', weightKg: 0.12,
    ratings: [5, 5, 4], description: 'Charges a laptop, phone and earbuds together from two USB-C and one USB-A port.' },
  { title: 'Compact mirrorless camera', category: 'electronics-accessories', hsn: '9999', image: 'demo-circuithub-08.jpg', brand: 0, price: 38999, mrp: 44999, qty: 3, package: 'FRAGILE', weightKg: 0.7,
    ratings: [5], description: '24MP sensor, 4K video and a flip screen for vlogging, with a 15–45mm kit lens.' },
  { title: '10000mAh power bank', category: 'electronics-accessories', hsn: '9999', image: 'demo-circuithub-10.jpg', brand: 0, price: 999, mrp: 1499, qty: 0, package: 'BOX', weightKg: 0.22,
    status: 'INACTIVE', description: 'Slim 20W power bank — out of stock and hidden until the next shipment.' },
]

async function upload(file: string) {
  const form = new FormData()
  form.append('file', new Blob([readFileSync(join(DIR, file))], { type: 'image/jpeg' }), file)
  form.append('fileName', file.replace('demo-circuithub', 'seller-demo'))
  form.append('folder', `/${ROOT}/sellers/products`)
  form.append('useUniqueFileName', 'true')
  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', headers: { authorization: AUTH }, body: form })
  const body = await res.json() as { fileId?: string; url?: string; message?: string }
  if (!res.ok || !body.fileId || !body.url) throw new Error(`ImageKit upload failed for ${file}: ${body.message ?? res.status}`)
  return { fileId: body.fileId, url: body.url }
}

async function deleteFiles(fileIds: string[]) {
  for (let i = 0; i < fileIds.length; i += 50) {
    const res = await fetch('https://api.imagekit.io/v1/files/batch/deleteByFileIds', {
      method: 'POST', headers: { authorization: AUTH, 'content-type': 'application/json' }, body: JSON.stringify({ fileIds: fileIds.slice(i, i + 50) }),
    })
    if (!res.ok) console.warn(`  ! ImageKit delete failed (${res.status}) — remove these files manually if needed`)
  }
}

const views = (image: string) =>
  [image, ...['b', 'c', 'd'].map((v) => image.replace(/\.jpg$/, `-${v}.jpg`))].filter((f) => existsSync(join(DIR, f)))

async function findSeller(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { userType: true, sellerId: true, seller: { select: { id: true, name: true, status: true } } } })
  if (!user) throw new Error(`No account with email ${email}`)
  if (user.userType !== 'SELLER' || !user.seller) throw new Error(`${email} is not a seller account`)
  return { ...user.seller, userId: undefined }
}

async function add(email: string) {
  if (!PRIVATE_KEY) throw new Error('IMAGEKIT_PRIVATE_KEY is not set in .env')
  const seller = await findSeller(email)
  const owner = await prisma.user.findUnique({ where: { email }, select: { id: true } })

  // Seller must sell in Electronics for the products to be valid
  const electronics = await prisma.productCategory.findFirst({ where: { slug: 'electronics', parentId: null }, select: { id: true } })
  if (!electronics) throw new Error('Electronics category not found')
  await prisma.sellerCategory.upsert({
    where: { sellerId_categoryId: { sellerId: seller.id, categoryId: electronics.id } },
    create: { sellerId: seller.id, categoryId: electronics.id }, update: {},
  })

  const brands = []
  for (const name of BRANDS) {
    brands.push(await prisma.brand.upsert({ where: { sellerId_name: { sellerId: seller.id, name } }, create: { sellerId: seller.id, name }, update: {}, select: { id: true } }))
  }
  const taxes = new Map((await prisma.taxClass.findMany()).map((t) => [t.hsnCode, t.id]))
  const categories = new Map((await prisma.productCategory.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]))
  const reviewers = await prisma.user.findMany({ where: { email: { endsWith: '@demo-reviews.example.com' } }, orderBy: { email: 'asc' }, select: { id: true } })

  let created = 0
  for (const [i, p] of PRODUCTS.entries()) {
    const slug = slugify(p.title)
    if (await prisma.product.findFirst({ where: { sellerId: seller.id, slug }, select: { id: true } })) continue
    const categoryId = categories.get(p.category)
    const taxClassId = taxes.get(p.hsn) ?? taxes.get('9999')
    if (!categoryId || !taxClassId) { console.warn(`  - skipping ${p.title}: category/tax not found`); continue }

    const images = []
    for (const f of views(p.image)) images.push(await upload(f))
    const hasVariants = !!p.variants?.length
    const qty = p.qty ?? 0

    const product = await prisma.product.create({
      data: {
        sellerId: seller.id, categoryId, taxClassId, brandId: brands[p.brand]!.id,
        title: p.title, slug, description: p.description, specs: specsFor(p.title),
        status: p.status ?? 'ACTIVE',
        sellingPrice: hasVariants ? p.variants![0]!.price : p.price,
        compareAtPrice: hasVariants ? null : (p.mrp ?? null),
        sku: hasVariants ? null : `AP-${String(i + 1).padStart(3, '0')}`,
        inventoryQty: hasVariants ? 0 : qty,
        lowStockThreshold: 5,
        deliveryScope: p.scope ?? 'PAN_INDIA',
        packageType: p.package ?? 'STANDARD_BAG',
        weightKg: p.weightKg ?? null,
        createdAt: new Date(Date.now() - (i + 1) * 5 * 3_600_000),
        images: { create: images.map((im, n) => ({ fileId: im.fileId, url: im.url, isPrimary: n === 0, sortOrder: n })) },
        ...(hasVariants && {
          variants: {
            create: p.variants!.map((v, n) => ({ name: v.name, price: v.price, compareAtPrice: v.mrp ?? null, inventoryQty: v.qty, sku: `AP-${String(i + 1).padStart(3, '0')}-${n + 1}`, sortOrder: n })),
          },
        }),
      },
      select: { id: true, variants: { select: { id: true, inventoryQty: true } } },
    })

    // Stock history like a real "initial stock" entry
    const adjustments = hasVariants
      ? product.variants.map((v) => ({ productId: product.id, variantId: v.id, changeQty: v.inventoryQty, resultingQty: v.inventoryQty, reason: 'INITIAL_STOCK' as const, note: 'Demo stock', adjustedById: owner?.id }))
      : [{ productId: product.id, changeQty: qty, resultingQty: qty, reason: 'INITIAL_STOCK' as const, note: 'Demo stock', adjustedById: owner?.id }]
    await prisma.inventoryAdjustment.createMany({ data: adjustments })

    // Demo reviews (published) + rating summary
    const ratings = (p.ratings ?? []).slice(0, reviewers.length)
    if (ratings.length) {
      const TEXT: Record<number, [string, string]> = {
        5: ['Excellent', 'Works exactly as described and arrived well packed. Very happy with it.'],
        4: ['Good value', 'Does the job well for the price. A couple of small things could be better.'],
        3: ['Okay', 'Decent, but not as good as I expected from the photos.'],
        2: ['Not great', 'Had some issues in the first week. Support helped, but it took a while.'],
        1: ['Disappointed', 'Did not work properly for me.'],
      }
      await prisma.productReview.createMany({
        data: ratings.map((r, n) => ({
          productId: product.id, userId: reviewers[(i + n) % reviewers.length]!.id, rating: r,
          title: TEXT[r]![0], body: TEXT[r]![1],
          createdAt: new Date(Date.now() - (n + 1) * 2 * 86_400_000 - i * 3_600_000),
        })),
        skipDuplicates: true,
      })
      const agg = await prisma.productReview.aggregate({ where: { productId: product.id, status: 'PUBLISHED' }, _avg: { rating: true }, _count: true })
      await prisma.product.update({ where: { id: product.id }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } })
    }
    created++
    console.log(`  + ${p.title}${hasVariants ? ` (${p.variants!.length} variants)` : ''}${ratings.length ? ` · ${ratings.length} reviews` : ''}`)
  }
  // Products added before specifications existed get them now (only when they have none)
  let specced = 0
  for (const p of PRODUCTS) {
    const r = await prisma.product.updateMany({ where: { sellerId: seller.id, slug: slugify(p.title), specs: { equals: [] } }, data: { specs: specsFor(p.title) } })
    specced += r.count
  }
  if (specced) console.log(`  specifications added to ${specced} existing products`)
  console.log(`\n${seller.name}: added ${created} products (${PRODUCTS.length - created} already existed), brands: ${BRANDS.join(', ')}`)
  if (!reviewers.length) console.log('  (no demo reviewers found — run `npm run db:seed:demo` first to get reviews)')
}

async function remove(email: string) {
  const seller = await findSeller(email)
  const slugs = PRODUCTS.map((p) => slugify(p.title))
  const products = await prisma.product.findMany({ where: { sellerId: seller.id, slug: { in: slugs } }, select: { id: true, firstOrderedAt: true, images: { select: { fileId: true } } } })
  const ordered = products.filter((p) => p.firstOrderedAt)
  if (ordered.length) console.log(`  ! ${ordered.length} demo product(s) have orders and can’t be deleted — deactivating them instead`)
  const deletable = products.filter((p) => !p.firstOrderedAt)
  await prisma.product.updateMany({ where: { id: { in: ordered.map((p) => p.id) } }, data: { status: 'INACTIVE' } })
  await prisma.product.deleteMany({ where: { id: { in: deletable.map((p) => p.id) } } })
  await deleteFiles(deletable.flatMap((p) => p.images.map((i) => i.fileId)))
  const brands = await prisma.brand.deleteMany({ where: { sellerId: seller.id, name: { in: BRANDS }, products: { none: {} } } })
  console.log(`${seller.name}: removed ${deletable.length} demo products and ${brands.count} unused demo brands`)
}

async function main() {
  const email = process.argv.find((a) => a.startsWith('--email='))?.slice('--email='.length)
  if (!email) throw new Error('Pass the seller login email: --email=owner@example.com')
  if (process.argv.includes('--remove')) await remove(email)
  else await add(email)
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
