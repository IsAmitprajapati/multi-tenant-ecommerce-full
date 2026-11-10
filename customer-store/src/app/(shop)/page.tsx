import CategoryGrid from '@/components/home/CategoryGrid'
import HeroBanners from '@/components/home/HeroBanners'
import ProductRail from '@/components/home/ProductRail'
import PromoCards from '@/components/home/PromoCards'
import SectionHeading from '@/components/home/SectionHeading'
import { getHome } from '@/lib/public-api'

/** Customer home page — banners and sections come from Platform admin › Storefront › Home page */
export default async function HomePage() {
  const home = await getHome()
  const empty = home.banners.items.length === 0 && home.sections.length === 0

  return (
    <div className='mx-auto max-w-[1440px] px-4 pt-5 pb-12 sm:px-8 lg:px-10 lg:pt-7'>
      <HeroBanners banners={home.banners} />

      {empty && (
        <div className='card mt-2 text-center'>
          <h1 className='text-xl font-bold'>The store is getting ready</h1>
          <p className='mt-1.5 text-sm text-n-600'>New products and offers are on their way — check back soon.</p>
        </div>
      )}

      {home.sections.map((s, i) => (
        <section key={s.id} className={i === 0 && home.banners.items.length === 0 ? '' : 'mt-9'} aria-label={s.title}>
          {s.type === 'PROMO_CARDS' ? (
            // Tiles stand on their own, like the design (no heading)
            <PromoCards cards={s.cards} />
          ) : (
            <>
              {/* Every category is shown right here, so no "View all" link for categories */}
              <SectionHeading title={s.title} subtitle={s.subtitle} href={s.type === 'PRODUCTS' ? s.viewAllHref : null} linkLabel='See all' />
              {s.type === 'SHOP_BY_CATEGORY'
                ? <CategoryGrid categories={s.categories} />
                : <ProductRail products={s.products} />}
            </>
          )}
        </section>
      ))}
    </div>
  )
}
