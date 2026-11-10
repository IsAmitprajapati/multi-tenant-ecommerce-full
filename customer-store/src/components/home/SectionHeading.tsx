import Link from 'next/link'

export default function SectionHeading({ title, subtitle, href, linkLabel = 'View all' }: { title: string; subtitle?: string | null; href?: string | null; linkLabel?: string }) {
  return (
    <div className='mb-3.5 flex items-end justify-between gap-4'>
      <div className='min-w-0'>
        <h2 className='text-lg font-bold'>{title}</h2>
        {subtitle && <p className='mt-0.5 text-[13px] text-n-600'>{subtitle}</p>}
      </div>
      {href && <Link href={href} className='link shrink-0 text-[13px]'>{linkLabel}</Link>}
    </div>
  )
}
