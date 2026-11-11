/**
 * Demo storefront data: 4 demo sellers, ~40 products with images, 3 home banners and two extra home sections.
 *
 *   npm run db:seed:demo            add (skips anything already there)
 *   npm run db:seed:demo -- --remove  delete everything this script created (incl. its ImageKit files)
 *
 * Images in prisma/demo/images are uploaded to ImageKit (same folders as real uploads).
 * Demo sellers have unusable random passwords — nobody can sign in as them.
 * Never touches existing sellers, products or banners.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config()
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'demo')
const ROOT = (process.env.IMAGEKIT_ROOT_FOLDER ?? 'marketplace').replace(/^\/+|\/+$/g, '')
const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY ?? ''
const AUTH = `Basic ${Buffer.from(`${PRIVATE_KEY}:`).toString('base64')}`

const DEMO_SECTION_TITLES = ['Featured for you', 'Top picks in electronics', 'Collections']

interface DemoData {
  sellers: {
    slug: string; name: string; brandColor: string; category: string
    products: { title: string; emoji: string; category: string; price: number; mrp: number | null; hsn: string; image: string }[]
  }[]
  banners: { file: string; title: string; subtitle: string; ctaLabel: string; linkUrl: string }[]
}

const slugify = (v: string) => v.toLowerCase().replace(/&/g, 'and').replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function upload(file: string, folder: string) {
  const form = new FormData()
  form.append('file', new Blob([readFileSync(join(DIR, 'images', file))], { type: 'image/jpeg' }), file)
  form.append('fileName', file)
  form.append('folder', `/${ROOT}/${folder}`)
  form.append('useUniqueFileName', 'true')
  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', headers: { authorization: AUTH }, body: form })
  const body = await res.json() as { fileId?: string; url?: string; message?: string }
  if (!res.ok || !body.fileId || !body.url) throw new Error(`ImageKit upload failed for ${file}: ${body.message ?? res.status}`)
  return { fileId: body.fileId, url: body.url }
}

async function deleteFiles(fileIds: string[]) {
  for (let i = 0; i < fileIds.length; i += 50) {
    const chunk = fileIds.slice(i, i + 50)
    const res = await fetch('https://api.imagekit.io/v1/files/batch/deleteByFileIds', {
      method: 'POST', headers: { authorization: AUTH, 'content-type': 'application/json' }, body: JSON.stringify({ fileIds: chunk }),
    })
    if (!res.ok) console.warn(`  ! ImageKit delete failed (${res.status}) — remove these files manually if needed`)
  }
}

/** Extra gallery views generated next to the main image: demo-x-01-b.jpg, -c, -d */
const extraViews = (image: string) =>
  ['b', 'c', 'd'].map((v) => image.replace(/\.jpg$/, `-${v}.jpg`)).filter((f) => existsSync(join(DIR, 'images', f)))

/** Adds any missing gallery views to an existing demo product (safe to re-run) */
async function ensureGallery(productId: string, image: string) {
  const have = await prisma.productImage.findMany({ where: { productId }, select: { url: true } })
  let order = have.length
  let added = 0
  for (const file of extraViews(image)) {
    const stem = file.replace(/\.jpg$/, '')
    if (have.some((h) => h.url.includes(`/${stem}_`) || h.url.includes(`/${stem}.`))) continue
    const img = await upload(file, 'sellers/products')
    await prisma.productImage.create({ data: { productId, fileId: img.fileId, url: img.url, sortOrder: order++ } })
    added++
  }
  return added
}

/** Demo private-label brands per demo seller (assigned round-robin to products without a brand) */
const DEMO_BRANDS: Record<string, string[]> = {
  'demo-green-grocer': ['Green Grocer Farms', 'FreshFarm', 'NatureCo'],
  'demo-urban-threads': ['Urban Basics', 'Thread & Co'],
  'demo-circuithub': ['CircuitHub Pro', 'VoltEdge', 'SoundWave'],
  'demo-casa-home': ['Casa Living', 'HomeCraft'],
}

