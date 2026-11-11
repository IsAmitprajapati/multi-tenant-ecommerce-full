import Link from 'next/link'

/** Full-width page outside the account menu (same frame as the wishlist page) */
export default function StandalonePage({ title, description, crumb, children }: {
  title: string
  description?: string
  crumb: string
  children: React.ReactNode
}) {
  return (
    <div className='mx-auto w-full max-w-[1440px] px-4 pt-5 pb-12 sm:px-8 lg:px-10 lg:pt-7'>
      <nav className='text-xs text-n-600' aria-label='Breadcrumb'>
        <Link href='/' className='hover:text-brand-600'>Home</Link> / <span className='font-semibold text-n-900'>{crumb}</span>
      </nav>
      <h1 className='mt-2 text-[22px] font-bold'>{title}</h1>
      {description && <p className='mt-0.5 text-[13px] text-n-600'>{description}</p>}
      <div className='mt-5 flex flex-col gap-4'>{children}</div>
    </div>
  )
}
