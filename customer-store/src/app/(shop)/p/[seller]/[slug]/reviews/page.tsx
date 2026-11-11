import { Suspense } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ImageOff } from 'lucide-react'
import ReviewsSection from '@/components/reviews/ReviewsSection'
import { inr } from '@/lib/format'
import { getProduct, getReviews } from '@/lib/public-api'

export async function generateMetadata({ params }: PageProps<'/p/[seller]/[slug]/reviews'>): Promise<Metadata> {
  const { seller, slug } = await params
  const p = await getProduct(seller, slug)
  return { title: p ? `Reviews of ${p.title}` : 'Reviews' }
}

/** Every review of a product ("View all" from the product page) */
async function AllReviews({ params, searchParams }: PageProps<'/p/[seller]/[slug]/reviews'>) {
  const [{ seller, slug }, sp] = await Promise.all([params, searchParams])
  const stars = typeof sp.rating === 'string' && /^[1-5]$/.test(sp.rating) ? Number(sp.rating) : null
  const [product, reviews] = await Promise.all([getProduct(seller, slug), getReviews(seller, slug, { pageSize: 10, rating: stars ?? undefined })])
  if (!product || !reviews) notFound()
  const productHref = `/p/${seller}/${slug}`

  return (
    <>
      <Link href={productHref} className='inline-flex items-center gap-1.5 text-[13px] font-semibold text-n-600 hover:text-brand-600'>
        <ArrowLeft className='size-4' /> Back to product
      </Link>
      <Link href={productHref} className='card mt-4 flex items-center gap-4 py-4 hover:border-brand-600 sm:py-4'>
        <span className='relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-n-100'>
          {product.images[0] ? <Image src={product.images[0].url} alt='' fill sizes='64px' className='object-cover' /> : <ImageOff className='size-5 text-n-400' />}
        </span>
        <span className='min-w-0'>
          <span className='block text-[11px] font-semibold text-brand-600 uppercase'>{product.seller.name}</span>
          <span className='block truncate text-[15px] font-bold'>{product.title}</span>
          <span className='block text-[13px] font-semibold'>{inr(product.variants[0]?.price ?? product.price)}</span>
        </span>
      </Link>
      <div className='mt-5'>
        <ReviewsSection productId={product.id} sellerSlug={seller} slug={slug} initial={reviews} mode='full' initialStars={stars} />
      </div>
    </>
  )
}

export default function AllReviewsPage(props: PageProps<'/p/[seller]/[slug]/reviews'>) {
  return (
    <div className='mx-auto max-w-[860px] px-4 pt-5 pb-12 sm:px-8 lg:pt-7'>
      <Suspense fallback={<div className='h-96 animate-pulse rounded-card bg-n-100' aria-busy='true' aria-label='Loading reviews' />}>
        <AllReviews {...props} />
      </Suspense>
    </div>
  )
}