async function ensureBrands(sellerSlug: string) {
  const names = DEMO_BRANDS[sellerSlug]
  const seller = await prisma.seller.findUnique({ where: { slug: sellerSlug }, select: { id: true } })
  if (!names || !seller) return 0
  const brands = []
  for (const name of names) {
    brands.push(await prisma.brand.upsert({ where: { sellerId_name: { sellerId: seller.id, name } }, create: { sellerId: seller.id, name }, update: {}, select: { id: true } }))
  }
  const products = await prisma.product.findMany({ where: { sellerId: seller.id, brandId: null }, orderBy: { sku: 'asc' }, select: { id: true } })
  for (const [i, p] of products.entries()) {
    await prisma.product.update({ where: { id: p.id }, data: { brandId: brands[i % brands.length]!.id } })
  }
  return products.length
}

/** Demo shoppers who leave the demo reviews (unusable passwords, removed with --remove) */
const DEMO_REVIEWERS = ['Priya Sharma', 'Rahul Verma', 'Ananya Iyer', 'Vikram Singh', 'Neha Gupta', 'Arjun Nair', 'Kavya Reddy', 'Rohan Mehta', 'Sneha Kulkarni', 'Aditya Rao']
const REVIEWER_DOMAIN = 'demo-reviews.example.com'
const REVIEW_TEXT: Record<number, { title: string; body: string }[]> = {
  5: [
    { title: 'Excellent', body: 'Exactly as described and very good quality. Delivery was quick and the packaging was neat. Will order again.' },
    { title: 'Worth every rupee', body: 'Really happy with this. Fresh, well packed and arrived on time.' },
  ],
  4: [
    { title: 'Good buy', body: 'Good product for the price. Packaging could be a little better, but overall I am satisfied.' },
    { title: 'Pretty good', body: 'Matches the photos. Took a day longer than expected to arrive, otherwise no complaints.' },
  ],
  3: [{ title: 'Okay', body: 'Decent, nothing special. It does the job but I expected slightly better quality.' }],
  2: [{ title: 'Not great', body: 'Quality was below what I expected from the description. The seller was helpful when I asked about it though.' }],
}

/**
 * A demo shopper you can log in with on the storefront (credentials from .env:
 * DEMO_CUSTOMER_EMAIL / DEMO_CUSTOMER_PASSWORD). The password is reset to the .env value on each run.
 */
async function seedDemoShopper() {
  const email = process.env.DEMO_CUSTOMER_EMAIL?.trim().toLowerCase()
  const password = process.env.DEMO_CUSTOMER_PASSWORD
  if (!email || !password) { console.log('  - demo shopper skipped (set DEMO_CUSTOMER_EMAIL and DEMO_CUSTOMER_PASSWORD in .env)'); return }
  const passwordHash = await bcrypt.hash(password, 10)
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, userType: true } })
  if (existing && existing.userType !== 'CUSTOMER') { console.log(`  ! ${email} belongs to a non-shopper account — demo shopper skipped`); return }
  await prisma.user.upsert({
    where: { email },
    create: { email, fullName: 'Demo Shopper', phone: '+919876543210', passwordHash, userType: 'CUSTOMER' },
    update: { passwordHash, status: 'ACTIVE' },
  })
  console.log(`  ${existing ? '=' : '+'} demo shopper ${email} (password from .env)`)
}

async function seedDemoReviews() {
  const reviewers = []
  for (const [i, fullName] of DEMO_REVIEWERS.entries()) {
    const email = `reviewer-${i + 1}@${REVIEWER_DOMAIN}`
    reviewers.push(await prisma.user.upsert({
      where: { email },
      create: { email, fullName, passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 10), userType: 'CUSTOMER' },
      update: {},
      select: { id: true },
    }))
  }
  const products = await prisma.product.findMany({ where: { seller: { slug: { startsWith: 'demo-' } } }, orderBy: { sku: 'asc' }, select: { id: true } })
  let added = 0
  for (const [pi, p] of products.entries()) {
    const howMany = 2 + (pi % 7) // 2–8 reviews per product
    for (let k = 0; k < howMany; k++) {
      const reviewer = reviewers[(pi + k) % reviewers.length]!
      // Mostly 4–5 stars, the odd 3 or 2 (deterministic so re-runs match)
      const rating = [5, 4, 5, 4, 3, 5, 4, 2, 5, 4][(pi * 3 + k) % 10]!
      const text = REVIEW_TEXT[rating]![(pi + k) % REVIEW_TEXT[rating]!.length]!
      const exists = await prisma.productReview.findUnique({ where: { productId_userId: { productId: p.id, userId: reviewer.id } }, select: { id: true } })
      if (exists) continue
      await prisma.productReview.create({
        data: (() => {
          const at = new Date(Date.now() - (pi * 5 + k * 11 + 1) * 86_400_000)
          return { productId: p.id, userId: reviewer.id, rating, title: text.title, body: text.body, createdAt: at, updatedAt: at }
        })(),
      })
      added++
    }
    const agg = await prisma.productReview.aggregate({ where: { productId: p.id, status: 'PUBLISHED' }, _avg: { rating: true }, _count: { _all: true } })
    await prisma.product.update({ where: { id: p.id }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 100) / 100, ratingCount: agg._count._all } })
  }
  if (added) console.log(`  + ${added} demo reviews`)
  // Demo reviews were never edited: keep updated_at = created_at (rows seeded before this fix showed "edited")
  await prisma.$executeRaw`UPDATE product_reviews SET updated_at = created_at WHERE user_id IN (SELECT id FROM users WHERE email LIKE ${'%@' + REVIEWER_DOMAIN})`
}

