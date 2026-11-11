import { ChevronDown, Store } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ProductDetail } from '@/lib/types'

const PACKAGE: Record<string, string> = { STANDARD_BAG: 'Standard bag', BOX: 'Box', ENVELOPE: 'Envelope', FRAGILE: 'Fragile packaging', CUSTOM: 'Custom packaging' }
const SCOPE: Record<string, string> = { PAN_INDIA: 'All over India', SPECIFIC_PINCODES: 'Selected pincodes', SELLER_PINCODE_ONLY: 'Seller’s local area' }

function Section({ title, open, children, first }: { title: string; open?: boolean; first?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className={`group ${first ? '' : 'border-t border-n-200'}`}>
      <summary className='flex cursor-pointer list-none items-center justify-between py-3.5 text-[15px] font-bold [&::-webkit-details-marker]:hidden'>
        {title}
        <ChevronDown className='size-5 text-n-600 transition-transform group-open:rotate-180' />
      </summary>
      <div className='pb-3'>{children}</div>
    </details>
  )
}

/** Description + specifications accordion (native <details>, works without JS) */
export function ProductDetailsCard({ product }: { product: ProductDetail }) {
  const specs: [string, string][] = [
    ['Category', product.parentCategory ? `${product.parentCategory.name} › ${product.category.name}` : product.category.name],
    ...(product.brand ? [['Brand', product.brand] as [string, string]] : []),
    ['Sold by', product.seller.name],
    ...(product.specs.weightKg ? [['Weight', product.specs.weightKg < 1 ? `${Math.round(product.specs.weightKg * 1000)} g` : `${product.specs.weightKg} kg`] as [string, string]] : []),
    ['Packaging', PACKAGE[product.specs.packageType] ?? product.specs.packageType],
    ['Cold chain delivery', product.specs.requiresColdChain ? 'Yes — kept chilled' : 'Not needed'],
    ['Delivers to', SCOPE[product.delivery.scope] ?? '—'],
    ...(product.specs.sku ? [['SKU', product.specs.sku] as [string, string]] : []),
  ]
  return (
    <div className='card py-2 sm:py-2'>
      <Section title='Description' open first>
        <p className='text-sm leading-[22px] whitespace-pre-line text-n-600'>{product.description || 'The seller hasn’t added a description yet.'}</p>
      </Section>
      <Section title='Specifications'>
        <dl>
          {specs.map(([k, v]) => (
            <div key={k} className='flex gap-4 border-b border-n-200 py-2 text-[13px] last:border-0'>
              <dt className='w-40 shrink-0 text-n-600 sm:w-[200px]'>{k}</dt>
              <dd className='font-medium'>{v}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  )
}

export function SellerCard({ seller }: { seller: ProductDetail['seller'] }) {
  return (
    <div className='card flex items-center gap-4'>
      <span className='relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white' style={{ background: seller.brandColor }}>
        {seller.logoUrl ? <Image src={seller.logoUrl} alt='' fill sizes='48px' className='object-cover' /> : <Store className='size-5' />}
      </span>
      <div className='min-w-0 flex-1'>
        <Link href={`/seller/${seller.slug}`} className='block truncate text-sm font-bold hover:text-brand-700'>{seller.name}</Link>
        {seller.categories.length > 0 && <div className='mt-0.5 truncate text-xs text-n-600'>Sells {seller.categories.join(', ')}</div>}
      </div>
      <Link href={`/seller/${seller.slug}`} className='btn-outline shrink-0 px-4 py-2 text-[13px]'>Visit store</Link>
    </div>
  )
}
