import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductGallery from '@/components/product/ProductGallery'
import BuyBox from '@/components/product/BuyBox'
import { ProductDetailsCard, SellerCard } from '@/components/product/ProductInfo'
import { ProductGrid } from '@/components/home/ProductRail'
import { getProduct, getReviews } from '@/lib/public-api'
import ReviewsSection from '@/components/reviews/ReviewsSection'

export async function generateMetadata({ params }: PageProps<'/p/[seller]/[slug]'>): Promise<Metadata> {
  const { seller, slug } = await params
  const p = await getProduct(seller, slug)
  if (!p) return { title: 'Product not found' }
  return {
    title: p.seo.title || p.title,
    description: p.seo.description || p.description?.slice(0, 160) || `${p.title} from ${p.seller.name}`,
    openGraph: { images: p.images[0] ? [p.images[0].url] : [] },
  }
}

async function Product({ params }: PageProps<'/p/[seller]/[slug]'>) {
  const { seller, slug } = await params
  const [product, reviews] = await Promise.all([getProduct(seller, slug), getReviews(seller, slug, { pageSize: 5 })])
  if (!product) notFound()
  const emptyReviews = { productId: product.id, summary: { average: 0, count: 0, distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })) }, items: [], page: 1, pageSize: 5, total: 0, hasMore: false }

  return (
    <>
      <nav className='text-xs text-n-600' aria-label='Breadcrumb'>
        <Link href='/' className='hover:text-brand-600'>Home</Link>
        {product.parentCategory && <> / <Link href={`/category/${product.parentCategory.slug}`} className='hover:text-brand-600'>{product.parentCategory.name}</Link></>}
        {' '}/ <Link href={`/category/${product.category.slug}`} className='hover:text-brand-600'>{product.category.name}</Link>
      </nav>

      {/* Phones: photos → buy box → details. Desktop: buy box sticks in the right column. */}
      <div className='mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-10 lg:gap-y-0'>
        <div className='min-w-0 lg:col-start-1'><ProductGallery images={product.images} title={product.title} /></div>
        <div className='lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-stretch'><BuyBox product={product} /></div>
        <div className='min-w-0 lg:col-start-1 lg:mt-8'><ProductDetailsCard product={product} /></div>
        <div className='min-w-0 lg:col-start-1 lg:mt-5'>
          <ReviewsSection productId={product.id} sellerSlug={seller} slug={slug} initial={reviews ?? emptyReviews} />
        </div>
        <div className='min-w-0 lg:col-start-1 lg:mt-5'><SellerCard seller={product.seller} /></div>
      </div>

      {product.related.length > 0 && (
        <section className='mt-10' aria-label='You may also like'>
          <h2 className='mb-3.5 text-base font-bold'>You may also like</h2>
          <ProductGrid products={product.related} />
        </section>
      )}
    </>
  )
}

function ProductSkeleton() {
  const bar = 'animate-pulse rounded bg-n-200'
  return (
    <div aria-busy='true' aria-label='Loading product'>
      <div className={`h-3 w-48 ${bar}`} />
      <div className='mt-4 grid items-start gap-6 lg:grid-cols-[1fr_400px] lg:gap-10'>
        <div>
          <div className='aspect-[4/3] animate-pulse rounded-2xl bg-n-200 sm:aspect-[16/11]' />
          <div className='mt-3 flex gap-2.5'>{Array.from({ length: 4 }).map((_, i) => <div key={i} className='size-16 animate-pulse rounded-lg bg-n-200' />)}</div>
          <div className='card mt-8 grid gap-3'><div className={`h-4 w-28 ${bar}`} /><div className={`h-3 w-full ${bar}`} /><div className={`h-3 w-4/5 ${bar}`} /></div>
        </div>
        <div className='card grid gap-3'>
          <div className={`h-2.5 w-32 ${bar}`} /><div className={`h-6 w-4/5 ${bar}`} /><div className={`h-7 w-36 ${bar}`} />
          <div className='mt-3 flex gap-2'>{Array.from({ length: 3 }).map((_, i) => <div key={i} className='h-8 w-16 animate-pulse rounded-lg bg-n-200' />)}</div>
          <div className='mt-3 flex gap-2.5'><div className='h-11 flex-1 animate-pulse rounded-lg bg-n-200' /><div className='h-11 flex-1 animate-pulse rounded-lg bg-n-200' /></div>
        </div>
      </div>
    </div>
  )
}

export default function ProductPage(props: PageProps<'/p/[seller]/[slug]'>) {
  return (
    <div className='mx-auto max-w-[1440px] px-4 pt-5 pb-12 sm:px-8 lg:px-10 lg:pt-7'>
      <Suspense fallback={<ProductSkeleton />}>
        <Product {...props} />
      </Suspense>
    </div>
  )
}
