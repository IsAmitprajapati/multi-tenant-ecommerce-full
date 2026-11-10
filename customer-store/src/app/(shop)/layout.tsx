import SiteHeader from '@/components/layout/SiteHeader'
import SiteFooter from '@/components/layout/SiteFooter'

export default function ShopLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <SiteHeader />
      <main className='flex-1'>{children}</main>
      <SiteFooter year={2026} />
    </>
  )
}
