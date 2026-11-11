import { Suspense } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BadgePercent, CalendarDays, Package, Star, Store } from 'lucide-react'
import SellerProducts from '@/components/seller/SellerProducts'
import ListingSkeleton from '@/components/home/ListingSkeleton'
import { getSellerStore } from '@/lib/public-api'

export async function generateMetadata({ params }: PageProps<'/seller/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const store = await getSellerStore(slug)
  if (!store) return { title: 'Store not found' }
  const sells = store.seller.categories.map((c) => c.name).join(', ')
  return { title: store.seller.name, description: `Shop ${store.stats.products} products from ${store.seller.name}${sells ? ` — ${sells}` : ''}.` }
}

/** Darker shade of the store colour for the banner gradient */
function shade(hex: string, f: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#10543A'
  const n = parseInt(m[1]!, 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0')
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`
}

async function SellerStorePage({ params }: PageProps<'/seller/[slug]'>) {
  const { slug } = await params
  const store = await getSellerStore(slug)
  if (!store) notFound()
  const { seller, stats } = store
  const since = new Date(seller.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

  return (
    <>
      <nav className='text-xs text-n-600' aria-label='Breadcrumb'>
        <Link href='/' className='hover:text-brand-600'>Home</Link> / <span>Stores</span> / <span className='font-semibold text-n-900'>{seller.name}</span>
      </nav>

      {/* Store header */}
      <header className='mt-4 overflow-hidden rounded-[20px] border border-n-200 bg-white'>
        <div className='relative h-24 sm:h-32' style={{ background: `linear-gradient(120deg, ${shade(seller.brandColor, 0.55)}, ${seller.brandColor})` }}>
          <div className='absolute -top-16 right-10 size-56 rounded-full bg-white/10' />
          <div className='absolute -bottom-20 right-48 size-40 rounded-full bg-white/10' />
        </div>
        <div className='flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:gap-5 sm:px-7 sm:pb-6'>
          <span className='relative -mt-10 flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white text-white shadow-sm sm:-mt-12 sm:size-24'
            style={{ background: seller.brandColor }}>
            {seller.logoUrl ? <Image src={seller.logoUrl} alt={`${seller.name} logo`} fill sizes='96px' className='bg-white object-cover' /> : <Store className='size-9' />}
          </span>
          <div className='min-w-0 flex-1'>
            <h1 className='text-2xl font-bold'>{seller.name}</h1>
            {seller.categories.length > 0 && (
              <p className='mt-1 text-[13px] text-n-600'>
                Sells{' '}
                {seller.categories.map((c, i) => (
                  <span key={c.slug}>{i > 0 && ', '}<Link href={`/category/${c.slug}`} className='font-semibold text-brand-700 hover:text-brand-500'>{c.name}</Link></span>
                ))}
              </p>
            )}
            <ul className='mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-n-600'>
              <li className='flex items-center gap-1.5'><Package className='size-4 text-brand-600' /> <b className='text-n-900'>{stats.products}</b> {stats.products === 1 ? 'product' : 'products'}</li>
              <li className='flex items-center gap-1.5'>
                <Star className='size-4 text-warning' fill='currentColor' strokeWidth={0} />
                {stats.rating.count > 0
                  ? <><b className='text-n-900'>{stats.rating.average.toFixed(1)}</b> from {stats.rating.count.toLocaleString('en-IN')} {stats.rating.count === 1 ? 'rating' : 'ratings'}</>
                  : 'No ratings yet'}
              </li>
              {stats.dealsCount > 0 && <li className='flex items-center gap-1.5'><BadgePercent className='size-4 text-brand-600' /> <b className='text-n-900'>{stats.dealsCount}</b> on offer</li>}
              <li className='flex items-center gap-1.5'><CalendarDays className='size-4 text-brand-600' /> Selling since {since}</li>
            </ul>
          </div>
        </div>
      </header>

      <SellerProducts store={store} />
    </>
  )
}

function StoreSkeleton() {
  return (
    <div aria-busy='true' aria-label='Loading store'>
      <div className='h-3 w-48 animate-pulse rounded bg-n-200' />
      <div className='mt-4 h-[210px] animate-pulse rounded-[20px] bg-n-200' />
      <div className='mt-7 h-6 w-48 animate-pulse rounded bg-n-200' />
      <div className='mt-5'><ListingSkeleton /></div>
    </div>
  )
}

export default function SellerPage(props: PageProps<'/seller/[slug]'>) {
  return (
    <div className='mx-auto max-w-[1440px] px-4 pt-5 pb-12 sm:px-8 lg:px-10 lg:pt-7'>
      <Suspense fallback={<StoreSkeleton />}>
        <SellerStorePage {...props} />
      </Suspense>
    </div>
  )
}