/** Small deterministic "random" so re-runs look the same */
const stockFor = (i: number) => (i % 13 === 7 ? 0 : 15 + ((i * 37) % 90))

async function add(data: DemoData) {
  if (!PRIVATE_KEY) throw new Error('IMAGEKIT_PRIVATE_KEY is not set in .env')

  const role = await prisma.role.findFirst({ where: { name: 'Seller Admin', userType: 'SELLER', sellerId: null }, select: { id: true } })
  const taxes = new Map((await prisma.taxClass.findMany()).map((t) => [t.hsnCode, t.id]))
  const categories = new Map((await prisma.productCategory.findMany({ select: { id: true, slug: true, defaultCommissionRate: true } })).map((c) => [c.slug, c]))

  let index = 0
  for (const s of data.sellers) {
    const top = categories.get(s.category)
    if (!top) { console.warn(`  - skipping ${s.name}: category "${s.category}" not found`); continue }
    if (await prisma.seller.findUnique({ where: { slug: s.slug }, select: { id: true } })) {
      // Already seeded: just top up the photo galleries
      let added = 0
      for (const p of s.products) {
        const existing = await prisma.product.findFirst({ where: { seller: { slug: s.slug }, slug: slugify(p.title) }, select: { id: true } })
        if (existing) added += await ensureGallery(existing.id, p.image)
      }
      const branded = await ensureBrands(s.slug)
      console.log(`  = ${s.name} already exists${added ? ` — added ${added} gallery images` : ''}${branded ? ` — branded ${branded} products` : ''}`)
      index += s.products.length
      continue
    }

    const owner = await prisma.user.create({
      data: {
        email: `owner@${s.slug}.example.com`,
        fullName: `${s.name} (demo)`,
        passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
        userType: 'SELLER',
        roleId: role?.id,
      },
    })
    const seller = await prisma.seller.create({
      data: {
        name: s.name, slug: s.slug, brandColor: s.brandColor, status: 'ACTIVE', kycStatus: 'VERIFIED',
        commissionRate: top.defaultCommissionRate ?? 10, createdVia: 'ADMIN_INITIATED', ownerId: owner.id,
        categories: { create: [{ categoryId: top.id }] },
      },
    })
    await prisma.user.update({ where: { id: owner.id }, data: { sellerId: seller.id } })

    for (const p of s.products) {
      const i = index++
      const cat = categories.get(p.category)
      const taxClassId = taxes.get(p.hsn) ?? taxes.get('9999')
      if (!cat || !taxClassId) { console.warn(`  - skipping ${p.title}: category/tax not found`); continue }
      const img = await upload(p.image, 'sellers/products')
      const gallery = []
      for (const file of extraViews(p.image)) gallery.push(await upload(file, 'sellers/products'))
      const qty = stockFor(i)
      await prisma.product.create({
        data: {
          sellerId: seller.id, categoryId: cat.id, taxClassId,
          title: p.title, slug: slugify(p.title),
          description: `${p.title} from ${s.name}. Demo product for trying out the storefront.`,
          sellingPrice: p.price, compareAtPrice: p.mrp,
          sku: `DEMO-${String(i + 1).padStart(3, '0')}`,
          inventoryQty: qty,
          deliveryScope: 'PAN_INDIA',
          // Spread creation times so "Latest" has a stable order
          createdAt: new Date(Date.now() - i * 3_600_000),
          images: {
            create: [
              { fileId: img.fileId, url: img.url, isPrimary: true, sortOrder: 0 },
              ...gallery.map((g, n) => ({ fileId: g.fileId, url: g.url, sortOrder: n + 1 })),
            ],
          },
          adjustments: { create: [{ changeQty: qty, resultingQty: qty, reason: 'INITIAL_STOCK', note: 'Demo stock' }] },
        },
      })
    }
    await ensureBrands(s.slug)
    console.log(`  + ${s.name}: ${s.products.length} products`)
  }

  // Category tile images — only where the admin hasn't uploaded one
  for (const slug of ['grocery', 'fashion', 'electronics', 'home', 'beauty', 'other']) {
    const file = `demo-category-${slug}.jpg`
    if (!existsSync(join(DIR, 'images', file))) continue
    const cat = await prisma.productCategory.findFirst({ where: { slug, parentId: null }, select: { id: true, imageFileId: true } })
    if (!cat || cat.imageFileId) continue
    const img = await upload(file, 'catalog/categories')
    await prisma.productCategory.update({ where: { id: cat.id }, data: { imageFileId: img.fileId, imageUrl: img.url } })
    console.log(`  + category image: ${slug}`)
  }

  // Sub-category card images for the category page — only where the admin hasn't uploaded one
  const subs = await prisma.productCategory.findMany({ where: { parentId: { not: null }, imageFileId: null }, select: { id: true, slug: true } })
  let subImages = 0
  for (const sub of subs) {
    const file = `demo-subcategory-${sub.slug}.jpg`
    if (!existsSync(join(DIR, 'images', file))) continue
    const img = await upload(file, 'catalog/categories')
    await prisma.productCategory.update({ where: { id: sub.id }, data: { imageFileId: img.fileId, imageUrl: img.url } })
    subImages++
  }
  if (subImages) console.log(`  + ${subImages} sub-category images`)

  await seedDemoReviews()
  await seedDemoShopper()

  // Banners
  for (const b of data.banners) {
    if (await prisma.homeBanner.findFirst({ where: { title: b.title, imageUrl: { contains: '/demo-banner-' } } })) { console.log(`  = banner "${b.title}" exists`); continue }
    const img = await upload(b.file, 'storefront/banners')
    const last = await prisma.homeBanner.aggregate({ _max: { sortOrder: true } })
    await prisma.homeBanner.create({
      data: { title: b.title, subtitle: b.subtitle, ctaLabel: b.ctaLabel, linkUrl: b.linkUrl, imageFileId: img.fileId, imageUrl: img.url, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    })
    console.log(`  + banner "${b.title}"`)
  }

  // Extra home sections showing the hand-picked and category sources
  const last = await prisma.homeSection.aggregate({ _max: { sortOrder: true } })
  let order = (last._max.sortOrder ?? -1) + 1
  if (!(await prisma.homeSection.findFirst({ where: { title: DEMO_SECTION_TITLES[0] } }))) {
    const picks = await prisma.product.findMany({ where: { seller: { slug: { startsWith: 'demo-' } }, inventoryQty: { gt: 0 } }, orderBy: { sku: 'asc' }, select: { id: true } })
    const chosen = picks.filter((_, i) => i % 4 === 1).slice(0, 10)
    await prisma.homeSection.create({
      data: {
        type: 'PRODUCTS', source: 'MANUAL', title: DEMO_SECTION_TITLES[0], subtitle: 'Hand-picked from stores near you', sortOrder: order++,
        products: { create: chosen.map((p, i) => ({ productId: p.id, sortOrder: i })) },
      },
    })
    console.log(`  + section "${DEMO_SECTION_TITLES[0]}"`)
  }
  const electronics = categories.get('electronics')
  if (electronics && !(await prisma.homeSection.findFirst({ where: { title: DEMO_SECTION_TITLES[1] } }))) {
    await prisma.homeSection.create({ data: { type: 'PRODUCTS', source: 'CATEGORY', categoryId: electronics.id, title: DEMO_SECTION_TITLES[1], sortOrder: order++ } })
    console.log(`  + section "${DEMO_SECTION_TITLES[1]}"`)
  }
  // The three collection tiles from the design, at the end of the page
  if (!(await prisma.homeSection.findFirst({ where: { title: DEMO_SECTION_TITLES[2] } }))) {
    await prisma.homeSection.create({
      data: {
        type: 'PROMO_CARDS', title: DEMO_SECTION_TITLES[2], sortOrder: order++,
        cards: [
          { tag: 'New', title: 'Organic essentials', linkUrl: '/category/grocery', theme: 'DARK' },
          { tag: 'Trending', title: 'Monsoon snack box', linkUrl: '/category/grocery-snacks', theme: 'SAND' },
          { tag: 'Limited', title: 'Festive gift hampers', linkUrl: '/products?sort=deals', theme: 'MINT' },
        ],
      },
    })
    console.log(`  + section "${DEMO_SECTION_TITLES[2]}"`)
  }
}

async function remove() {
  const sellers = await prisma.seller.findMany({ where: { slug: { startsWith: 'demo-' }, owner: { email: { endsWith: '.example.com' } } }, select: { id: true, name: true, ownerId: true } })
  const sellerIds = sellers.map((s) => s.id)
  const images = await prisma.productImage.findMany({ where: { product: { sellerId: { in: sellerIds } } }, select: { fileId: true } })
  const banners = await prisma.homeBanner.findMany({ where: { imageUrl: { contains: '/demo-banner-' } }, select: { id: true, imageFileId: true } })

  const catImages = await prisma.productCategory.findMany({
    where: { OR: [{ imageUrl: { contains: '/demo-category-' } }, { imageUrl: { contains: '/demo-subcategory-' } }] },
    select: { id: true, imageFileId: true },
  })

  if (PRIVATE_KEY) await deleteFiles([...images.map((i) => i.fileId), ...banners.map((b) => b.imageFileId), ...catImages.flatMap((c) => (c.imageFileId ? [c.imageFileId] : []))])
  await prisma.productCategory.updateMany({ where: { id: { in: catImages.map((c) => c.id) } }, data: { imageFileId: null, imageUrl: null } })
  await prisma.homeBanner.deleteMany({ where: { id: { in: banners.map((b) => b.id) } } })
  // Demo sections, unless an admin has since added non-demo picks to them
  for (const s of await prisma.homeSection.findMany({ where: { title: { in: DEMO_SECTION_TITLES } }, include: { products: { include: { product: { select: { sellerId: true } } } } } })) {
    if (s.products.every((p) => sellerIds.includes(p.product.sellerId))) await prisma.homeSection.delete({ where: { id: s.id } })
  }
  await prisma.product.deleteMany({ where: { sellerId: { in: sellerIds } } })
  await prisma.brand.deleteMany({ where: { sellerId: { in: sellerIds } } })
  await prisma.sellerCategory.deleteMany({ where: { sellerId: { in: sellerIds } } })
  await prisma.user.updateMany({ where: { sellerId: { in: sellerIds } }, data: { sellerId: null } })
  await prisma.seller.deleteMany({ where: { id: { in: sellerIds } } })
  await prisma.user.deleteMany({ where: { id: { in: sellers.map((s) => s.ownerId) }, email: { endsWith: '.example.com' } } })
  const shopperEmail = process.env.DEMO_CUSTOMER_EMAIL?.trim().toLowerCase()
  if (shopperEmail) await prisma.user.deleteMany({ where: { email: shopperEmail, userType: 'CUSTOMER' } })
  // Demo reviewers (their reviews go with them)
  const reviewers = await prisma.user.deleteMany({ where: { email: { endsWith: `@${REVIEWER_DOMAIN}` }, userType: 'CUSTOMER' } })
  if (reviewers.count) console.log(`  - removed ${reviewers.count} demo reviewers and their reviews`)
  console.log(`  - removed ${sellers.length} demo sellers, ${images.length} products, ${banners.length} banners`)
}

async function main() {
  const data = JSON.parse(readFileSync(join(DIR, 'demo-data.json'), 'utf8')) as DemoData
  if (process.argv.includes('--remove')) await remove()
  else await add(data)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
